import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DelayedError, type Job } from 'bullmq';
import type { WorkflowEdge, WorkflowNode } from '@repo/contracts/workflow';
import { Repository } from 'typeorm';
import { AssistantService } from '../../assistant/services/assistant.service';
import { Run } from '../../agent/entities/run.entity';
import { AGENT_POLL_DELAY, EXECUTE_JOB } from '../constants';
import { Event } from '../entities/event.entity';
import { Instance } from '../entities/instance.entity';
import { NodeExecution } from '../entities/node-execution.entity';
import { GoalValidatorService } from './goal-validator.service';

interface RuntimeJobData {
  instanceId: string;
}

@Injectable()
export class RuntimeService {
  constructor(
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>,
    private readonly assistant: AssistantService,
    private readonly goalValidator: GoalValidatorService,
  ) {}

  async execute(job: Job<RuntimeJobData>, token?: string): Promise<void> {
    if (job.name !== EXECUTE_JOB)
      throw new Error(`Unsupported workflow job: ${job.name}`);
    let instance = await this.load(job.data.instanceId);
    if (!instance || this.isTerminal(instance.status)) return;

    if (instance.status === 'queued') {
      await this.update(
        instance.id,
        {
          status: 'running',
          startedAt: instance.startedAt ?? new Date(),
          queueJobId: null,
        },
        'workflow.started',
      );
    }

    for (
      let iteration = 0;
      iteration <= instance.definition.graph.nodes.length;
      iteration += 1
    ) {
      instance = await this.load(job.data.instanceId);
      if (!instance || this.isTerminal(instance.status)) return;
      const node = instance.definition.graph.nodes.find(
        (candidate) => candidate.id === instance.currentNodeId,
      );
      if (!node)
        return this.fail(instance, 'Current workflow node does not exist');

      if (node.type === 'end') {
        await this.completeNode(instance, node, undefined);
        if (instance.definition.goal) {
          const validation = await this.goalValidator.validate(
            instance.definition.goal,
            instance.input,
            instance.output,
          );
          if (!validation.satisfied) {
            await this.update(
              instance.id,
              {
                status: 'failed',
                error: `Workflow goal was not satisfied: ${validation.reason}`,
                goalValidation: validation,
                completedAt: new Date(),
              },
              'workflow.goal_not_satisfied',
              node.id,
              validation,
            );
            return;
          }
          await this.update(
            instance.id,
            { goalValidation: validation },
            'workflow.goal_validated',
            node.id,
            validation,
          );
        }
        await this.update(
          instance.id,
          {
            status: 'completed',
            completedAt: new Date(),
          },
          'workflow.completed',
          node.id,
        );
        return;
      }

      if (node.type === 'condition') {
        const outcome = this.evaluate(node, instance);
        await this.completeNode(instance, node, outcome);
        await this.advance(instance, node.id, outcome ? 'true' : 'false');
        continue;
      }

      const execution = await this.findOrCreateExecution(instance, node);
      if (!execution.runId) {
        const task = this.taskInput(instance);
        const response = await this.assistant.createRun(
          instance.userId,
          {
            capability: node.capability,
            context:
              node.contextSource === 'task' && task?.context
                ? task.context
                : node.context,
            input: this.nodeInput(node, task?.input, instance.output),
            options: node.options,
            browserSessionId: node.browserSessionId,
            browserExecutionTarget: node.browserExecutionTarget,
            executionLane: node.executionLane ?? 'long',
          },
          `workflow:${instance.id}:${node.id}`,
        );
        await this.instanceRepository.manager.update(
          NodeExecution,
          execution.id,
          {
            runId: response.data.id,
            status: 'running',
            startedAt: new Date(),
          },
        );
        await this.appendEvent(instance.id, 'node.started', node.id, {
          runId: response.data.id,
        });
        await this.delay(job, token);
      }

      const run = await this.instanceRepository.manager.findOne(Run, {
        where: { id: execution.runId },
      });
      if (
        !run ||
        ['queued', 'running', 'awaiting_approval', 'suspended'].includes(
          run.status,
        )
      ) {
        await this.delay(job, token);
      }
      if (run.status === 'completed') {
        await this.completeNode(instance, node, run.result);
        await this.advance(instance, node.id);
        continue;
      }
      return this.fail(instance, run.error ?? `Agent run ${run.status}`);
    }
    await this.fail(instance, 'Workflow exceeded its acyclic execution bound');
  }

  async recordTerminalFailure(
    instanceId: string,
    error: string,
  ): Promise<void> {
    const instance = await this.load(instanceId);
    if (instance && !this.isTerminal(instance.status)) {
      await this.fail(instance, error);
    }
  }

  private async load(id: string) {
    return this.instanceRepository.findOne({
      where: { id },
      relations: { definition: true },
    });
  }

  private async findOrCreateExecution(instance: Instance, node: WorkflowNode) {
    const repository =
      this.instanceRepository.manager.getRepository(NodeExecution);
    const existing = await repository.findOne({
      where: { instanceId: instance.id, nodeId: node.id },
    });
    return (
      existing ??
      repository.save(
        repository.create({
          instanceId: instance.id,
          nodeId: node.id,
          nodeType: node.type,
          status: 'pending',
        }),
      )
    );
  }

  private async completeNode(
    instance: Instance,
    node: WorkflowNode,
    output: unknown,
  ) {
    const execution = await this.findOrCreateExecution(instance, node);
    await this.instanceRepository.manager.update(NodeExecution, execution.id, {
      status: 'completed',
      output,
      completedAt: new Date(),
    });
    await this.appendEvent(instance.id, 'node.completed', node.id, { output });
    if (output !== undefined) {
      await this.instanceRepository.update(instance.id, {
        output: { ...instance.output, [node.id]: output },
      });
    }
  }

  private async advance(
    instance: Instance,
    nodeId: string,
    outcome?: 'true' | 'false',
  ) {
    const edge = instance.definition.graph.edges.find(
      (candidate: WorkflowEdge) =>
        candidate.from === nodeId && candidate.outcome === outcome,
    );
    if (!edge)
      return this.fail(
        instance,
        `No route exists from workflow node ${nodeId}`,
      );
    await this.instanceRepository.update(instance.id, {
      currentNodeId: edge.to,
    });
  }

  private evaluate(
    node: Extract<WorkflowNode, { type: 'condition' }>,
    instance: Instance,
  ) {
    const source = { input: instance.input, output: instance.output } as Record<
      string,
      unknown
    >;
    const value = node.inputKey
      .split('.')
      .reduce<unknown>(
        (current, part) =>
          current && typeof current === 'object'
            ? (current as Record<string, unknown>)[part]
            : undefined,
        source,
      );
    return node.operator === 'exists'
      ? value !== undefined
      : value === node.value;
  }

  private taskInput(instance: Instance) {
    const task = instance.input.task;
    if (!task || typeof task !== 'object') return undefined;
    return task as {
      context?: Run['context'];
      input?: string;
    };
  }

  private nodeInput(
    node: Extract<WorkflowNode, { type: 'agent' }>,
    taskInput?: string,
    workflowOutput?: Record<string, unknown>,
  ) {
    const input =
      node.inputSource === 'task' && taskInput ? taskInput : node.input;
    const previousOutput =
      workflowOutput && Object.keys(workflowOutput).length
        ? JSON.stringify(workflowOutput).slice(0, 20_000)
        : undefined;
    return (
      [
        node.instruction,
        input,
        previousOutput
          ? `<previous_workflow_output>${previousOutput}</previous_workflow_output>`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n\n') || undefined
    );
  }

  private async fail(instance: Instance, error: string) {
    await this.instanceRepository.manager.update(
      NodeExecution,
      { instanceId: instance.id, nodeId: instance.currentNodeId },
      { status: 'failed', error, completedAt: new Date() },
    );
    await this.update(
      instance.id,
      {
        status: 'failed',
        error,
        completedAt: new Date(),
      },
      'workflow.failed',
      instance.currentNodeId,
      { error },
    );
  }

  private async update(
    instanceId: string,
    patch: Partial<Instance>,
    eventType: string,
    nodeId?: string,
    data?: unknown,
  ) {
    await this.instanceRepository.update(instanceId, patch);
    await this.appendEvent(instanceId, eventType, nodeId, data);
  }

  private async appendEvent(
    instanceId: string,
    type: string,
    nodeId?: string,
    data?: unknown,
  ) {
    await this.instanceRepository.manager.transaction(async (manager) => {
      const instance = await manager.findOne(Instance, {
        where: { id: instanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance) return;
      const sequence = instance.eventSequence + 1;
      await manager.update(Instance, instanceId, { eventSequence: sequence });
      await manager.save(
        Event,
        manager.create(Event, {
          instanceId,
          sequence,
          type,
          nodeId,
          data,
        }),
      );
    });
  }

  private async delay(
    job: Job<RuntimeJobData>,
    token?: string,
  ): Promise<never> {
    await job.moveToDelayed(Date.now() + AGENT_POLL_DELAY, token);
    throw new DelayedError();
  }

  private isTerminal(status: string) {
    return ['completed', 'failed', 'cancelled'].includes(status);
  }
}

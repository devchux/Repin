import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { CreateDefinitionDto } from '../dto/create-definition.dto';
import { StartDto } from '../dto/start.dto';
import { Definition } from '../entities/definition.entity';
import { Event } from '../entities/event.entity';
import { Instance } from '../entities/instance.entity';
import { NodeExecution } from '../entities/node-execution.entity';
import { EXECUTE_JOB, QUEUE } from '../constants';
import { DefinitionValidator } from './definition-validator.service';
import { AssistantService } from '../../assistant/services/assistant.service';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Definition)
    private readonly definitionRepository: Repository<Definition>,
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>,
    @InjectQueue(QUEUE) private readonly queue: Queue,
    private readonly validator: DefinitionValidator,
    private readonly assistant: AssistantService,
  ) {}

  async createDefinition(
    userId: number,
    request: CreateDefinitionDto,
    source: Definition['source'] = 'manual',
  ) {
    this.validator.validate(request.graph);
    this.validator.validateGoal(request.goal);
    const definition = await this.definitionRepository.manager.transaction(
      async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
        const latest = await manager.findOne(Definition, {
          where: { userId, key: request.key },
          order: { version: 'DESC' },
        });
        return manager.save(
          Definition,
          manager.create(Definition, {
            userId,
            key: request.key,
            name: request.name,
            description: request.description,
            activation: request.activation,
            goal: request.goal,
            source,
            version: (latest?.version ?? 0) + 1,
            graph: request.graph,
          }),
        );
      },
    );
    return {
      message: 'Workflow definition created successfully',
      data: definition,
    };
  }

  createGeneratedDefinition(userId: number, request: CreateDefinitionDto) {
    return this.createDefinition(userId, request, 'generated');
  }

  async start(userId: number, definitionId: string, request: StartDto) {
    const definition = await this.definitionRepository.findOne({
      where: { id: definitionId, userId },
    });
    if (!definition)
      throw new NotFoundException('Workflow definition not found');

    const instance = await this.instanceRepository.manager.transaction(
      async (manager) => {
        const saved = await manager.save(
          Instance,
          manager.create(Instance, {
            userId,
            definitionId,
            status: 'queued',
            currentNodeId: definition.graph.startNodeId,
            input: request.input ?? {},
            output: {},
            eventSequence: 1,
          }),
        );
        await manager.save(
          Event,
          manager.create(Event, {
            instanceId: saved.id,
            sequence: 1,
            type: 'workflow.queued',
          }),
        );
        return saved;
      },
    );

    try {
      const job = await this.queue.add(
        EXECUTE_JOB,
        { instanceId: instance.id },
        {
          jobId: instance.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
      await this.instanceRepository.update(instance.id, {
        queueJobId: String(job.id ?? instance.id),
      });
    } catch {
      await this.instanceRepository.update(instance.id, {
        status: 'failed',
        error: 'Unable to queue workflow instance',
        completedAt: new Date(),
      });
      throw new ServiceUnavailableException(
        'Unable to queue workflow instance',
      );
    }
    return { message: 'Workflow started successfully', data: instance };
  }

  async findDefinition(userId: number, definitionId: string) {
    const definition = await this.definitionRepository.findOne({
      where: { id: definitionId, userId },
    });
    if (!definition)
      throw new NotFoundException('Workflow definition not found');
    return {
      message: 'Workflow definition found successfully',
      data: definition,
    };
  }

  async findInstance(userId: number, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, userId },
      relations: { definition: true },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    const [nodes, events] = await Promise.all([
      this.instanceRepository.manager.find(NodeExecution, {
        where: { instanceId },
        order: { createdAt: 'ASC' },
      }),
      this.instanceRepository.manager.find(Event, {
        where: { instanceId },
        order: { sequence: 'ASC' },
      }),
    ]);
    return {
      message: 'Workflow instance found successfully',
      data: { ...instance, nodeExecutions: nodes, events },
    };
  }

  async cancel(userId: number, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (['completed', 'failed'].includes(instance.status)) {
      throw new BadRequestException(
        `A ${instance.status} workflow cannot be cancelled`,
      );
    }
    if (instance.status !== 'cancelled') {
      const activeNode = await this.instanceRepository.manager.findOne(
        NodeExecution,
        {
          where: { instanceId, status: 'running' },
        },
      );
      if (activeNode?.runId) {
        await this.assistant
          .cancelRun(userId, activeNode.runId)
          .catch(() => undefined);
      }
      await this.instanceRepository.update(instance.id, {
        status: 'cancelled',
        cancelledAt: new Date(),
        completedAt: new Date(),
      });
      await this.instanceRepository.manager.update(
        NodeExecution,
        { instanceId, status: 'running' },
        { status: 'cancelled', completedAt: new Date() },
      );
      const job = await this.queue.getJob(instance.queueJobId ?? instance.id);
      if (job && ['waiting', 'delayed'].includes(await job.getState())) {
        await job.remove().catch(() => undefined);
      }
    }
    return this.findInstance(userId, instanceId);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { AssistantService } from '../../assistant/services/assistant.service';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { DispatchDto } from '../dto/dispatch.dto';
import { PlannerService } from './planner.service';
import { SelectorService } from './selector.service';

@Injectable()
export class DispatchService {
  constructor(
    private readonly selector: SelectorService,
    private readonly planner: PlannerService,
    private readonly assistant: AssistantService,
    private readonly workflows: WorkflowService,
  ) {}

  async dispatch(userId: number, request: DispatchDto) {
    if (request.selectionMode === 'assistant') {
      return this.startAssistant(userId, request, 'explicit_assistant');
    }
    if (request.selectionMode === 'workflow') {
      if (!request.workflowDefinitionId) {
        throw new BadRequestException('A workflow definition is required');
      }
      return this.startWorkflow(
        userId,
        request.workflowDefinitionId,
        request,
        'explicit_workflow',
      );
    }
    if (!request.input?.trim()) {
      return this.startAssistant(userId, request, 'no_workflow_candidate');
    }

    const selection = await this.selector.select(userId, request);
    if (
      selection.definition &&
      selection.decision.requiresMultipleSteps &&
      selection.decision.confidence >= 0.75
    ) {
      return this.startWorkflow(
        userId,
        selection.definition.id,
        request,
        selection.decision.reason,
      );
    }
    if (
      !selection.definition &&
      selection.decision.requiresMultipleSteps &&
      selection.decision.confidence >= 0.75
    ) {
      return this.generateWorkflow(userId, request);
    }
    return this.startAssistant(userId, request, selection.decision.reason);
  }

  private async generateWorkflow(userId: number, request: DispatchDto) {
    const plan = await this.planner.plan(request);
    if (!plan) {
      return this.startAssistant(
        userId,
        request,
        'workflow_generation_unavailable',
      );
    }
    try {
      const definition = await this.workflows.createGeneratedDefinition(
        userId,
        plan.definition,
      );
      return this.startWorkflow(
        userId,
        definition.data.id,
        request,
        `generated:${plan.reason}`,
      );
    } catch {
      return this.startAssistant(
        userId,
        request,
        'workflow_generation_invalid',
      );
    }
  }

  private async startAssistant(
    userId: number,
    request: DispatchDto,
    reason: string,
  ) {
    const response = await this.assistant.createRun(userId, request);
    return {
      message: response.message,
      data: { kind: 'run', reason, ...response.data },
    };
  }

  private async startWorkflow(
    userId: number,
    definitionId: string,
    request: DispatchDto,
    reason: string,
  ) {
    const response = await this.workflows.start(userId, definitionId, {
      input: { task: this.taskInput(request) },
    });
    return {
      message: response.message,
      data: { kind: 'workflow', reason, ...response.data },
    };
  }

  private taskInput(request: DispatchDto) {
    return {
      capability: request.capability,
      context: request.context,
      input: request.input,
      options: request.options,
      browserSessionId: request.browserSessionId,
      browserExecutionTarget: request.browserExecutionTarget,
      executionLane: request.executionLane,
    };
  }
}

import { Injectable } from '@nestjs/common';
import type {
  AiGenerateResult,
  AiMessage,
  AiToolCall,
} from '../../ai/types/provider';
import { AiService } from '../../ai/ai.service';
import { ToolsService } from '../../tools/tools.service';
import type { Run } from '../entities/run.entity';
import { MAX_ITERATIONS } from '../constants';
import type { AssistantAgentDecision } from '@repo/contracts/assistant';
import { ExecutionService } from './execution.service';
import { BrowserToolApprovalRequiredError } from '../../tools/policy/browser-tool-approval.service';
import { getBrowserToolDescriptor } from '../../tools/policy/browser-tool-descriptors';
import type { BrowserToolResult } from '../../tools/types/browser-tool.types';
import { randomUUID } from 'node:crypto';
import {
  BrowserCommandOutcomeUnknownError,
  BrowserSessionUnavailableError,
} from '../../tools/executors/browser-execution.errors';
import {
  AgentTelemetryEvents,
  TelemetryAttributes,
  traceOperation,
} from '@repo/observability';

@Injectable()
export class LoopService {
  constructor(
    private readonly aiService: AiService,
    private readonly toolsService: ToolsService,
    private readonly execution: ExecutionService,
  ) {}

  async run(
    run: Run,
    initialMessages: AiMessage[],
    signal?: AbortSignal,
  ): Promise<AiGenerateResult> {
    return traceOperation(
      AgentTelemetryEvents.run,
      {
        [TelemetryAttributes.run.id]: run.id,
        [TelemetryAttributes.run.capability]: run.capability,
        [TelemetryAttributes.run.executionLane]: run.executionLane,
        [TelemetryAttributes.browser.executionTarget]:
          run.browserExecutionTarget ?? 'unknown',
      },
      () => this.executeLoop(run, initialMessages, signal),
    );
  }

  private async executeLoop(
    run: Run,
    initialMessages: AiMessage[],
    signal?: AbortSignal,
  ): Promise<AiGenerateResult> {
    let messages = [...initialMessages];
    let inputTokens = 0;
    let outputTokens = 0;
    let initialIteration = 0;

    const continuation = await this.execution.getContinuation(run.id);
    if (continuation) {
      messages = continuation.messages as AiMessage[];
      initialIteration = continuation.iteration;
      const pendingToolCalls = continuation.pendingToolCalls as AiToolCall[];
      if (
        continuation.dispatchState === 'unknown' &&
        run.browserExecutionTarget === 'managed'
      ) {
        messages.push(
          ...pendingToolCalls.map((toolCall, index) => ({
            role: 'tool' as const,
            toolCallId: toolCall.id,
            content: JSON.stringify({
              success: false,
              outcomeUnknown: index === 0,
              cancelled: index > 0,
              error:
                index === 0
                  ? 'The previous browser action may have completed. Observe and reconcile before taking another action.'
                  : 'Cancelled because a previous action has an unknown outcome.',
            }),
          })),
        );
        await this.execution.clearContinuation(run.id);
      } else {
        await this.executeToolBatch(
          run,
          messages,
          pendingToolCalls,
          continuation.iteration,
          signal,
          continuation.idempotencyKey,
        );
      }
    }

    for (
      let iteration = initialIteration;
      iteration < MAX_ITERATIONS;
      iteration += 1
    ) {
      signal?.throwIfAborted();
      await this.execution.transition(run.id, {
        expectedStatuses: ['running'],
        status: 'running',
        phase: 'reasoning',
        eventType: 'agent.reasoning',
        checkpointState: { iteration },
      });
      const modelStep = await this.execution.startStep(run.id, 'model', {
        iteration,
        messageCount: messages.length,
      });
      let result: AiGenerateResult;
      try {
        result = await this.aiService.generate({
          messages,
          tools: [...this.toolsService.getDefinitions()],
          signal,
        });
        await this.execution.completeStep(modelStep.id, {
          decision: this.toDecision(result),
          provider: result.provider,
          model: result.model,
          usage: result.usage,
        });
      } catch (error) {
        await this.execution.failStep(modelStep.id, error);
        throw error;
      }
      inputTokens += result.usage?.inputTokens ?? 0;
      outputTokens += result.usage?.outputTokens ?? 0;

      if (!result.toolCalls?.length) {
        return {
          ...result,
          usage: { inputTokens, outputTokens },
        };
      }

      messages.push({
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls,
      });

      await this.executeToolBatch(
        run,
        messages,
        result.toolCalls,
        iteration,
        signal,
      );
    }

    throw new Error(
      `Agent exceeded the ${MAX_ITERATIONS}-iteration tool limit`,
    );
  }

  private async executeTool(
    run: Run,
    toolCall: AiToolCall,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<AiMessage> {
    let payload: unknown;
    await this.execution.transition(run.id, {
      expectedStatuses: ['running'],
      status: 'running',
      phase: 'executing',
      eventType: 'agent.executing',
      checkpointState: { toolCallId: toolCall.id, toolName: toolCall.name },
    });
    const step = await this.execution.startStep(run.id, 'tool', {
      toolCallId: toolCall.id,
      name: toolCall.name,
      arguments: toolCall.arguments,
    });

    try {
      if (!this.toolsService.supports(toolCall.name)) {
        throw new Error(`Unsupported browser tool: ${toolCall.name}`);
      }
      if (!run.browserSessionId) {
        throw new Error('No browser session is associated with this run');
      }

      const result = await this.toolsService.execute(
        {
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          userId: run.userId,
          runId: run.id,
          browserSessionId: run.browserSessionId,
          executorKind: run.browserExecutionTarget,
          idempotencyKey,
          signal,
        },
      );
      await this.execution.completeStep(step.id, { success: true, result });
      const verification = await this.verifyTool(run, toolCall, result, signal);
      payload = { success: true, result, verification };
    } catch (error) {
      await this.execution.failStep(step.id, error);
      if (error instanceof BrowserToolApprovalRequiredError) {
        if (error.approval.effect === 'sensitive_input') {
          await this.execution.redactSensitiveToolText(run.id);
        } else {
          await this.execution.markContinuation(run.id, 'approval', 'prepared');
        }
        throw error;
      }
      if (
        error instanceof BrowserSessionUnavailableError ||
        error instanceof BrowserCommandOutcomeUnknownError
      ) {
        await this.execution.markContinuation(
          run.id,
          'browser_unavailable',
          error instanceof BrowserCommandOutcomeUnknownError
            ? 'unknown'
            : 'prepared',
        );
        throw error;
      }
      signal?.throwIfAborted();
      payload = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown tool error',
      };
    }

    return {
      role: 'tool',
      toolCallId: toolCall.id,
      content: JSON.stringify(payload),
    };
  }

  private async executeToolBatch(
    run: Run,
    messages: AiMessage[],
    toolCalls: readonly AiToolCall[],
    iteration: number,
    signal?: AbortSignal,
    firstIdempotencyKey?: string,
  ): Promise<void> {
    for (let index = 0; index < toolCalls.length; index += 1) {
      const idempotencyKey =
        index === 0 && firstIdempotencyKey ? firstIdempotencyKey : randomUUID();
      await this.execution.saveContinuation(
        run.id,
        iteration,
        messages,
        toolCalls.slice(index),
        idempotencyKey,
      );
      messages.push(
        await this.executeTool(run, toolCalls[index], idempotencyKey, signal),
      );
      await this.execution.clearContinuation(run.id);
    }
  }

  private toDecision(result: AiGenerateResult): AssistantAgentDecision {
    return result.toolCalls?.length
      ? { kind: 'tool', calls: result.toolCalls }
      : { kind: 'complete', content: result.content };
  }

  private async verifyTool(
    run: Run,
    toolCall: AiToolCall,
    result: BrowserToolResult,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (!this.toolsService.supports(toolCall.name)) return undefined;
    const descriptor = getBrowserToolDescriptor(toolCall.name);
    if (!descriptor.verifyAfterExecution) return undefined;

    const step = await this.execution.startStep(run.id, 'verification', {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
    });
    try {
      const tabId = this.readResultTabId(result);
      const evidence = tabId
        ? await this.toolsService.execute(
            { name: 'browser_get_navigation_state', arguments: { tabId } },
            {
              userId: run.userId,
              runId: run.id,
              browserSessionId: run.browserSessionId!,
              executorKind: run.browserExecutionTarget,
              signal,
            },
          )
        : { acknowledgedByExecutor: true };
      const verification = { verified: true, evidence };
      await this.execution.completeStep(step.id, verification);
      return verification;
    } catch (error) {
      await this.execution.failStep(step.id, error);
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  private readResultTabId(result: BrowserToolResult): string | undefined {
    if (!result || Array.isArray(result) || typeof result !== 'object') {
      return undefined;
    }
    if ('tabId' in result && typeof result.tabId === 'string') {
      return result.tabId;
    }
    if (
      'tab' in result &&
      result.tab &&
      typeof result.tab === 'object' &&
      'id' in result.tab &&
      typeof result.tab.id === 'string'
    ) {
      return result.tab.id;
    }
    return undefined;
  }
}

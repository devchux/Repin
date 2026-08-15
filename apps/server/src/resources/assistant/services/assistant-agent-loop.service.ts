import { Injectable } from '@nestjs/common';
import type {
  AiGenerateResult,
  AiMessage,
  AiToolCall,
} from '../../ai/types/provider';
import { AiService } from '../../ai/ai.service';
import { ToolsService } from '../../tools/tools.service';
import type { AssistantRun } from '../entities/run.entity';
import { ASSISTANT_MAX_AGENT_ITERATIONS } from '../assistant.constants';
import type { AssistantAgentDecision } from '@repo/contracts/assistant';
import { AssistantExecutionService } from './assistant-execution.service';
import { BrowserToolApprovalRequiredError } from '../../tools/policy/browser-tool-approval.service';
import { getBrowserToolDescriptor } from '../../tools/policy/browser-tool-descriptors';
import type { BrowserToolResult } from '../../tools/types/browser-tool.types';

@Injectable()
export class AssistantAgentLoop {
  constructor(
    private readonly aiService: AiService,
    private readonly toolsService: ToolsService,
    private readonly execution: AssistantExecutionService,
  ) {}

  async run(
    run: AssistantRun,
    initialMessages: AiMessage[],
    signal?: AbortSignal,
  ): Promise<AiGenerateResult> {
    const messages = [...initialMessages];
    let inputTokens = 0;
    let outputTokens = 0;

    for (
      let iteration = 0;
      iteration < ASSISTANT_MAX_AGENT_ITERATIONS;
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

      for (const toolCall of result.toolCalls) {
        messages.push(await this.executeTool(run, toolCall, signal));
      }
    }

    throw new Error(
      `Assistant exceeded the ${ASSISTANT_MAX_AGENT_ITERATIONS}-iteration tool limit`,
    );
  }

  private async executeTool(
    run: AssistantRun,
    toolCall: AiToolCall,
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
          signal,
        },
      );
      await this.execution.completeStep(step.id, { success: true, result });
      const verification = await this.verifyTool(run, toolCall, result, signal);
      payload = { success: true, result, verification };
    } catch (error) {
      await this.execution.failStep(step.id, error);
      if (error instanceof BrowserToolApprovalRequiredError) throw error;
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

  private toDecision(result: AiGenerateResult): AssistantAgentDecision {
    return result.toolCalls?.length
      ? { kind: 'tool', calls: result.toolCalls }
      : { kind: 'complete', content: result.content };
  }

  private async verifyTool(
    run: AssistantRun,
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

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

@Injectable()
export class AssistantAgentLoop {
  constructor(
    private readonly aiService: AiService,
    private readonly toolsService: ToolsService,
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
      const result = await this.aiService.generate({
        messages,
        tools: [...this.toolsService.getDefinitions()],
        signal,
      });
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
      payload = { success: true, result };
    } catch (error) {
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
}

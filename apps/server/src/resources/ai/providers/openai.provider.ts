import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { OpenAiCompatibleProviderOptions } from '../types/openai';
import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiMessage,
  AiProvider,
} from '../types/provider';

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly client: OpenAI;

  constructor(private readonly options: OpenAiCompatibleProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      timeout: options.requestTimeout,
    });
  }

  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    if (!this.options.apiKey) {
      throw new Error(`${this.options.provider} API key is not configured`);
    }

    const response = await this.client.chat.completions.create(
      {
        model: options.model || this.options.model,
        messages: options.messages.map((message) =>
          this.toChatMessage(message),
        ),
        tools: this.toChatTools(options),
        response_format: options.responseSchema
          ? {
              type: 'json_schema',
              json_schema: {
                name: 'response',
                strict: true,
                schema: options.responseSchema,
              },
            }
          : undefined,
      },
      { signal: options.signal },
    );
    const message = response.choices[0]?.message;

    if (!message) {
      throw new Error(`${this.options.provider} returned an empty response`);
    }

    return {
      provider: this.options.provider,
      model: response.model,
      content: message.content || '',
      toolCalls: message.tool_calls?.flatMap((toolCall) =>
        toolCall.type === 'function'
          ? [
              {
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: this.parseToolArguments(toolCall.function.arguments),
              },
            ]
          : [],
      ),
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }

  private toChatMessage(message: AiMessage): ChatCompletionMessageParam {
    if (message.role === 'tool') {
      if (!message.toolCallId) {
        throw new Error('Tool messages require a tool call ID');
      }

      return {
        role: 'tool',
        content: message.content,
        tool_call_id: message.toolCallId,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  }

  private toChatTools(
    options: AiGenerateOptions,
  ): ChatCompletionTool[] | undefined {
    return options.tools?.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  private parseToolArguments(argumentsJson: string): Record<string, unknown> {
    try {
      return JSON.parse(argumentsJson) as Record<string, unknown>;
    } catch {
      throw new Error(
        `${this.options.provider} returned invalid tool arguments`,
      );
    }
  }
}

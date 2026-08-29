export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type AiMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiMessage {
  role: AiMessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: AiToolCall[];
}

export interface AiTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiGenerateOptions {
  messages: AiMessage[];
  model?: string;
  tools?: AiTool[];
  responseSchema?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AiGenerateResult {
  provider: string;
  model: string;
  content: string;
  toolCalls?: AiToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AiProvider {
  generate(options: AiGenerateOptions): Promise<AiGenerateResult>;
  stream?(options: AiGenerateOptions): AsyncIterable<string>;
}

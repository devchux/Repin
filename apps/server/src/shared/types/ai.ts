import {
  AiAssistantCapability,
  AssistantRunOptions,
} from '@repo/contracts/assistant';
import { PageContext } from '@repo/contracts/browser';

export interface AssistantPromptInput {
  capability: AiAssistantCapability;
  context: PageContext;
  input?: string;
  options?: AssistantRunOptions;
}

export interface ConversationPromptInput {
  initialCapability: AiAssistantCapability;
  context: PageContext;
  options?: AssistantRunOptions;
}

export interface ConversationPromptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkflowSelectionPromptInput {
  task: {
    capability: AiAssistantCapability;
    input?: string;
    pageTitle: string;
    pageUrl: string;
  };
  candidates: readonly {
    id: string;
    name: string;
    description?: string;
    examples?: readonly string[];
  }[];
}

export interface WorkflowGenerationPromptInput {
  capability: AiAssistantCapability;
  objective: string;
  pageTitle: string;
  pageUrl: string;
}

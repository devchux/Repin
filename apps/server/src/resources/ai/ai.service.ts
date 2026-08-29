import { Inject, Injectable, Optional } from '@nestjs/common';
import { AI_PROVIDER } from './types/provider';
import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
} from './types/provider';
import {
  AiTelemetryEvents,
  TelemetryAttributes,
  traceOperation,
} from '@repo/observability';

@Injectable()
export class AiService {
  constructor(
    @Optional()
    @Inject(AI_PROVIDER)
    private readonly provider?: AiProvider,
  ) {}

  generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const provider = this.getProvider();
    return traceOperation(
      AiTelemetryEvents.generation,
      {
        [TelemetryAttributes.ai.operationName]: 'generate_content',
        [TelemetryAttributes.ai.messageCount]: options.messages.length,
        [TelemetryAttributes.ai.toolCount]: options.tools?.length ?? 0,
      },
      async () => {
        const result = await provider.generate(options);
        return result;
      },
    );
  }

  stream(options: AiGenerateOptions): AsyncIterable<string> {
    const provider = this.getProvider();

    if (!provider.stream) {
      throw new Error('The configured AI provider does not support streaming');
    }

    return provider.stream(options);
  }

  private getProvider(): AiProvider {
    if (!this.provider) {
      throw new Error('AI provider is not configured');
    }

    return this.provider;
  }
}

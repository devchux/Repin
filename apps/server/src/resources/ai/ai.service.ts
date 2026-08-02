import { Inject, Injectable, Optional } from '@nestjs/common';
import { AI_PROVIDER } from './types/provider';
import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
} from './types/provider';

@Injectable()
export class AiService {
  constructor(
    @Optional()
    @Inject(AI_PROVIDER)
    private readonly provider?: AiProvider,
  ) {}

  generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    return this.getProvider().generate(options);
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

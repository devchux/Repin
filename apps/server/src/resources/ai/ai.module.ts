import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './types/provider';
import { OpenAiCompatibleProvider } from './providers/openai.provider';
import { Configuration } from 'src/shared/types';

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration>) =>
        new OpenAiCompatibleProvider({
          provider: configService.get('ai.provider', { infer: true }),
          apiKey: configService.get('ai.apiKey', { infer: true }),
          baseUrl: configService.get('ai.baseUrl', { infer: true }),
          model: configService.get('ai.model', { infer: true }),
        }),
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}

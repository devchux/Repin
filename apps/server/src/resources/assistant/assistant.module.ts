import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Configuration } from 'src/shared/types';
import { ToolsModule } from '../tools/tools.module';
import { AgentModule } from '../agent/agent.module';
import {
  ASSISTANT_BACKGROUND_QUEUE,
  ASSISTANT_INTERACTIVE_QUEUE,
} from './assistant.constants';
import { AssistantController } from './assistant.controller';
import { AssistantShortProcessor } from './processors/assistant-short.processor';
import { AssistantLongProcessor } from './processors/assistant-long.processor';
import { AssistantRunHandler } from './services/assistant-run-handler.service';
import { AssistantQueueScaler } from './services/assistant-queue-scaler.service';
import { AssistantService } from './services/assistant.service';
import { AssistantConversation } from './entities/conversation.entity';
import { AssistantConversationMessage } from './entities/conversation-message.entity';

@Module({
  imports: [
    AgentModule,
    ToolsModule,
    TypeOrmModule.forFeature([
      AssistantConversation,
      AssistantConversationMessage,
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration>) => {
        const redisUrl = new URL(configService.get('redis', { infer: true }));
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            username: redisUrl.username || undefined,
            password: redisUrl.password || undefined,
            db: redisUrl.pathname
              ? Number(redisUrl.pathname.replace('/', '') || 0)
              : 0,
            tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: ASSISTANT_INTERACTIVE_QUEUE },
      { name: ASSISTANT_BACKGROUND_QUEUE },
    ),
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantRunHandler,
    AssistantShortProcessor,
    AssistantLongProcessor,
    AssistantQueueScaler,
  ],
})
export class AssistantModule {}

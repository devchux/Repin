import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Configuration } from 'src/shared/types';
import { AiModule } from '../ai/ai.module';
import { ToolsModule } from '../tools/tools.module';
import { ASSISTANT_INTERACTIVE_QUEUE } from './assistant.constants';
import { AssistantController } from './assistant.controller';
import { AssistantProcessor } from './processors/assistant.processor';
import { AssistantQueueScaler } from './services/assistant-queue-scaler.service';
import { AssistantService } from './services/assistant.service';
import { AssistantAgentLoop } from './services/assistant-agent-loop.service';
import { AssistantRun } from './entities/run.entity';
import { AssistantConversation } from './entities/conversation.entity';
import { AssistantConversationMessage } from './entities/conversation-message.entity';
import { AssistantRunStep } from './entities/run-step.entity';
import { AssistantRunEvent } from './entities/run-event.entity';
import { AssistantRunCheckpoint } from './entities/run-checkpoint.entity';
import { AssistantExecutionService } from './services/assistant-execution.service';

@Module({
  imports: [
    AiModule,
    ToolsModule,
    TypeOrmModule.forFeature([
      AssistantRun,
      AssistantConversation,
      AssistantConversationMessage,
      AssistantRunStep,
      AssistantRunEvent,
      AssistantRunCheckpoint,
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
    BullModule.registerQueue({ name: ASSISTANT_INTERACTIVE_QUEUE }),
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantAgentLoop,
    AssistantProcessor,
    AssistantQueueScaler,
    AssistantExecutionService,
  ],
})
export class AssistantModule {}

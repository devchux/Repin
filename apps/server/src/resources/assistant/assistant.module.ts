import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Configuration } from 'src/shared/types';
import { ToolsModule } from '../tools/tools.module';
import { AgentModule } from '../agent/agent.module';
import { BACKGROUND_QUEUE, INTERACTIVE_QUEUE } from './constants';
import { AssistantController } from './assistant.controller';
import { ShortProcessor } from './processors/short.processor';
import { LongProcessor } from './processors/long.processor';
import { RunHandler } from './services/run-handler.service';
import { QueueScaler } from './services/queue-scaler.service';
import { AssistantService } from './services/assistant.service';
import { RunService } from './services/run.service';
import { ConversationService } from './services/conversation.service';
import { ApprovalService } from './services/approval.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversation-message.entity';

@Module({
  imports: [
    AgentModule,
    ToolsModule,
    TypeOrmModule.forFeature([Conversation, ConversationMessage]),
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
      { name: INTERACTIVE_QUEUE },
      { name: BACKGROUND_QUEUE },
    ),
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    RunService,
    ConversationService,
    ApprovalService,
    RunHandler,
    ShortProcessor,
    LongProcessor,
    QueueScaler,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}

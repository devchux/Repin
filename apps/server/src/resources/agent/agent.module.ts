import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ToolsModule } from '../tools/tools.module';
import { Run } from './entities/run.entity';
import { RunCheckpoint } from './entities/run-checkpoint.entity';
import { RunContinuation } from './entities/run-continuation.entity';
import { RunEvent } from './entities/run-event.entity';
import { RunStep } from './entities/run-step.entity';
import { ExecutionService } from './services/execution.service';
import { LoopService } from './services/loop.service';

@Module({
  imports: [
    AiModule,
    ToolsModule,
    TypeOrmModule.forFeature([
      Run,
      RunStep,
      RunEvent,
      RunCheckpoint,
      RunContinuation,
    ]),
  ],
  providers: [ExecutionService, LoopService],
  exports: [TypeOrmModule, ExecutionService, LoopService],
})
export class AgentModule {}

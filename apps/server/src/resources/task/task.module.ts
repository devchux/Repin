import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AssistantModule } from '../assistant/assistant.module';
import { Definition } from '../workflow/entities/definition.entity';
import { WorkflowModule } from '../workflow/workflow.module';
import { DispatchService } from './services/dispatch.service';
import { PlannerService } from './services/planner.service';
import { SelectorService } from './services/selector.service';
import { TaskController } from './task.controller';

@Module({
  imports: [
    AiModule,
    AssistantModule,
    WorkflowModule,
    TypeOrmModule.forFeature([Definition]),
  ],
  controllers: [TaskController],
  providers: [DispatchService, SelectorService, PlannerService],
})
export class TaskModule {}

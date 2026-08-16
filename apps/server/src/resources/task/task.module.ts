import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AssistantModule } from '../assistant/assistant.module';
import { Definition } from '../workflow/entities/definition.entity';
import { WorkflowModule } from '../workflow/workflow.module';
import { SelectionService } from './services/selection.service';
import { TaskController } from './task.controller';

@Module({
  imports: [
    AiModule,
    AssistantModule,
    WorkflowModule,
    TypeOrmModule.forFeature([Definition]),
  ],
  controllers: [TaskController],
  providers: [SelectionService],
})
export class TaskModule {}

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantModule } from '../assistant/assistant.module';
import { QUEUE } from './constants';
import { Definition } from './entities/definition.entity';
import { Event } from './entities/event.entity';
import { Instance } from './entities/instance.entity';
import { NodeExecution } from './entities/node-execution.entity';
import { RuntimeProcessor } from './processors/runtime.processor';
import { DefinitionValidator } from './services/definition-validator.service';
import { RuntimeService } from './services/runtime.service';
import { WorkflowService } from './services/workflow.service';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [
    AssistantModule,
    TypeOrmModule.forFeature([Definition, Instance, NodeExecution, Event]),
    BullModule.registerQueue({ name: QUEUE }),
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    DefinitionValidator,
    RuntimeService,
    RuntimeProcessor,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { MemorySource } from './entities/memory-source.entity';
import { MemoryController } from './memory.controller';
import { MemoryService } from './services/memory.service';
import { MemoryToolsService } from './services/tools.service';
import { LibraryModule } from '../library/library.module';
import { AiModule } from '../ai/ai.module';
import { BullModule } from '@nestjs/bullmq';
import { MEMORY_EMBEDDING_QUEUE } from './constants';
import { MemoryEmbeddingService } from './services/embedding.service';
import { MemoryEmbeddingProcessor } from './processors/embedding.processor';
import { MemoryEmbeddingScheduler } from './schedulers/embedding.scheduler';

@Module({
  imports: [
    AiModule,
    LibraryModule,
    BullModule.registerQueue({ name: MEMORY_EMBEDDING_QUEUE }),
    TypeOrmModule.forFeature([Memory, MemorySource]),
  ],
  controllers: [MemoryController],
  providers: [
    MemoryService,
    MemoryToolsService,
    MemoryEmbeddingService,
    MemoryEmbeddingProcessor,
    MemoryEmbeddingScheduler,
  ],
  exports: [MemoryService, MemoryToolsService],
})
export class MemoryModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { MemorySource } from './entities/memory-source.entity';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { MemoryToolsService } from './tools.service';
import { LibraryModule } from '../library/library.module';
import { AiModule } from '../ai/ai.module';
import { BullModule } from '@nestjs/bullmq';
import { MEMORY_EMBEDDING_QUEUE } from './memory.constants';
import { MemoryEmbeddingService } from './embedding.service';
import { MemoryEmbeddingProcessor } from './embedding.processor';
import { MemoryEmbeddingScheduler } from './embedding.scheduler';

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

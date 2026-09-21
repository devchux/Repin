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
import { BookmarkModule } from '../bookmark/bookmark.module';
import { NoteModule } from '../note/note.module';
import { HighlightModule } from '../highlight/highlight.module';

@Module({
  imports: [
    AiModule,
    BookmarkModule,
    NoteModule,
    HighlightModule,
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

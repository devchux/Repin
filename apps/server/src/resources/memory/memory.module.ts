import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { MemorySource } from './entities/memory-source.entity';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { MemoryToolsService } from './memory-tools.service';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [LibraryModule, TypeOrmModule.forFeature([Memory, MemorySource])],
  controllers: [MemoryController],
  providers: [MemoryService, MemoryToolsService],
  exports: [MemoryService, MemoryToolsService],
})
export class MemoryModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedPage } from './entities/saved-page.entity';
import { SavedPageController } from './saved-page.controller';
import { SavedPageService } from './saved-page.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedPage])],
  controllers: [SavedPageController],
  providers: [SavedPageService],
  exports: [SavedPageService],
})
export class SavedPageModule {}

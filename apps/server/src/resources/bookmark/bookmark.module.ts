import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkController } from './controllers/bookmark.controller';
import { BookmarkService } from './services/bookmark.service';
import { AiModule } from '../ai/ai.module';
import { BookmarkCollection } from './entities/collection.entity';
import { BookmarkCollectionItem } from './entities/collection-item.entity';
import { BookmarkCollectionController } from './controllers/collection.controller';
import { BookmarkCollectionService } from './services/collection.service';
import { BookmarkEnrichmentService } from './services/enrichment.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Configuration } from 'src/shared/types';
import { BOOKMARK_ENRICHMENT_QUEUE } from './utils/constants';
import { BookmarkEnrichmentProcessor } from './processors/enrichment.processor';

@Module({
  imports: [
    AiModule,
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
    BullModule.registerQueue({ name: BOOKMARK_ENRICHMENT_QUEUE }),
    TypeOrmModule.forFeature([
      Bookmark,
      BookmarkCollection,
      BookmarkCollectionItem,
    ]),
  ],
  controllers: [BookmarkController, BookmarkCollectionController],
  providers: [
    BookmarkService,
    BookmarkCollectionService,
    BookmarkEnrichmentService,
    BookmarkEnrichmentProcessor,
  ],
  exports: [BookmarkService],
})
export class BookmarkModule {}

import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import KeyvRedis from '@keyv/redis';
import { ConfigService } from '@nestjs/config';
import { Configuration } from 'src/shared/types';
import Keyv from 'keyv';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async (configService: ConfigService<Configuration>) => {
        const redisUrl = configService.get('redis');
        return {
          stores: [
            new Keyv({
              store: new KeyvRedis(redisUrl),
            }),
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

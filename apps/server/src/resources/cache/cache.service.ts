import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async setValue(key: string, value: unknown, ttl: number) {
    await this.cacheManager.set(key, value, ttl);
  }

  async getValue<T>(key: string) {
    return this.cacheManager.get(key) as Promise<T>;
  }

  async deleteValue(key: string) {
    return this.cacheManager.del(key);
  }
}

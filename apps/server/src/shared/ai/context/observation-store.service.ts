import { Injectable } from '@nestjs/common';
import type { PageObservation } from '@repo/contracts/context';
import type { PageContext } from '@repo/contracts/browser';
import { CacheService } from '../../../resources/cache/cache.service';

const OBSERVATION_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class ObservationStoreService {
  constructor(private readonly cache: CacheService) {}

  async retain(userId: number, context: PageContext): Promise<PageContext> {
    if (!context.observation) return context;
    const observation = context.observation;
    await this.cache.setValue(
      this.key(userId, observation.observationId),
      observation,
      OBSERVATION_TTL_MS,
    );

    return {
      url: context.url,
      title: context.title,
      selectedText: context.selectedText,
      selection: context.selection,
      observationId: observation.observationId,
      // Conversations outlive the live observation. Persist only a bounded,
      // flattened reading fallback rather than the structural browser capture.
      pageContent:
        context.pageContent ??
        observation.blocks
          .filter((block) => block.visible)
          .map((block) => block.text)
          .join('\n')
          .slice(0, 100_000),
    };
  }

  async get(
    userId: number,
    observationId?: string,
  ): Promise<PageObservation | undefined> {
    if (!observationId) return undefined;
    return (
      (await this.cache.getValue<PageObservation>(
        this.key(userId, observationId),
      )) ?? undefined
    );
  }

  private key(userId: number, observationId: string): string {
    return `browser-observation:${userId}:${observationId}`;
  }
}

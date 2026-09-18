import type { CacheService } from '../../../resources/cache/cache.service';
import { ObservationStoreService } from './observation-store.service';

describe('ObservationStoreService', () => {
  const cache = {
    setValue: jest.fn().mockResolvedValue(undefined),
    getValue: jest.fn(),
  } as unknown as CacheService;
  const store = new ObservationStoreService(cache);

  beforeEach(() => jest.clearAllMocks());

  it('stores structural observations and returns a durable text fallback', async () => {
    const context = await store.retain(7, {
      url: 'https://example.com',
      title: 'Example',
      observation: {
        schemaVersion: 1,
        observationId: 'observation-1',
        tabId: 'tab-1',
        documentRevision: 'revision-1',
        capturedAt: '2026-09-18T00:00:00.000Z',
        url: 'https://example.com',
        title: 'Example',
        blocks: [
          {
            id: 'b1',
            kind: 'paragraph',
            text: 'Visible text',
            visible: true,
            inViewport: true,
          },
        ],
        truncated: false,
      },
    });

    expect(cache.setValue).toHaveBeenCalledWith(
      'browser-observation:7:observation-1',
      expect.objectContaining({ observationId: 'observation-1' }),
      1_800_000,
    );
    expect(context).toMatchObject({
      observationId: 'observation-1',
      pageContent: 'Visible text',
    });
    expect(context.observation).toBeUndefined();
  });

  it('scopes lookups to the owning user', async () => {
    jest.spyOn(cache, 'getValue').mockResolvedValueOnce(undefined);
    await store.get(9, 'observation-1');
    expect(cache.getValue).toHaveBeenCalledWith(
      'browser-observation:9:observation-1',
    );
  });
});

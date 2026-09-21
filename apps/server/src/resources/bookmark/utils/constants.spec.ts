import { bookmarkEnrichmentJobId } from './constants';

describe('bookmarkEnrichmentJobId', () => {
  it('creates a BullMQ-safe custom job ID', () => {
    const jobId = bookmarkEnrichmentJobId(
      'ae17f28a-d8e8-415a-b16b-ae8795cacf40',
    );

    expect(jobId).toBe('bookmark-ae17f28a-d8e8-415a-b16b-ae8795cacf40');
    expect(jobId).not.toContain(':');
  });
});

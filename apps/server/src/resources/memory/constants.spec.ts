import { memoryEmbeddingJobId } from './constants';

describe('memoryEmbeddingJobId', () => {
  it('creates a BullMQ-safe custom job ID', () => {
    const jobId = memoryEmbeddingJobId('ae17f28a-d8e8-415a-b16b-ae8795cacf40');

    expect(jobId).toBe('memory-ae17f28a-d8e8-415a-b16b-ae8795cacf40');
    expect(jobId).not.toContain(':');
  });
});

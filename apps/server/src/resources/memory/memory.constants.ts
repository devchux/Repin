export const MEMORY_EMBEDDING_QUEUE = 'memory-embedding';
export const EMBED_MEMORY_JOB = 'embed-memory';
export const BACKFILL_MEMORY_EMBEDDINGS_JOB = 'backfill-memory-embeddings';

export const MEMORY_RANKING = {
  lexicalWeight: 0.4,
  semanticWeight: 0.5,
  exactScopeBoost: 0.07,
  globalScopeBoost: 0.04,
  recencyWeight: 0.03,
  minimumSemanticSimilarity: 0.55,
} as const;

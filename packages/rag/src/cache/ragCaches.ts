// packages/rag/src/cache/ragCaches.ts

import { MemoryCache } from './cache';

export const RETRIEVER_CACHE_TTL_MS = Number(
	process.env.RAG_CACHE_RETRIEVER_TTL_MS ?? String(24 * 60 * 60 * 1000)
);

export const RETRIEVAL_CACHE_TTL_MS = Number(
	process.env.RAG_CACHE_RETRIEVAL_TTL_MS ?? String(24 * 60 * 60 * 1000)
);

export const RETRIEVAL_CACHE_VERSION = process.env.RAG_CACHE_RETRIEVAL_VERSION ?? 'v1';

export const EMBEDDINGS_CACHE_MAX_ENTRIES = Number(
	process.env.RAG_CACHE_EMBEDDINGS_MAX_ENTRIES ?? '5000'
);

export const EMBEDDINGS_CACHE_TTL_MS = Number(
	process.env.RAG_CACHE_EMBEDDINGS_TTL_MS ?? String(24 * 60 * 60 * 1000)
);

export const retrieverCache = new MemoryCache({
	maxEntries: 50,
	defaultTtlMs: RETRIEVER_CACHE_TTL_MS,
});

export const retrievalCache = new MemoryCache({
	maxEntries: 2000,
	defaultTtlMs: RETRIEVAL_CACHE_TTL_MS,
});

export const embeddingsCache = new MemoryCache({
	maxEntries: EMBEDDINGS_CACHE_MAX_ENTRIES,
	defaultTtlMs: EMBEDDINGS_CACHE_TTL_MS,
});

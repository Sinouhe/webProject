// packages/rag/src/admin/ragCacheAdmin.ts

import type { CacheStats } from '../cache/cache';
import { retrieverCache, retrievalCache, embeddingsCache, answerCache } from '../cache/ragCaches';

export type RagCacheStats = {
	retriever: CacheStats & { size: number };
	retrieval: CacheStats & { size: number };
	embeddings: CacheStats & { size: number };
	answer: CacheStats & { size: number };
};

export type RagCacheScope = 'all' | 'retrieval' | 'retriever' | 'embeddings' | 'answer';

export function purgeRagCaches(scope: RagCacheScope): void {
	if (scope === 'all' || scope === 'retriever') retrieverCache.clear();
	if (scope === 'all' || scope === 'retrieval') retrievalCache.clear();
	if (scope === 'all' || scope === 'embeddings') embeddingsCache.clear();
	if (scope === 'all' || scope === 'answer') answerCache.clear();
}

export function getRagCacheStats(): RagCacheStats {
	return {
		retriever: { ...retrieverCache.stats(), size: retrieverCache.size() },
		retrieval: { ...retrievalCache.stats(), size: retrievalCache.size() },
		embeddings: { ...embeddingsCache.stats(), size: embeddingsCache.size() },
		answer: { ...answerCache.stats(), size: answerCache.size() },
	};
}

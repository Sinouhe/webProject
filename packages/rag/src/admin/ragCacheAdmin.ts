// packages/rag/src/admin/ragCacheAdmin.ts

import type { CacheStats } from '../cache/cache';
import { retrieverCache, retrievalCache, embeddingsCache } from '../cache/ragCaches';

export type RagCacheStats = {
	retriever: CacheStats & { size: number };
	retrieval: CacheStats & { size: number };
	embeddings: CacheStats & { size: number };
};

export type RagCacheScope = 'all' | 'retrieval' | 'retriever' | 'embeddings';

export function purgeRagCaches(scope: RagCacheScope): void {
	if (scope === 'all' || scope === 'retriever') retrieverCache.clear();
	if (scope === 'all' || scope === 'retrieval') retrievalCache.clear();
	if (scope === 'all' || scope === 'embeddings') embeddingsCache.clear();
}

export function getRagCacheStats(): RagCacheStats {
	return {
		retriever: { ...retrieverCache.stats(), size: retrieverCache.size() },
		retrieval: { ...retrievalCache.stats(), size: retrievalCache.size() },
		embeddings: { ...embeddingsCache.stats(), size: embeddingsCache.size() },
	};
}

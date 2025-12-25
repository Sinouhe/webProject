import { createHash } from 'crypto';

import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';

import { embeddingsCache, EMBEDDINGS_CACHE_TTL_MS } from '../cache/ragCaches';

function normalizeForEmbeddingKey(text: string): string {
	// Keep semantics: do NOT lowercase.
	// Normalize whitespace to stabilize keys for trivially equivalent inputs.
	return text
		.replace(/\u00A0/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

/**
 * Cached OpenAI embeddings wrapper (composition, no inheritance).
 *
 * Why this exists:
 * - Avoid paying OpenAI embeddings multiple times for identical inputs.
 * - Prevent cache stampede: concurrent misses for the same key share ONE in-flight Promise.
 *
 * Important:
 * - Keys are hashed to avoid storing raw user text as cache keys (PII / large keys).
 */
export function createCachedEmbeddings(params: {
	apiKey: string;
	model: string;
}): EmbeddingsInterface<number[]> {
	const { apiKey, model } = params;

	const inner = new OpenAIEmbeddings({
		apiKey,
		model,
	});

	return {
		async embedQuery(text: string): Promise<number[]> {
			const normalized = normalizeForEmbeddingKey(text);
			const key = `emb:q:${model}:${sha256(normalized)}`;

			return embeddingsCache.getOrSet<number[]>(
				key,
				async () => inner.embedQuery(normalized),
				EMBEDDINGS_CACHE_TTL_MS
			);
		},

		async embedDocuments(texts: string[]): Promise<number[][]> {
			// NOTE:
			// Correct but not optimal for ingestion throughput because it does not batch
			// missing texts into a single provider call. We'll optimize in the ingest cache step.
			const normalizedTexts = texts.map(normalizeForEmbeddingKey);

			const vectors = await Promise.all(
				normalizedTexts.map((t) => {
					const key = `emb:d:${model}:${sha256(t)}`;
					return embeddingsCache.getOrSet<number[]>(
						key,
						async () => inner.embedQuery(t),
						EMBEDDINGS_CACHE_TTL_MS
					);
				})
			);

			return vectors;
		},
	};
}

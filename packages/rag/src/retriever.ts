import { createHash } from 'crypto';

import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

import type { RagConfig } from './types';
import { MemoryCache } from './cache/cache';

const DEFAULT_EMBEDDINGS_MODEL = 'text-embedding-3-small';

// Embeddings cache tuning (env-driven so you can adjust without code changes)
const EMBEDDINGS_CACHE_MAX_ENTRIES = Number(process.env.RAG_CACHE_EMBEDDINGS_MAX_ENTRIES ?? '5000');
const EMBEDDINGS_CACHE_TTL_MS = Number(
	process.env.RAG_CACHE_EMBEDDINGS_TTL_MS ?? String(24 * 60 * 60 * 1000)
); // 24h

// One in-memory cache per Node.js process.
// For multi-replica deployments, each replica has its own cache (Redis later if needed).
const embeddingsCache = new MemoryCache({
	maxEntries: EMBEDDINGS_CACHE_MAX_ENTRIES,
	defaultTtlMs: EMBEDDINGS_CACHE_TTL_MS,
});

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
 * Singleflight cache wrapper for embeddings (composition only, no inheritance).
 *
 * Why this exists:
 * - Avoid paying OpenAI embeddings multiple times for identical inputs.
 * - Prevent cache stampede: concurrent misses for the same key share ONE in-flight Promise.
 *
 * Important:
 * - Keys are hashed to avoid storing raw user text as cache keys (PII / large keys).
 */
function createCachedEmbeddings(params: {
	inner: OpenAIEmbeddings;
	model: string;
}): EmbeddingsInterface<number[]> {
	const { inner, model } = params;

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
			// This is correct but not optimal for ingestion throughput because it does not batch
			// missing texts into a single provider call. We'll improve this in the ingest cache step.
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

/**
 * Create a Pinecone-backed retriever.
 * Notes:
 * - No dotenv here.
 * - Caller must provide config (usually from env).
 */
export async function createRetriever(config: RagConfig): Promise<VectorStoreRetriever> {
	const model = config.embeddingModel ?? DEFAULT_EMBEDDINGS_MODEL;

	const rawEmbeddings = new OpenAIEmbeddings({
		apiKey: config.openAiApiKey,
		model,
	});

	const embeddings = createCachedEmbeddings({
		inner: rawEmbeddings,
		model,
	});

	const pinecone = new Pinecone({
		apiKey: config.pineconeApiKey,
	});

	const index = pinecone.index(config.pineconeIndex);

	const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
		pineconeIndex: index,
		namespace: config.pineconeNamespace,
	});

	const retriever = vectorStore.asRetriever(config.topK ?? 6);
	return retriever;
}

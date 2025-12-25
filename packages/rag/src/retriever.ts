import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

import type { RagConfig } from './types';
import { createCachedEmbeddings } from './cache/cachedEmbeddings';

const DEFAULT_EMBEDDINGS_MODEL = 'text-embedding-3-small';

/**
 * Create a Pinecone-backed retriever.
 * Notes:
 * - No dotenv here.
 * - Caller must provide config (usually from env).
 */
export async function createRetriever(config: RagConfig): Promise<VectorStoreRetriever> {
	const model = config.embeddingModel ?? DEFAULT_EMBEDDINGS_MODEL;

	const embeddings = createCachedEmbeddings({
		apiKey: config.openAiApiKey,
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

	return vectorStore.asRetriever(config.topK ?? 6);
}

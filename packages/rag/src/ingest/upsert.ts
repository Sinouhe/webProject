import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import type { Document } from '@langchain/core/documents';

import type { RagConfig } from '../types';
import { createCachedEmbeddings } from '../cache/cachedEmbeddings';

const DEFAULT_EMBEDDINGS_MODEL = 'text-embedding-3-small';

/**
 * Upsert documents into Pinecone with OpenAI embeddings.
 */
export async function upsertDocuments(params: {
	config: RagConfig;
	docs: Document[];
}): Promise<number> {
	const { config, docs } = params;

	const embeddings = createCachedEmbeddings({
		apiKey: config.openAiApiKey,
		model: config.embeddingModel ?? DEFAULT_EMBEDDINGS_MODEL,
	});

	const pinecone = new Pinecone({ apiKey: config.pineconeApiKey });
	const index = pinecone.index(config.pineconeIndex);

	await PineconeStore.fromDocuments(docs, embeddings, {
		pineconeIndex: index,
		namespace: config.pineconeNamespace,
	});

	return docs.length;
}

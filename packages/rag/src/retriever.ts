import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import type { RagConfig } from './types';

/**
 * Create a Pinecone-backed retriever.
 * Notes:
 * - No dotenv here.
 * - Caller must provide config (usually from env).
 */
export async function createRetriever(config: RagConfig): Promise<VectorStoreRetriever> {
	const embeddings = new OpenAIEmbeddings({
		apiKey: config.openAiApiKey,
		model: config.embeddingModel ?? 'text-embedding-3-small',
	});

	const pinecone = new Pinecone({
		apiKey: config.pineconeApiKey, // OK if undefined when env is set
	});

	const index = pinecone.index(config.pineconeIndex);

	const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
		pineconeIndex: index,
		namespace: config.pineconeNamespace,
	});

	console.log({ config });
	const retriever = vectorStore.asRetriever(config.topK ?? 6);
	return retriever;
}

import { Injectable } from '@nestjs/common';
import { ingestUrls } from '@ragcv/rag';
import type { RagConfig } from '@ragcv/rag';

@Injectable()
export class IngestService {
	async ingest(params: { urls: string[]; dryRun: boolean }) {
		const config: RagConfig = {
			openAiApiKey: process.env.OPENAI_API_KEY ?? '',
			pineconeApiKey: process.env.PINECONE_API_KEY ?? '',
			pineconeIndex: process.env.PINECONE_INDEX ?? '',
			pineconeNamespace: process.env.PINECONE_NAMESPACE || undefined,
			embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
			chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
			topK: Number(process.env.RAG_TOP_K ?? '6'),
		};

		if (!config.openAiApiKey || !config.pineconeApiKey || !config.pineconeIndex) {
			throw new Error('Missing env vars: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX');
		}
		if (!config.pineconeNamespace) {
			throw new Error('Missing env var: PINECONE_NAMESPACE (e.g. dev)');
		}

		return ingestUrls({
			config,
			urls: params.urls,
			maxPages: Number(process.env.INGEST_MAX_PAGES ?? '5'),
			maxChunks: Number(process.env.INGEST_MAX_CHUNKS ?? '200'),
			dryRun: params.dryRun,
		});
	}
}

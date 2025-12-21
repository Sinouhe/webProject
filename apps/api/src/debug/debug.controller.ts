import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { debugRetrieval } from '@ragcv/rag';
import type { RagConfig } from '@ragcv/rag';

@Controller('debug')
export class DebugController {
	@Get('retrieval')
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	async retrieval(@Query('q') q: string | undefined): Promise<unknown> {
		const qTrimmed = (q ?? '').trim();

		if (qTrimmed.length < 3 || qTrimmed.length > 500) {
			throw new HttpException(
				"Invalid query param 'q' (min 3, max 500).",
				HttpStatus.BAD_REQUEST
			);
		}

		const config: RagConfig = {
			openAiApiKey: process.env.OPENAI_API_KEY ?? '',
			pineconeApiKey: process.env.PINECONE_API_KEY ?? '',
			pineconeIndex: process.env.PINECONE_INDEX ?? '',
			pineconeNamespace: process.env.PINECONE_NAMESPACE || undefined,
			embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
			chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
			topK: Number(process.env.RAG_TOP_K ?? '6'),
		};

		if (!config.pineconeApiKey || !config.pineconeIndex) {
			throw new HttpException(
				'Missing env vars: PINECONE_API_KEY, PINECONE_INDEX',
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		}

		if (!config.pineconeNamespace) {
			throw new HttpException(
				'Missing env var: PINECONE_NAMESPACE (e.g. dev)',
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		}

		return debugRetrieval({ config, question: qTrimmed });
	}
}

// packages/rag/src/chat/runChatStrict.ts

import { createHash } from 'crypto';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';

import type { RagConfig } from '../types';
import { createRetriever } from '../retriever';
import { retrieveContext } from '../retrieval/retrieval';
import { answerQuestionStrict, streamAnswerStrict } from '../answer';

import {
	retrieverCache,
	retrievalCache,
	RETRIEVAL_CACHE_VERSION,
	RETRIEVAL_CACHE_TTL_MS,
} from '../cache/ragCaches';

type RetrievalResult = Awaited<ReturnType<typeof retrieveContext>>;

export type RunChatStrictParams = {
	config: RagConfig;
	question: string;
	isStream: boolean;
	onToken?: (token: string) => void;
};

export type RunChatStrictResult =
	| { mode: 'non-stream'; answer: string; citations: unknown }
	| { mode: 'stream'; citations: unknown };

function normalize(text: string): string {
	return text
		.replace(/\u00A0/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

function retrieverKey(cfg: RagConfig): string {
	return `retriever:${sha256(
		JSON.stringify({
			index: cfg.pineconeIndex,
			namespace: cfg.pineconeNamespace ?? null,
			embeddingModel: cfg.embeddingModel ?? null,
			topK: cfg.topK ?? 6,
		})
	)}`;
}

function retrievalKey(cfg: RagConfig, question: string): string {
	return `retrieval:${sha256(
		JSON.stringify({
			v: RETRIEVAL_CACHE_VERSION,
			q: normalize(question),
			index: cfg.pineconeIndex,
			namespace: cfg.pineconeNamespace ?? null,
			topK: cfg.topK ?? 6,
		})
	)}`;
}

async function getRetriever(cfg: RagConfig): Promise<VectorStoreRetriever> {
	return retrieverCache.getOrSet(retrieverKey(cfg), () => createRetriever(cfg));
}

export async function runChatStrict(params: RunChatStrictParams): Promise<RunChatStrictResult> {
	const { config, question, isStream, onToken } = params;

	if (isStream && !onToken) {
		throw new Error('onToken callback is required when isStream=true');
	}

	const retriever = await getRetriever(config);

	const retrieval: RetrievalResult = await retrievalCache.getOrSet(
		retrievalKey(config, question),
		() => retrieveContext(retriever, question),
		RETRIEVAL_CACHE_TTL_MS
	);

	if (isStream) {
		const { citations } = await streamAnswerStrict({
			config,
			question,
			contextText: retrieval.contextText,
			sources: retrieval.sources,
			onToken: onToken!,
		});

		return { mode: 'stream', citations };
	}

	const result = await answerQuestionStrict({
		config,
		question,
		contextText: retrieval.contextText,
		sources: retrieval.sources,
	});

	return { mode: 'non-stream', answer: result.answer, citations: result.citations };
}

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
	answerCache,
	RETRIEVAL_CACHE_VERSION,
	RETRIEVAL_CACHE_TTL_MS,
	ANSWER_CACHE_TTL_MS,
	ANSWER_CACHE_VERSION,
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

type CachedAnswer = {
	answer: string;
	citations: string[];
};

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

function answerKey(params: { cfg: RagConfig; question: string; contextHash: string }): string {
	const { cfg, question, contextHash } = params;

	return `answer:${sha256(
		JSON.stringify({
			v: ANSWER_CACHE_VERSION,
			q: normalize(question),
			contextHash,
			index: cfg.pineconeIndex,
			namespace: cfg.pineconeNamespace ?? null,
			topK: cfg.topK ?? 6,
			chatModel: cfg.chatModel ?? null,
		})
	)}`;
}

/**
 * Replay a cached answer through onToken in small chunks.
 * This does NOT reproduce exact model tokens; it provides a streaming UX without calling OpenAI.
 */
function replayAnswer(answer: string, onToken: (token: string) => void): void {
	const chunkSize = 48;
	for (let i = 0; i < answer.length; i += chunkSize) {
		onToken(answer.slice(i, i + chunkSize));
	}
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

	const contextHash = sha256(retrieval.contextText);
	const aKey = answerKey({ cfg: config, question, contextHash });

	// Answer cache hit: return/replay without calling OpenAI.
	const cached = answerCache.get<CachedAnswer>(aKey);
	if (cached.hit && cached.value) {
		if (isStream) {
			replayAnswer(cached.value.answer, onToken!);
			return { mode: 'stream', citations: cached.value.citations };
		}
		return {
			mode: 'non-stream',
			answer: cached.value.answer,
			citations: cached.value.citations,
		};
	}

	// Answer cache miss: call OpenAI, then store.
	if (isStream) {
		let buffered = '';

		const wrappedOnToken = (token: string) => {
			buffered += token;
			onToken!(token);
		};

		const { citations } = await streamAnswerStrict({
			config,
			question,
			contextText: retrieval.contextText,
			sources: retrieval.sources,
			onToken: wrappedOnToken,
		});

		// Cache final answer after streaming completed.
		answerCache.set<CachedAnswer>(aKey, { answer: buffered, citations }, ANSWER_CACHE_TTL_MS);

		return { mode: 'stream', citations };
	}

	const result = await answerQuestionStrict({
		config,
		question,
		contextText: retrieval.contextText,
		sources: retrieval.sources,
	});

	answerCache.set<CachedAnswer>(
		aKey,
		{ answer: result.answer, citations: result.citations },
		ANSWER_CACHE_TTL_MS
	);

	return { mode: 'non-stream', answer: result.answer, citations: result.citations };
}

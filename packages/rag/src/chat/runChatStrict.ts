// packages/rag/src/chat/runChatStrict.ts

import { createHash } from 'crypto';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';

import type { RagConfig } from '../types.js';
import { MemoryCache } from '../cache/cache.js';
import { createRetriever } from '../retriever.js';
import { retrieveContext } from '../retrieval/retrieval.js';
import { answerQuestionStrict, streamAnswerStrict } from '../answer.js';

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

/* ===========================
   CACHES (prod-safe)
=========================== */

const RETRIEVER_CACHE_TTL_MS = Number(
	process.env.RAG_CACHE_RETRIEVER_TTL_MS ?? String(24 * 60 * 60 * 1000)
);

const RETRIEVAL_CACHE_TTL_MS = Number(
	process.env.RAG_CACHE_RETRIEVAL_TTL_MS ?? String(24 * 60 * 60 * 1000)
);

const RETRIEVAL_CACHE_VERSION = process.env.RAG_CACHE_RETRIEVAL_VERSION ?? 'v1';

const retrieverCache = new MemoryCache({
	maxEntries: 50,
	defaultTtlMs: RETRIEVER_CACHE_TTL_MS,
});

const retrievalCache = new MemoryCache({
	maxEntries: 2000,
	defaultTtlMs: RETRIEVAL_CACHE_TTL_MS,
});

/* ===========================
   HELPERS
=========================== */

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
	return sha256(
		JSON.stringify({
			index: cfg.pineconeIndex,
			namespace: cfg.pineconeNamespace ?? null,
			embeddingModel: cfg.embeddingModel ?? null,
			topK: cfg.topK ?? 6,
		})
	);
}

function retrievalKey(cfg: RagConfig, question: string): string {
	return sha256(
		JSON.stringify({
			v: RETRIEVAL_CACHE_VERSION,
			q: normalize(question),
			index: cfg.pineconeIndex,
			namespace: cfg.pineconeNamespace ?? null,
			topK: cfg.topK ?? 6,
		})
	);
}

async function getRetriever(cfg: RagConfig): Promise<VectorStoreRetriever> {
	return retrieverCache.getOrSet(retrieverKey(cfg), () => createRetriever(cfg));
}

/* ===========================
   MAIN ENTRYPOINT
=========================== */

export async function runChatStrict(params: RunChatStrictParams): Promise<RunChatStrictResult> {
	const { config, question, isStream, onToken } = params;

	if (isStream && !onToken) {
		throw new Error('onToken callback is required when isStream=true');
	}

	const retriever = await getRetriever(config);

	const retrieval: RetrievalResult = await retrievalCache.getOrSet(
		retrievalKey(config, question),
		() => retrieveContext(retriever, question)
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

	return {
		mode: 'non-stream',
		answer: result.answer,
		citations: result.citations,
	};
}

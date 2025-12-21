import 'dotenv/config';
import type { RagConfig } from '../types.js';
import { createRetriever } from '../retriever.js';
import { retrieveContext } from '../retrieval/retrieval.js';
import { answerQuestionStrict } from '../answer.js';

/**
 * Chat CLI:
 * - Retrieves context from Pinecone
 * - Answers strictly from context
 * - Outputs citations
 *
 * Usage:
 *   pnpm -C packages/rag chat --q "What is example.com used for?"
 */
async function main() {
	const args = process.argv.slice(2);
	const qIndex = args.indexOf('--q');
	const question = qIndex >= 0 ? args[qIndex + 1] : null;

	if (!question) {
		throw new Error('Missing --q "..."');
	}

	const cfg: RagConfig = {
		openAiApiKey: process.env.OPENAI_API_KEY ?? '',
		pineconeApiKey: process.env.PINECONE_API_KEY ?? '',
		pineconeIndex: process.env.PINECONE_INDEX ?? '',
		pineconeNamespace: process.env.PINECONE_NAMESPACE || undefined,
		embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
		chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
		topK: Number(process.env.RAG_TOP_K ?? '6'),
	};

	if (!cfg.openAiApiKey || !cfg.pineconeApiKey || !cfg.pineconeIndex) {
		throw new Error('Missing env vars: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX');
	}
	if (!cfg.pineconeNamespace) {
		throw new Error('PINECONE_NAMESPACE is empty. Set it explicitly (e.g. dev).');
	}

	const retriever = await createRetriever(cfg);
	const retrieval = await retrieveContext(retriever, question);

	const result = await answerQuestionStrict({
		config: cfg,
		question,
		contextText: retrieval.contextText,
		sources: retrieval.sources,
	});

	// eslint-disable-next-line no-console
	console.log(
		JSON.stringify(
			{
				question,
				answer: result.answer,
				citations: result.citations,
			},
			null,
			2
		)
	);
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});

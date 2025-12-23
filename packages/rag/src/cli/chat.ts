import 'dotenv/config';
import { runChatStrict } from '../chat/runChatStrict.js';
import type { RagConfig } from '../types.js';

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
		pineconeNamespace: process.env.PINECONE_NAMESPACE ?? undefined,
		embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
		chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
		topK: Number(process.env.RAG_TOP_K ?? '6'),
	};

	const result = await runChatStrict({
		config: cfg,
		question,
		isStream: false,
	});

	console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

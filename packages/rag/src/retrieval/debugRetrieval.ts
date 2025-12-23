import type { Document } from '@langchain/core/documents';
import type { RagConfig } from '../types';
import { createRetriever } from '../retriever';

/**
 * Debug retrieval without calling any LLM.
 * Note: this performs vector search only.
 */
export async function debugRetrieval(params: { config: RagConfig; question: string }): Promise<{
	question: string;
	topK: number;
	namespace: string | null;
	chunks: Array<{
		content: string;
		source: string | null;
		score: number | null;
		metadata: Record<string, unknown>;
	}>;
}> {
	const { config, question } = params;

	const retriever = await createRetriever(config);

	const docs = (await retriever.invoke(question)) as Document[];

	const chunks = docs.map((d: any) => {
		const md = (d.metadata ?? {}) as Record<string, unknown>;
		const source = (md.url as string | undefined) ?? (md.source as string | undefined) ?? null;

		const score = (md.score as number | undefined) ?? (md._score as number | undefined) ?? null;

		return {
			contentPreview: d.pageContent.slice(0, 200),
			content: d.pageContent ?? '',
			source,
			score,
			metadata: md,
		};
	});

	return {
		question,
		topK: config.topK ?? 6,
		namespace: config.pineconeNamespace ?? null,
		chunks,
	};
}

import type { Document } from '@langchain/core/documents';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import type { RetrievedChunk, RetrievalResult } from './types';

/**
 * Format retrieved documents into a single context string.
 * We intentionally avoid importing internal LangChain helpers
 * because they can change across versions.
 */
function formatDocsAsContext(docs: Document[]): string {
	return docs
		.map((d, i) => {
			const source = typeof d.metadata?.source === 'string' ? d.metadata.source : 'unknown';
			const content = d.pageContent ?? '';
			return [`[#${i + 1}] source: ${source}`, content.trim()].join('\n');
		})
		.join('\n\n---\n\n');
}

/**
 * Turn retrieved Documents into:
 * - chunks: structured
 * - sources: deduped strings
 * - contextText: formatted string for prompt injection
 */
export function normalizeRetrieval(docs: Document[]): RetrievalResult {
	const chunks: RetrievedChunk[] = docs.map((d) => ({
		content: d.pageContent,
		metadata: (d.metadata ?? {}) as Record<string, unknown>,
		source: typeof d.metadata?.source === 'string' ? d.metadata.source : undefined,
	}));

	const sources: string[] = [];
	for (const c of chunks) {
		if (c.source && !sources.includes(c.source)) sources.push(c.source);
	}
	const limitedSources = sources.slice(0, 3);

	return {
		chunks,
		sources: limitedSources,
		contextText: formatDocsAsContext(docs),
	};
}

export async function retrieveContext(
	retriever: VectorStoreRetriever,
	question: string
): Promise<RetrievalResult> {
	const docs = await retriever.invoke(question);
	const base = normalizeRetrieval(docs);

	const citations = pickCitationsByKeyword({
		question,
		chunks: base.chunks,
		max: 2,
	});

	// Fallback if heuristic finds nothing
	return {
		...base,
		sources: citations.length ? citations : base.sources.slice(0, 2),
	};
}

function pickCitationsByKeyword(params: {
	question: string;
	chunks: RetrievedChunk[];
	max: number;
}): string[] {
	const { question, chunks, max } = params;

	const keywords = question
		.toLowerCase()
		.split(/[^a-z0-9]+/g)
		.filter((w) => w.length >= 4);

	const sources: string[] = [];
	for (const c of chunks) {
		const src = c.source;
		if (!src || sources.includes(src)) continue;

		const content = (c.content ?? '').toLowerCase();
		const hit = keywords.some((k) => content.includes(k));

		if (hit) sources.push(src);
		if (sources.length >= max) break;
	}

	return sources;
}

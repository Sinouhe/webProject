import { fetchHtml } from './crawl';
import { htmlToDocument } from './htmlToDocument';
import { splitDocuments } from './split';
import { upsertDocuments } from './upsert';
import type { RagConfig } from '../types';

/**
 * Public ingestion API used by:
 * - NestJS API (/ingest)
 * - CLI (pnpm ingest)
 */
export async function ingestUrls(params: {
	config: RagConfig;
	urls: string[];
	maxPages?: number;
	maxChunks?: number;
	dryRun?: boolean;
}): Promise<{
	pagesOk: number;
	pagesFailed: number;
	failures: Array<{ url: string; error: string }>;
	chunksCreated: number;
	chunksWouldUpsert?: number;
	chunksAttempted?: number;
	namespace: string;
	dryRun: boolean;
}> {
	const { config } = params;

	if (!config.pineconeNamespace) {
		throw new Error(
			'Refusing to ingest: pineconeNamespace is empty. Set it explicitly (e.g. dev).'
		);
	}

	const maxPages = params.maxPages ?? 5;
	const maxChunks = params.maxChunks ?? 200;
	const dryRun = params.dryRun !== false;

	const selectedUrls = params.urls.slice(0, maxPages);

	const docs = [];
	const failures: Array<{ url: string; error: string }> = [];

	for (const url of selectedUrls) {
		try {
			const html = await fetchHtml(url);
			const doc = htmlToDocument({ url, html });

			// Skip empty pages (common with JS-heavy sites)
			if (!doc.pageContent || doc.pageContent.trim().length < 50) {
				failures.push({ url, error: 'Extracted text is empty or too short' });
				continue;
			}

			docs.push(doc);
		} catch (e: any) {
			failures.push({ url, error: e?.message ?? 'Unknown error' });
		}
	}

	if (docs.length === 0) {
		throw new Error(`All URLs failed. Failures: ${JSON.stringify(failures, null, 2)}`);
	}

	const chunks = await splitDocuments(docs, { chunkSize: 500, chunkOverlap: 100 });
	const limitedChunks = chunks.slice(0, maxChunks);

	if (dryRun) {
		return {
			pagesOk: docs.length,
			pagesFailed: failures.length,
			failures,
			chunksCreated: chunks.length,
			chunksWouldUpsert: limitedChunks.length,
			namespace: config.pineconeNamespace,
			dryRun: true,
		};
	}

	const attempted = await upsertDocuments({ config, docs: limitedChunks });

	return {
		pagesOk: docs.length,
		pagesFailed: failures.length,
		failures,
		chunksCreated: chunks.length,
		chunksAttempted: attempted,
		namespace: config.pineconeNamespace,
		dryRun: false,
	};
}

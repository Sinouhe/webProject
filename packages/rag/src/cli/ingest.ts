import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import type { RagConfig } from '../types';
import { ingestUrls } from '../ingest/ingestUrls';

/**
 * Ingestion CLI:
 * - Reads URLs from a text file (--urls path/to/file.txt)
 * - Or accepts repeated --url https://... flags
 * - Fetches HTML -> extracts text -> splits -> (dry-run by default) -> optional upsert with --commit
 *
 * Examples:
 *   pnpm -C packages/rag ingest --urls data/urls.txt
 *   pnpm -C packages/rag ingest --urls data/urls.txt --commit
 *   pnpm -C packages/rag ingest --url https://example.com/ --url https://www.iana.org/domains/reserved
 *   pnpm -C packages/rag ingest --url https://example.com/ --commit
 */
function getFlagValue(args: string[], flag: string): string | null {
	const i = args.indexOf(flag);
	if (i < 0) return null;
	return args[i + 1] ?? null;
}

function getRepeatedFlagValues(args: string[], flag: string): string[] {
	const values: string[] = [];
	for (let i = 0; i < args.length; i++) {
		if (args[i] === flag && args[i + 1]) values.push(args[i + 1]);
	}
	return values;
}

async function readUrlsFile(filePath: string): Promise<string[]> {
	const raw = await readFile(filePath, 'utf-8');
	return raw
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith('#'));
}

async function main() {
	const args = process.argv.slice(2);

	const urlsFile = getFlagValue(args, '--urls');
	const inlineUrls = getRepeatedFlagValues(args, '--url');

	const maxPages = Number(process.env.INGEST_MAX_PAGES ?? '5');
	const maxChunks = Number(process.env.INGEST_MAX_CHUNKS ?? '200');
	const commit = args.includes('--commit');
	const dryRun = !commit;

	const cfg: RagConfig = {
		openAiApiKey: process.env.OPENAI_API_KEY ?? '',
		pineconeApiKey: process.env.PINECONE_API_KEY ?? '',
		pineconeIndex: process.env.PINECONE_INDEX ?? '',
		pineconeNamespace: process.env.PINECONE_NAMESPACE || undefined,
		embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
		chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
		topK: 6,
	};

	if (!cfg.openAiApiKey || !cfg.pineconeApiKey || !cfg.pineconeIndex) {
		throw new Error('Missing env vars: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX');
	}
	if (!cfg.pineconeNamespace) {
		throw new Error(
			'Refusing to ingest: PINECONE_NAMESPACE is empty. Set it explicitly (e.g. dev).'
		);
	}

	let urls: string[] = [];

	// Prefer explicit inline --url flags over file when both are present (predictable behavior).
	if (inlineUrls.length > 0) {
		urls = inlineUrls;
	} else if (urlsFile) {
		urls = await readUrlsFile(urlsFile);
	} else {
		throw new Error(
			'Missing input. Use either --urls <file> or repeated --url <url>.\n' +
				'Example: pnpm -C packages/rag ingest --urls data/urls.txt\n' +
				'Example: pnpm -C packages/rag ingest --url https://example.com/ --commit'
		);
	}

	if (urls.length === 0) {
		throw new Error('No URLs provided.');
	}

	const result = await ingestUrls({
		config: cfg,
		urls,
		maxPages,
		maxChunks,
		dryRun,
	});

	// eslint-disable-next-line no-console
	console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});

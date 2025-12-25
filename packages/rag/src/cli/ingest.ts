import 'dotenv/config';
import { readFile } from 'node:fs/promises';

import type { RagConfig } from '../types';
import { ingestAdmin } from '../admin/ingest';

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

	let urls: string[] = [];

	if (inlineUrls.length > 0) {
		urls = inlineUrls;
	} else if (urlsFile) {
		urls = await readUrlsFile(urlsFile);
	} else {
		const result = {
			ok: false,
			error: {
				code: 'MISSING_PARAM',
				message:
					'Missing input. Use either --urls <file> or repeated --url <url>.\n' +
					'Example: pnpm -C packages/rag ingest --urls data/urls.txt\n' +
					'Example: pnpm -C packages/rag ingest --url https://example.com/ --commit',
			},
		};
		// eslint-disable-next-line no-console
		console.log(JSON.stringify(result, null, 2));
		process.exit(1);
		return;
	}

	const result = await ingestAdmin({
		config: cfg,
		urls,
		maxPages,
		maxChunks,
		dryRun,
	});

	// eslint-disable-next-line no-console
	console.log(JSON.stringify(result, null, 2));

	if (!result.ok) process.exit(1);
}

main().catch((err) => {
	// CLI last-resort (should be rare since admin returns ok:false).
	const msg = err instanceof Error ? err.message : String(err);
	// eslint-disable-next-line no-console
	console.log(
		JSON.stringify({ ok: false, error: { code: 'INGEST_FAILED', message: msg } }, null, 2)
	);
	process.exit(1);
});

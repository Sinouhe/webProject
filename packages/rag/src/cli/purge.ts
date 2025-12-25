import 'dotenv/config';

import type { PurgeTarget, PurgeCacheScope } from '../admin/purge';
import { purgeAdmin } from '../admin/purge';

function readArg(name: string): string | null {
	const args = process.argv.slice(2);
	const idx = args.indexOf(name);
	return idx >= 0 ? (args[idx + 1] ?? null) : null;
}

async function main() {
	const targetRaw = readArg('--target');
	if (!targetRaw) {
		throw new Error('Missing --target. Allowed: caches | pinecone');
	}

	const target = targetRaw as PurgeTarget;
	if (target !== 'pinecone' && target !== 'caches') {
		throw new Error('Invalid --target. Allowed: caches | pinecone');
	}

	if (target === 'pinecone') {
		const apiKey = process.env.PINECONE_API_KEY ?? '';
		const indexName = process.env.PINECONE_INDEX ?? '';
		const namespace = process.env.PINECONE_NAMESPACE ?? '';

		const result = await purgeAdmin({
			target: 'pinecone',
			pinecone: { apiKey, indexName, namespace },
		});

		// eslint-disable-next-line no-console
		console.log(JSON.stringify(result, null, 2));

		if (!result.ok) process.exit(1);
		return;
	}

	// target === 'caches'
	const scopeRaw = readArg('--scope');
	if (!scopeRaw) {
		throw new Error(
			'Missing --scope. Allowed: all | retrieval | retriever | embeddings | answer'
		);
	}

	const scope = scopeRaw as PurgeCacheScope;

	const result = await purgeAdmin({
		target: 'caches',
		caches: { scope },
	});

	// eslint-disable-next-line no-console
	console.log(JSON.stringify(result, null, 2));

	if (!result.ok) process.exit(1);
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});

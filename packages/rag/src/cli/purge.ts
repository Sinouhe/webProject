// packages/rag/src/cli/purge.ts

import 'dotenv/config';

import { purgeRagCaches, getRagCacheStats } from '../admin/ragCacheAdmin';
import { purgePineconeNamespace } from '../admin/purgePineconeNamespace';

type Target = 'pinecone' | 'caches';
type Scope = 'all' | 'retrieval' | 'retriever';

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

	const target = targetRaw as Target;
	if (target !== 'pinecone' && target !== 'caches') {
		throw new Error('Invalid --target. Allowed: caches | pinecone');
	}

	if (target === 'pinecone') {
		const apiKey = process.env.PINECONE_API_KEY ?? '';
		const indexName = process.env.PINECONE_INDEX ?? '';
		const namespace = process.env.PINECONE_NAMESPACE ?? '';

		const result = await purgePineconeNamespace({ apiKey, indexName, namespace });
		// eslint-disable-next-line no-console
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	// target === 'caches'
	const scopeRaw = readArg('--scope');
	if (!scopeRaw) {
		throw new Error('Missing --scope. Allowed: all | retrieval | retriever');
	}

	const scope = scopeRaw as Scope;
	if (
		scope !== 'all' &&
		scope !== 'retrieval' &&
		scope !== 'retriever' &&
		scope !== 'embeddings' &&
		scope !== 'answer'
	) {
		throw new Error(
			'Invalid --scope. Allowed: all | retrieval | retriever | embeddings | answer'
		);
	}

	purgeRagCaches(scope);

	const stats = getRagCacheStats();
	// eslint-disable-next-line no-console
	console.log(JSON.stringify({ ok: true, purged: scope, stats }, null, 2));
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});

import type { CacheStats } from '../cache/cache';

import { purgeRagCaches, getRagCacheStats } from './ragCacheAdmin';
import { purgePineconeNamespace } from './purgePineconeNamespace';

export type PurgeTarget = 'pinecone' | 'caches';
export type PurgeCacheScope = 'all' | 'retrieval' | 'retriever' | 'embeddings' | 'answer';

export type PurgePineconeParams = {
	apiKey: string;
	indexName: string;
	namespace: string;
};

export type PurgeCachesParams = {
	scope: PurgeCacheScope;
};

export type PurgeErrorCode =
	| 'INVALID_TARGET'
	| 'MISSING_PARAM'
	| 'INVALID_SCOPE'
	| 'PINECONE_PURGE_FAILED';

export type PurgeError = {
	code: PurgeErrorCode;
	message: string;
};

export type PurgeResult =
	| { ok: true; target: 'pinecone'; purgedNamespace: string }
	| { ok: true; target: 'caches'; purged: PurgeCacheScope; stats: Record<string, CacheStats> }
	| { ok: false; target: PurgeTarget; error: PurgeError };

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0;
}

function isValidScope(scope: unknown): scope is PurgeCacheScope {
	return (
		scope === 'all' ||
		scope === 'retrieval' ||
		scope === 'retriever' ||
		scope === 'embeddings' ||
		scope === 'answer'
	);
}

export async function purgeAdmin(params: {
	target: 'pinecone';
	pinecone: PurgePineconeParams;
}): Promise<PurgeResult>;
export async function purgeAdmin(params: {
	target: 'caches';
	caches: PurgeCachesParams;
}): Promise<PurgeResult>;
export async function purgeAdmin(
	params:
		| { target: 'pinecone'; pinecone: PurgePineconeParams }
		| { target: 'caches'; caches: PurgeCachesParams }
): Promise<PurgeResult> {
	if (params.target === 'pinecone') {
		const { apiKey, indexName, namespace } = params.pinecone ?? ({} as PurgePineconeParams);

		if (!isNonEmptyString(apiKey)) {
			return {
				ok: false,
				target: 'pinecone',
				error: { code: 'MISSING_PARAM', message: 'Missing pinecone.apiKey' },
			};
		}
		if (!isNonEmptyString(indexName)) {
			return {
				ok: false,
				target: 'pinecone',
				error: { code: 'MISSING_PARAM', message: 'Missing pinecone.indexName' },
			};
		}
		if (!isNonEmptyString(namespace)) {
			return {
				ok: false,
				target: 'pinecone',
				error: { code: 'MISSING_PARAM', message: 'Missing pinecone.namespace' },
			};
		}

		try {
			const result = await purgePineconeNamespace({ apiKey, indexName, namespace });
			return { ok: true, target: 'pinecone', purgedNamespace: result.purgedNamespace };
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Unknown error';
			return {
				ok: false,
				target: 'pinecone',
				error: { code: 'PINECONE_PURGE_FAILED', message: msg },
			};
		}
	}

	// target === 'caches'
	const scope = params.caches?.scope as unknown;

	if (!isValidScope(scope)) {
		return {
			ok: false,
			target: 'caches',
			error: {
				code: 'INVALID_SCOPE',
				message:
					'Invalid scope. Allowed: all | retrieval | retriever | embeddings | answer',
			},
		};
	}

	purgeRagCaches(scope);
	const stats = getRagCacheStats();

	return { ok: true, target: 'caches', purged: scope, stats };
}

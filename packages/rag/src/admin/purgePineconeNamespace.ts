// packages/rag/src/admin/purgePineconeNamespace.ts

import { Pinecone } from '@pinecone-database/pinecone';

export type PurgePineconeNamespaceParams = {
	apiKey: string;
	indexName: string;
	namespace: string;
};

export type PurgePineconeNamespaceResult = {
	ok: true;
	purgedNamespace: string;
};

function assertSafeNamespace(namespace: string): void {
	if (!namespace || namespace === '__default__') {
		throw new Error(
			'Refusing to purge: set PINECONE_NAMESPACE to a non-default value (e.g. dev).'
		);
	}
}

export async function purgePineconeNamespace(
	params: PurgePineconeNamespaceParams
): Promise<PurgePineconeNamespaceResult> {
	const { apiKey, indexName, namespace } = params;

	if (!apiKey || !indexName) {
		throw new Error('Missing required params: apiKey, indexName');
	}

	assertSafeNamespace(namespace);

	const pinecone = new Pinecone({ apiKey });
	const index = pinecone.index(indexName);

	await index.namespace(namespace).deleteAll();

	return { ok: true, purgedNamespace: namespace };
}

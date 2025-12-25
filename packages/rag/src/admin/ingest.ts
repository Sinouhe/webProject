import type { RagConfig } from '../types';
import { ingestUrls } from '../ingest/ingestUrls';

export type IngestErrorCode = 'MISSING_PARAM' | 'INVALID_PARAM' | 'INGEST_FAILED';

export type IngestError = {
	code: IngestErrorCode;
	message: string;
};

export type IngestAdminParams = {
	config: RagConfig;
	urls: string[];
	maxPages?: number;
	maxChunks?: number;
	dryRun?: boolean;
};

export type IngestAdminResult =
	| {
			ok: true;
			result: Awaited<ReturnType<typeof ingestUrls>>;
	  }
	| {
			ok: false;
			error: IngestError;
	  };

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0;
}

function isPositiveInt(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v) && v > 0 && Number.isInteger(v);
}

export async function ingestAdmin(params: IngestAdminParams): Promise<IngestAdminResult> {
	const { config, urls, maxPages, maxChunks, dryRun } = params;

	if (!config) {
		return { ok: false, error: { code: 'MISSING_PARAM', message: 'Missing config' } };
	}

	if (!isNonEmptyString(config.openAiApiKey)) {
		return {
			ok: false,
			error: { code: 'MISSING_PARAM', message: 'Missing config.openAiApiKey' },
		};
	}
	if (!isNonEmptyString(config.pineconeApiKey)) {
		return {
			ok: false,
			error: { code: 'MISSING_PARAM', message: 'Missing config.pineconeApiKey' },
		};
	}
	if (!isNonEmptyString(config.pineconeIndex)) {
		return {
			ok: false,
			error: { code: 'MISSING_PARAM', message: 'Missing config.pineconeIndex' },
		};
	}
	if (!isNonEmptyString(config.pineconeNamespace)) {
		return {
			ok: false,
			error: {
				code: 'MISSING_PARAM',
				message:
					'Refusing to ingest: config.pineconeNamespace is empty. Set it explicitly (e.g. dev).',
			},
		};
	}

	if (!Array.isArray(urls) || urls.length === 0) {
		return { ok: false, error: { code: 'MISSING_PARAM', message: 'No URLs provided' } };
	}

	if (maxPages !== undefined && !isPositiveInt(maxPages)) {
		return {
			ok: false,
			error: { code: 'INVALID_PARAM', message: 'maxPages must be a positive integer' },
		};
	}

	if (maxChunks !== undefined && !isPositiveInt(maxChunks)) {
		return {
			ok: false,
			error: { code: 'INVALID_PARAM', message: 'maxChunks must be a positive integer' },
		};
	}

	try {
		const result = await ingestUrls({
			config,
			urls,
			maxPages,
			maxChunks,
			dryRun,
		});

		return { ok: true, result };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return { ok: false, error: { code: 'INGEST_FAILED', message: msg } };
	}
}

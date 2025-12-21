export type CrawlTarget = {
  url: string;
};

export type ChunkingConfig = {
  chunkSize: number; // default 500
  chunkOverlap: number; // default 100
};

export type IngestConfig = {
  indexName: string;
  namespace?: string;
};

export type IngestStats = {
  pagesFetched: number;
  chunksCreated: number;
  chunksUpserted: number;
};

import type { Document } from "@langchain/core/documents";

/**
 * Configuration required by the RAG package.
 * IMPORTANT:
 * - This package does NOT call dotenv.
 * - The caller (CLI / NestJS) is responsible for loading env vars.
 */
export type RagConfig = {
  openAiApiKey: string;
  pineconeApiKey: string; // optional because Pinecone client can read from env, but we keep it explicit for clarity.
  pineconeIndex: string;
  pineconeNamespace?: string;
  embeddingModel?: string; // default: text-embedding-3-small
  chatModel?: string; // default: cheap OpenAI chat model
  topK?: number; // default: 6
};

export type RetrievedChunk = {
  id?: string;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type RagAnswer = {
  answer: string;
  sources: string[]; // human-readable sources
  chunks: RetrievedChunk[]; // debug-friendly retrieval
};

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  sources: string[];
  contextText: string; // formatted context to inject in prompt
};

export type IngestInputDocument = {
  pageContent: string;
  metadata?: Record<string, unknown>;
};

export type IngestResult = {
  upsertedChunks: number;
};

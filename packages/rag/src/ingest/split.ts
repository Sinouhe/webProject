import type { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { ChunkingConfig } from "./types";

/**
 * Split documents into chunks.
 * Keep it deterministic and configurable.
 */
export async function splitDocuments(docs: Document[], cfg: ChunkingConfig): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: cfg.chunkSize,
    chunkOverlap: cfg.chunkOverlap,
  });

  return splitter.splitDocuments(docs);
}

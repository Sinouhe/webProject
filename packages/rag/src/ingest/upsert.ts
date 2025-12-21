import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import type { Document } from "@langchain/core/documents";
import type { RagConfig } from "../types";

/**
 * Upsert documents into Pinecone with OpenAI embeddings.
 */
export async function upsertDocuments(params: {
  config: RagConfig;
  docs: Document[];
}): Promise<number> {
  const { config, docs } = params;

  const embeddings = new OpenAIEmbeddings({
    apiKey: config.openAiApiKey,
    model: config.embeddingModel ?? "text-embedding-3-small",
  });

  const pinecone = new Pinecone({ apiKey: config.pineconeApiKey });
  const index = pinecone.index(config.pineconeIndex);

  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
    namespace: config.pineconeNamespace,
  });

  return docs.length;
}

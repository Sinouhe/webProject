import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

async function main() {
  const apiKey = process.env.PINECONE_API_KEY ?? "";
  const indexName = process.env.PINECONE_INDEX ?? "";
  const namespace = process.env.PINECONE_NAMESPACE ?? "";

  if (!apiKey || !indexName) {
    throw new Error("Missing env vars: PINECONE_API_KEY, PINECONE_INDEX");
  }
  if (!namespace || namespace === "__default__") {
    throw new Error("Refusing to purge: set PINECONE_NAMESPACE to a non-default value (e.g. dev).");
  }

  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.index(indexName);

  await index.namespace(namespace).deleteAll();

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, purgedNamespace: namespace }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

import { request } from "undici";

/**
 * Fetch raw HTML from a URL with basic timeouts.
 */
export async function fetchHtml(url: string): Promise<string> {
  const res = await request(url, {
    method: "GET",
    headers: {
      "user-agent": "rag-cv-bot/1.0",
      accept: "text/html,*/*",
    },
    bodyTimeout: 20_000,
    headersTimeout: 20_000,
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`Fetch failed: ${res.statusCode} ${url}`);
  }

  return await res.body.text();
}

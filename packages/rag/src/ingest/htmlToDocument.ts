import * as cheerio from "cheerio";
import { Document } from "@langchain/core/documents";

export type HtmlToDocumentInput = {
  url: string;
  html: string;
};

export function htmlToDocument(input: HtmlToDocumentInput): Document {
  const $ = cheerio.load(input.html);

  // Remove junk that pollutes embeddings
  $("script, style, noscript, svg, canvas, iframe").remove();

  const title = $("title").first().text().trim() || input.url;
  const text = $("body").text().replace(/\s+/g, " ").trim();

  return new Document({
    pageContent: text,
    metadata: {
      source: input.url,
      url: input.url,
      title,
    },
  });
}

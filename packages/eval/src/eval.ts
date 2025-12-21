import dataset from "./dataset.json" assert { type: "json" };
import { z } from "zod";
import { writeFile } from "node:fs/promises";

const EnvSchema = z.object({
  API_URL: z.string().url().default("http://localhost:3001"),
});

type Case = {
  id: string;
  question: string;
  expectedMustIncludeAny: string[];
  expectCitationsMin: number;
  expectIdk: boolean;
};

type ApiResponse = {
  answer: string;
  citations: string[];
};

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

async function callChat(
  apiUrl: string,
  question: string
): Promise<ApiResponse> {
  const res = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} calling /chat. Body: ${body}`);
  }

  const json = (await res.json()) as ApiResponse;
  return {
    answer: json.answer ?? "",
    citations: Array.isArray(json.citations) ? json.citations : [],
  };
}

function evaluateCase(c: Case, resp: ApiResponse) {
  const answer = normalizeText(resp.answer);

  const isIdk = answer === "i don't know." || answer === "i don't know";
  const citationsOk = resp.citations.length >= c.expectCitationsMin;

  const mustIncludeOk =
    c.expectedMustIncludeAny.length === 0 ||
    c.expectedMustIncludeAny.some((needle) =>
      answer.includes(normalizeText(needle))
    );

  const idkOk = c.expectIdk ? isIdk : !isIdk;

  const pass = citationsOk && mustIncludeOk && idkOk;

  return {
    id: c.id,
    question: c.question,
    pass,
    checks: {
      idkOk,
      citationsOk,
      mustIncludeOk,
    },
    response: resp,
  };
}

async function main() {
  const env = EnvSchema.parse({
    API_URL: process.env.API_URL,
  });

  const cases = dataset as Case[];

  const results = [];
  for (const c of cases) {
    const resp = await callChat(env.API_URL, c.question);
    results.push(evaluateCase(c, resp));
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  const report = {
    apiUrl: env.API_URL,
    summary: {
      passed,
      total,
      passRate: total === 0 ? 0 : Math.round((passed / total) * 100),
    },
    results,
  };

  // Console report
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report.summary, null, 2));

  // Persist full report
  await writeFile("eval-report.json", JSON.stringify(report, null, 2), "utf-8");
  // eslint-disable-next-line no-console
  console.log("Wrote eval-report.json");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

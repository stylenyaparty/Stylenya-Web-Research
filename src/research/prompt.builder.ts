export type Evidence = {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  publishedAt: string | null;
  query: string;
};

export type ResearchPromptInput = {
  prompt: string;
  mode: "quick" | "deep";
  market: string;
  language: string;
  topic?: "seasonal" | "product" | "supplier" | "general";
  evidence: Evidence[];
};

export function buildResearchPrompt(input: ResearchPromptInput): string {
  const maxRows = input.mode === "deep" ? 25 : 12;
  const maxClusters = input.mode === "deep" ? 7 : 4;

  const evidencePayload = input.evidence.map((e) => ({
    url: e.url,
    domain: e.domain,
    title: e.title,
    snippet: e.snippet,
    publishedAt: e.publishedAt,
    query: e.query,
  }));

  return `
You are an analytical research engine for party decorations.

Rules:
- Use ONLY the provided evidence.
- Do NOT invent search volume or external metrics.
- Output strictly valid JSON only. No markdown. No extra text.
- Keep clusters actionable for an e-commerce seller.
- Prefer long-tail (3–6 words) and product-adjacent phrases. Avoid single adjectives.
- Avoid single-word or overly generic terms (e.g., “textures”, “blush pink” alone).
- Ensure each cluster has 3–7 keywords (deep) or 2–5 (quick).
- Order keywords within each cluster by strongest evidence/mentions.

Context:
- Prompt: ${input.prompt}
- Topic: ${input.topic ?? "general"}
- Market: ${input.market}
- Language: ${input.language}
- Mode: ${input.mode}

Evidence (JSON):
${JSON.stringify(evidencePayload)}

Task:
1) Extract keyword candidates relevant to party decorations and the prompt.
2) Normalize keywords (lowercase, trimmed), deduplicate.
3) Cluster into semantic groups (${input.mode === "deep" ? "3–7" : "2–4"} clusters).
4) Intent per keyword: buying|inspiration|diy|informational|supplier.
5) mentions: count approximate occurrences across evidence titles/snippets.
6) recencyScore: 0..1 (recent higher; unknown=0.5).
7) researchScore: 0..1 combining mentions + recencyScore (no external stats).
8) For each cluster, propose 1–3 actions (P0/P1/P2).
9) Attach topEvidence per row and per cluster (max 2 each).
10) Set researchScore to 0 (placeholder). Backend will compute the final score.

Output JSON ONLY in this exact shape:
{
  "rows": [
    {
      "rowId": "string",
      "cluster": "string",
      "keyword": "string",
      "intent": "buying|inspiration|diy|informational|supplier",
      "mentions": number,
      "recencyScore": number,
      "researchScore": number,
      "sourcesCount": number,
      "domainsCount": number,
      "topEvidence": [
        { "url": "string", "title": "string", "snippet": "string", "publishedAt": "YYYY-MM-DD|null" }
      ]
    }
  ],
  "clusterBundles": [
    {
      "cluster": "string",
      "topKeywords": ["string"],
      "recommendedActions": [
        { "title": "string", "priority": "P0|P1|P2" }
      ],
      "topEvidence": [
        { "url": "string", "title": "string" }
      ]
    }
  ]
}

Constraints:
- rows length <= ${maxRows}
- clusterBundles length <= ${maxClusters}
- topKeywords per cluster <= 5
`.trim();
}
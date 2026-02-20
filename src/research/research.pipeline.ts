import { tavilySearch } from "../providers/tavily.client.js";
import { getOpenAIClient } from "../providers/openai.client.js";
import { buildResearchPrompt } from "./prompt.builder.js";
import type { ResearchPromptInput } from "./prompt.builder.js";
import { scoreAndSortRows } from "./scoring.js";
import { addClusterRank } from "./ranking.js";
import { researchOutputSchema } from "./research.output.schema.js";

type EvidenceItem = {
    url: string;
    title: string;
    snippet: string;
    publishedAt: string | null;
    capturedAt: string;
    domain: string;
    query: string;
};

function truncate(s: string, max = 500) {
    const clean = (s ?? "").replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function capEvidenceByDomain<T extends { domain: string }>(
    items: T[],
    maxTotal: number,
    maxPerDomain: number
) {
    const byDomain = new Map<string, T[]>();
    for (const it of items) {
        const arr = byDomain.get(it.domain) ?? [];
        arr.push(it);
        byDomain.set(it.domain, arr);
    }

    const domains = Array.from(byDomain.keys());
    const out: T[] = [];
    let i = 0;

    while (out.length < maxTotal && domains.length > 0) {
        const idx = i % domains.length;
        const d = domains[idx]!;
        const arr = byDomain.get(d)!;

        const usedForDomain = out.filter((x) => x.domain === d).length;
        if (usedForDomain >= maxPerDomain || arr.length === 0) {
            domains.splice(idx, 1);
            if (domains.length === 0) break;
            continue;
        }

        out.push(arr.shift()!);
        i++;
    }

    return out;
}

function buildResultBundle(json: any, prompt: string) {
    const topClusters = (json.clusterBundles ?? []).slice(0, 3);

    const title = `Web Research: ${prompt}`;

    const summary = topClusters
        .map(
            (c: any) =>
                `• ${c.cluster}: ${(c.topKeywords ?? []).slice(0, 3).join(", ")}`
        )
        .join("\n");

    const nextSteps = topClusters
        .flatMap((c: any) => (c.recommendedActions ?? []).map((a: any) => a.title))
        .slice(0, 5);

    const sources = topClusters
        .flatMap((c: any) => c.topEvidence ?? [])
        .slice(0, 5)
        .map((e: any) => ({
            url: e.url,
            title: e.title,
        }));

    return {
        title,
        summary,
        nextSteps,
        sources,
    };
}

export type WebResearchInput = {
    prompt: string;
    mode: "quick" | "deep";
    market: string;
    language?: string | undefined;
    topic?: "seasonal" | "product" | "supplier" | "general" | undefined;
};

async function callLLMJson(prompt: string, temperature: number) {
    const client = getOpenAIClient();

    const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: [{ role: "user", content: prompt }],
        temperature,
    });

    return String((resp as any).output_text ?? "").trim();
}

export async function runResearchPipeline(input: WebResearchInput) {
    const nowIso = new Date().toISOString();

    const plan =
        input.mode === "deep"
            ? { maxResultsPerQuery: 6, searchDepth: "advanced" as const }
            : { maxResultsPerQuery: 5, searchDepth: "basic" as const };

    const base = input.prompt.trim();

    const queries =
        input.mode === "deep"
            ? [
                `${base} party decorations trends themes 2026 ${input.market}`,
                `${base} party decor best sellers Etsy keywords ${input.market}`,
            ]
            : [`${base} party decorations trends ${input.market}`];

    const allResults = await Promise.all(
        queries.map((q) =>
            tavilySearch({
                query: q,
                maxResults: plan.maxResultsPerQuery,
                searchDepth: plan.searchDepth,
            })
        )
    );

    const evidence: EvidenceItem[] = [];
    for (let i = 0; i < queries.length; i++) {
        const q = queries[i]!;
        for (const r of allResults[i] ?? []) {
            try {
                const u = new URL(r.url);
                evidence.push({
                    url: r.url,
                    title: truncate(r.title ?? u.hostname, 140),
                    snippet: truncate(r.content ?? "", 500),
                    publishedAt: r.published_date ?? null,
                    capturedAt: nowIso,
                    domain: u.hostname,
                    query: q,
                });
            } catch {
                // ignore invalid URLs
            }
        }
    }

    // CAPPING: reduce costo/ruido
    const evidenceCap = input.mode === "deep" ? 25 : 10;
    const evidenceCapped = capEvidenceByDomain(evidence, evidenceCap, 3);

    const language = input.language ?? "en";
    const promptInput: ResearchPromptInput = {
        prompt: input.prompt,
        mode: input.mode,
        market: input.market,
        language,
        ...(input.topic !== undefined ? { topic: input.topic } : {}),
        evidence: evidenceCapped.map((e) => ({
            url: e.url,
            domain: e.domain,
            title: e.title,
            snippet: e.snippet,
            publishedAt: e.publishedAt,
            query: e.query,
        })),
    };

    const prompt = buildResearchPrompt(promptInput) ?? "";
    const baseTemp = input.mode === "deep" ? 0.15 : 0.2;

    const tryParse = (raw: string) => {
        try {
            const obj = JSON.parse(raw);
            const parsed = researchOutputSchema.safeParse(obj);
            if (!parsed.success)
                return { ok: false as const, error: parsed.error, obj: null };
            return { ok: true as const, obj: parsed.data };
        } catch (e) {
            return { ok: false as const, error: e, obj: null };
        }
    };

    // 1st attempt
    const raw1 = await callLLMJson(prompt, baseTemp);
    const p1 = tryParse(raw1);

    if (p1.ok) {
        const json: any = p1.obj;
        json.rows = scoreAndSortRows(json.rows);
        json.rows = addClusterRank(json.rows);
        json.resultBundle = buildResultBundle(json, input.prompt);
        return json;
    }

    // Retry 1 vez (repair) — NO Tavily, solo re-formateo
    const repairPrompt =
        prompt +
        "\n\nIMPORTANT: Your previous output was invalid. Return ONLY valid JSON matching the exact schema. Do not include any extra text.";

    const raw2 = await callLLMJson(repairPrompt, 0);
    const p2 = tryParse(raw2);

    if (p2.ok) {
        const json: any = p2.obj;
        json.rows = scoreAndSortRows(json.rows);
        json.rows = addClusterRank(json.rows);
        json.resultBundle = buildResultBundle(json, input.prompt);
        return json;
    }

    console.error(
        "LLM invalid output after retry (first 300 chars):",
        raw2.slice(0, 300)
    );
    return { rows: [], clusterBundles: [] };
}
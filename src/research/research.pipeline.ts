import { tavilySearch } from "../providers/tavily.client.js";
import { Chat } from "@genkit-ai/ai";
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

// Adaptación: Usar Genkit Chat en vez de cliente OpenAI
async function callLLMJson(_client: any, prompt: string, temperature: number) {
    // NOTA: Esta implementación asume que Chat puede ser instanciado y usado así. Ajusta según la documentación de Genkit si es necesario.
    const chat = new Chat();
    const resp = await chat.send({
        messages: [{ role: "user", content: prompt }],
        temperature,
        // Puedes agregar más opciones según la API de Genkit
    });
    // Ajusta el acceso al texto según la respuesta real de Genkit
    return String((resp?.output_text ?? resp?.text ?? resp?.content ?? "")).trim();
}
function truncate(s: string, max = 500) {
    const clean = (s ?? "").replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function buildResultBundle(json: any, prompt: string) {
    const topClusters = (json.clusterBundles ?? []).slice(0, 3);

    const title = `Web Research: ${prompt}`;

    const summary = topClusters
        .map((c: any) =>
            `• ${c.cluster}: ${(c.topKeywords ?? []).slice(0, 3).join(", ")}`
        )
        .join("\n");

    const nextSteps = topClusters
        .flatMap((c: any) =>
            (c.recommendedActions ?? []).map((a: any) => a.title)
        )
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

export type ResearchPipelineInput = {
    prompt: string;
    mode: "quick" | "deep";
    market: string;
    language?: string;
    topic?: "seasonal" | "product" | "supplier" | "general";
};
export async function runResearchPipeline(
    input: ResearchPipelineInput
) {
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

    // ✅ CAPPING: define aquí, antes de usar evidenceCapped
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

    // const client = getOpenAIClient(); // Ya no se usa, ahora se usa Genkit Chat

    const baseTemp = input.mode === "deep" ? 0.15 : 0.2;

    const raw1 = await callLLMJson(client, prompt, baseTemp);

    const tryParse = (raw: string) => {
        try {
            const obj = JSON.parse(raw);
            const parsed = researchOutputSchema.safeParse(obj);
            if (!parsed.success) return { ok: false as const, error: parsed.error, obj: null };
            return { ok: true as const, obj: parsed.data };
        } catch (e) {
            return { ok: false as const, error: e, obj: null };
        }
    };

    const p1 = tryParse(raw1);
    if (p1.ok) {
        return p1.obj;
    }

    // Retry 1 vez (repair) — NO Tavily, solo re-formateo
    const repairPrompt =
        prompt +
        "\n\nIMPORTANT: Your previous output was invalid. Return ONLY valid JSON matching the exact schema. Do not include any extra text.";

    const raw2 = await callLLMJson(client, repairPrompt, 0); // temp 0 para máximo determinismo
    const p2 = tryParse(raw2);

    if (p2.ok) {
        return p2.obj;
    }

    console.error("LLM invalid output after retry (first 300 chars):", raw2.slice(0, 300));
    return { rows: [], clusterBundles: [] };

    const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
            {
                role: "user",
                content: prompt,
            },
        ],
        temperature: input.mode === "deep" ? 0.15 : 0.2,
    });

    const text = (resp.output_text ?? "").trim();

    let json: any;
    try {
        json = JSON.parse(text);
    } catch {
        console.error("LLM returned non-JSON output (first 300 chars):", text.slice(0, 300));
        return { rows: [], clusterBundles: [] };
    }

    if (!json || !Array.isArray(json.rows) || !Array.isArray(json.clusterBundles)) {
        return { rows: [], clusterBundles: [] };
    }

    json.rows = scoreAndSortRows(json.rows);
    json.rows = addClusterRank(json.rows);
    json.resultBundle = buildResultBundle(json, input.prompt);
    return json;
}
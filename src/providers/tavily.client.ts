type TavilySearchOptions = {
    query: string;
    maxResults: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    searchDepth?: "basic" | "advanced";
};

export type TavilyResult = {
    url: string;
    title?: string;
    content?: string; // tavily suele devolver "content" como snippet/summary corto
    score?: number;
    published_date?: string;
};

export async function tavilySearch(opts: TavilySearchOptions): Promise<TavilyResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("Missing TAVILY_API_KEY in environment.");

    const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            query: opts.query,
            max_results: opts.maxResults,
            search_depth: opts.searchDepth ?? "basic",
            include_domains: opts.includeDomains,
            exclude_domains: opts.excludeDomains,
            include_answer: false,
            include_raw_content: false,
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Tavily search failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { results?: TavilyResult[] };
    return data.results ?? [];
}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../src/db/prisma.js";

type Scenario = "happy" | "timeout" | "rateLimitThenSuccess" | "rateLimitAlways";

const mockState = vi.hoisted(() => ({
  tavilyFetchCalls: 0,
  openAiCalls: 0,
  llm429FailuresLeft: 0,
  scenario: "happy" as Scenario,
}));

function deterministicLlmJson() {
  return JSON.stringify({
    rows: [
      {
        rowId: "row-1",
        cluster: "Pastel",
        keyword: "pastel birthday banner",
        intent: "buying",
        mentions: 8,
        recencyScore: 0.8,
        researchScore: 0.9,
        sourcesCount: 2,
        domainsCount: 2,
        topEvidence: [
          {
            url: "https://example.com/decor-a",
            title: "Decor A",
            snippet: "Decor A snippet",
            publishedAt: "2026-01-10",
          },
          {
            url: "https://example.org/decor-b",
            title: "Decor B",
            snippet: "Decor B snippet",
            publishedAt: "2026-01-11",
          },
        ],
      },
      {
        rowId: "row-2",
        cluster: "Neon",
        keyword: "neon party decor kit",
        intent: "inspiration",
        mentions: 5,
        recencyScore: 0.7,
        researchScore: 0.84,
        sourcesCount: 2,
        domainsCount: 2,
        topEvidence: [
          {
            url: "https://example.com/decor-a",
            title: "Decor A",
            snippet: "Decor A snippet",
            publishedAt: "2026-01-10",
          },
        ],
      },
    ],
    clusterBundles: [],
    resultBundle: {
      title: "Mocked result",
      summary: "Mocked summary",
      nextSteps: ["Ship SEO set"],
      sources: [{ url: "https://example.com/decor-a", title: "Decor A" }],
    },
  });
}

vi.mock("openai", () => {
  return {
    default: class OpenAIMock {
      responses = {
        create: async () => {
          mockState.openAiCalls += 1;

          if (mockState.scenario === "timeout") {
            return await new Promise(() => undefined);
          }

          if (mockState.scenario === "rateLimitAlways") {
            throw {
              name: "RateLimitError",
              message: "rate limited",
              status: 429,
              code: "rate_limit_exceeded",
            };
          }

          if (mockState.scenario === "rateLimitThenSuccess" && mockState.llm429FailuresLeft > 0) {
            mockState.llm429FailuresLeft -= 1;
            throw {
              name: "RateLimitError",
              message: "rate limited",
              status: 429,
              code: "rate_limit_exceeded",
            };
          }

          return { output_text: deterministicLlmJson() };
        },
      };
    },
  };
});

const { buildApp } = await import("../../src/app.js");

describe("web research integration", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    mockState.tavilyFetchCalls = 0;
    mockState.openAiCalls = 0;
    mockState.llm429FailuresLeft = 0;
    mockState.scenario = "happy";

    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.TAVILY_API_KEY = "test-tavily-key";
    process.env.OPENAI_RETRY_BASE_MS = "1";
    process.env.OPENAI_RETRY_MAX_MS = "5";
    process.env.OPENAI_RETRY_MAX = "2";
    process.env.RESEARCH_TIMEOUT_MS_QUICK = "500";
    process.env.TAVILY_CACHE_ENABLED = "false";
    process.env.TAVILY_CACHE_TTL_MS = "3600000";

    global.fetch = vi.fn(async () => {
      mockState.tavilyFetchCalls += 1;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            results: [
              {
                url: "https://example.com/decor-a",
                title: "Decor A",
                content: "Decor A content",
                published_date: "2026-01-10",
              },
              {
                url: "https://example.org/decor-b",
                title: "Decor B",
                content: "Decor B content",
                published_date: "2026-01-11",
              },
            ],
          }),
      } as unknown as Response;
    }) as typeof fetch;

    app = buildApp();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it("happy path persists run, rows, clusters, and evidence", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/research/web",
      payload: { query: "birthday decor", mode: "quick", market: "US" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("SUCCESS");

    const runResponse = await app.inject({ method: "GET", url: `/v1/research/runs/${body.runId}` });
    expect(runResponse.statusCode).toBe(200);

    const runBody = runResponse.json();
    expect(runBody.status).toBe("SUCCESS");
    expect(runBody.rows.length).toBeGreaterThan(0);
    expect(runBody.clusters.length).toBeGreaterThan(0);

    expect(await prisma.webResearchRun.count()).toBe(1);
    expect(await prisma.researchRow.count()).toBe(2);
    expect(await prisma.researchCluster.count()).toBe(2);
    expect(await prisma.researchEvidence.count()).toBe(3);
  });

  it("returns FAILED with timeout metadata when LLM hangs", async () => {
    mockState.scenario = "timeout";
    process.env.RESEARCH_TIMEOUT_MS_QUICK = "50";

    const response = await app.inject({
      method: "POST",
      url: "/v1/research/web",
      payload: { query: "birthday decor", mode: "quick", market: "US" },
    });

    expect(response.statusCode).toBe(504);
    const body = response.json();
    expect(body.status).toBe("FAILED");
    expect(body.error.timeout).toBe(true);

    const run = await prisma.webResearchRun.findUniqueOrThrow({ where: { id: body.runId } });
    expect(run.status).toBe("FAILED");
    expect((run.errorJson as any)?.timeout).toBe(true);
  });

  it("retries on 429 and succeeds", async () => {
    mockState.scenario = "rateLimitThenSuccess";
    mockState.llm429FailuresLeft = 2;

    const response = await app.inject({
      method: "POST",
      url: "/v1/research/web",
      payload: { query: "birthday decor", mode: "quick", market: "US" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("SUCCESS");
    expect(mockState.openAiCalls).toBe(3);
  });

  it("fails when 429 keeps happening", async () => {
    mockState.scenario = "rateLimitAlways";

    const response = await app.inject({
      method: "POST",
      url: "/v1/research/web",
      payload: { query: "birthday decor", mode: "quick", market: "US" },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.status).toBe("FAILED");
    expect(body.error.isRateLimit).toBe(true);

    const run = await prisma.webResearchRun.findUniqueOrThrow({ where: { id: body.runId } });
    expect(run.status).toBe("FAILED");
    expect((run.errorJson as any)?.isRateLimit).toBe(true);
  });

  it("uses Tavily cache on repeated query", async () => {
    process.env.TAVILY_CACHE_ENABLED = "true";
    process.env.TAVILY_CACHE_TTL_MS = "3600000";

    const payload = { query: "birthday decor", mode: "quick", market: "US" };

    const first = await app.inject({ method: "POST", url: "/v1/research/web", payload });
    const second = await app.inject({ method: "POST", url: "/v1/research/web", payload });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(mockState.tavilyFetchCalls).toBe(1);

    const secondRun = await prisma.webResearchRun.findUniqueOrThrow({ where: { id: second.json().runId } });
    expect((secondRun.timingsMs as any)?.tavilyCacheHit).toBe(true);
  });
});

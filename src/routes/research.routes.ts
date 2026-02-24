import type { FastifyInstance } from "fastify";
import { runResearchPipeline } from "../research/research.pipeline.js";
import { persistClusters, persistRowsAndEvidence } from "../services/research.persist.service.js";
import {
    createRunRunning,
    finalizeRunFailed,
    finalizeRunSuccess,
} from "../services/research.run.service.js";
import { getResearchRun } from "../services/research.service.js";

export async function researchRoutes(app: FastifyInstance) {
    app.post("/v1/research/web", async (request, reply) => {
        const requestStartedAt = Date.now();
        const body = request.body as {
            query?: string;
            mode?: "quick" | "deep";
            locale?: string;
            geo?: string;
            language?: string;
            market?: string;
            topic?: "seasonal" | "product" | "supplier" | "general";
        };

        if (!body?.query || !body.query.trim()) {
            return reply.status(400).send({ error: "query is required" });
        }

        const run = await createRunRunning({
            query: body.query,
            ...(body.mode ? { mode: body.mode } : {}),
            ...(body.locale ? { locale: body.locale } : {}),
            ...(body.geo ? { geo: body.geo } : {}),
            ...(body.language ? { language: body.language } : {}),
        });

        const timingsMs: Record<string, number> = {};

        try {
            const pipelineStartedAt = Date.now();
            const pipelineResult = await runResearchPipeline({
                prompt: body.query,
                mode: body.mode ?? "quick",
                market: body.market ?? body.locale ?? body.geo ?? "global",
                language: body.language,
                topic: body.topic,
            });
            timingsMs.pipeline = Date.now() - pipelineStartedAt;

            if (pipelineResult?.timingsMs && typeof pipelineResult.timingsMs === "object") {
                const extraTimings = pipelineResult.timingsMs as Record<string, number>;
                if (typeof extraTimings.tavily === "number") timingsMs.tavily = extraTimings.tavily;
                if (typeof extraTimings.llm === "number") timingsMs.llm = extraTimings.llm;
                if (typeof extraTimings.scoring === "number") timingsMs.scoring = extraTimings.scoring;
            }

            const rows = Array.isArray(pipelineResult?.rows) ? pipelineResult.rows : [];
            const clusterBundles = Array.isArray(pipelineResult?.clusterBundles)
                ? pipelineResult.clusterBundles
                : undefined;

            const persistStartedAt = Date.now();
            await persistRowsAndEvidence(run.id, rows);
            await persistClusters(run.id, clusterBundles, rows);
            timingsMs.persist = Date.now() - persistStartedAt;

            timingsMs.total = Date.now() - requestStartedAt;

            await finalizeRunSuccess(run.id, {
                timingsMs,
                resultJson: pipelineResult,
            });

            return {
                runId: run.id,
                status: "SUCCESS",
                timingsMs,
            };
        } catch (error) {
            timingsMs.total = Date.now() - requestStartedAt;

            const err = error as Error;
            const errorJson = {
                name: err?.name ?? "Error",
                message: err?.message ?? "Unexpected research pipeline error",
                stackTop: typeof err?.stack === "string" ? err.stack.split("\n").slice(0, 5).join("\n") : null,
            };

            await finalizeRunFailed(run.id, {
                timingsMs,
                errorJson,
            });

            request.log.error(
                {
                    runId: run.id,
                    error: errorJson,
                },
                "web research pipeline failed"
            );

            return reply.status(500).send({
                runId: run.id,
                status: "FAILED",
                error: errorJson,
            });
        }
    });

    app.get("/v1/research/runs/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const run = await getResearchRun(id);

        if (!run) {
            return reply.status(404).send({ error: "Run not found" });
        }

        return { ...run, clusters: run.clusters ?? [], rows: run.rows ?? [] };
    });
}

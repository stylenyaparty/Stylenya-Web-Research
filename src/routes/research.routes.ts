import type { FastifyInstance } from "fastify";
import { runResearchPipeline } from "../research/research.pipeline.js";
import { persistClusters, persistRowsAndEvidence } from "../services/research.persist.service.js";
import {
    createRunRunning,
    finalizeRunFailed,
    finalizeRunSuccess,
} from "../services/research.run.service.js";
import { getResearchRun } from "../services/research.service.js";

function getResearchTimeoutMs(mode: "quick" | "deep") {
    const quick = Number(process.env.RESEARCH_TIMEOUT_MS_QUICK ?? 90_000);
    const deep = Number(process.env.RESEARCH_TIMEOUT_MS_DEEP ?? 180_000);
    return mode === "deep" ? deep : quick;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, stage: "pipeline") {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject({
                name: "PipelineTimeoutError",
                message: `Research ${stage} timed out after ${timeoutMs}ms`,
                timeout: true,
                stage,
            });
        }, timeoutMs);

        promise
            .then((value) => resolve(value))
            .catch((error) => reject(error))
            .finally(() => clearTimeout(timer));
    });
}

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

        const mode = body.mode ?? "quick";
        const run = await createRunRunning({
            query: body.query,
            mode,
            ...(body.locale ? { locale: body.locale } : {}),
            ...(body.geo ? { geo: body.geo } : {}),
            ...(body.language ? { language: body.language } : {}),
        });

        const timingsMs: Record<string, number | boolean> = {};

        try {
            const timeoutMs = getResearchTimeoutMs(mode);
            const pipelineResult = await withTimeout(
                runResearchPipeline({
                    prompt: body.query,
                    mode,
                    market: body.market ?? body.locale ?? body.geo ?? "global",
                    language: body.language,
                    topic: body.topic,
                }),
                timeoutMs,
                "pipeline"
            );

            if (pipelineResult?.timingsMs && typeof pipelineResult.timingsMs === "object") {
                Object.assign(timingsMs, pipelineResult.timingsMs as Record<string, number | boolean>);
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
                timingsMs: timingsMs as Record<string, number>,
                resultJson: pipelineResult,
            });

            return {
                runId: run.id,
                status: "SUCCESS",
                timingsMs,
            };
        } catch (error) {
            timingsMs.total = Date.now() - requestStartedAt;

            const err = error as any;
            const statusCode = err?.timeout === true ? 504 : 500;
            const errorJson = {
                name: err?.name ?? "Error",
                message: err?.message ?? "Unexpected research pipeline error",
                ...(typeof err?.code === "string" ? { code: err.code } : {}),
                ...(typeof err?.status === "number" ? { status: err.status } : {}),
                ...(err?.isRateLimit === true ? { isRateLimit: true } : {}),
                ...(err?.timeout === true ? { timeout: true } : {}),
                ...(typeof err?.stage === "string" ? { stage: err.stage } : {}),
            };

            await finalizeRunFailed(run.id, {
                timingsMs: timingsMs as Record<string, number>,
                errorJson,
            });

            request.log.error(
                {
                    runId: run.id,
                    error: errorJson,
                },
                "web research pipeline failed"
            );

            return reply.status(statusCode).send({
                runId: run.id,
                status: "FAILED",
                error: errorJson,
                timingsMs,
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

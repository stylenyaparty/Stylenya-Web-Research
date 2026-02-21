import type { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma.js";
import {
    createResearchRun,
    getResearchRun,
    markRunSuccess,
} from "../services/research.service.js";

export async function researchRoutes(app: FastifyInstance) {
    app.post("/v1/research/web", async (request, reply) => {
        app.log.info(">>> NEW POST /v1/research/web handler ACTIVE <<<");

        const body = request.body as { query: string; mode?: "quick" | "deep" };

        if (!body?.query) {
            return reply.status(400).send({ error: "query is required" });
        }

        const run = await prisma.webResearchRun.create({
            data: {
                query: body.query,
                mode: body.mode ?? "quick",
                status: "RUNNING",
            },
        });

        await prisma.webResearchRun.update({
            where: { id: run.id },
            data: { status: "SUCCESS", timingsMs: { total: 1 } },
        });

        return { runId: run.id, status: "SUCCESS" };
    });

    app.get("/v1/research/runs/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const run = await getResearchRun(id);

        if (!run) {
            return reply.status(404).send({ error: "Run not found" });
        }

        return {
            ...run,
            clusters: run.clusters ?? [],
            rows: run.rows ?? [],
        };
    });
}
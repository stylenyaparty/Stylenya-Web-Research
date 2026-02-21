import { prisma } from "../db/prisma.js";

export async function createResearchRun(input: {
    query: string;
    mode?: "quick" | "deep";
    locale?: string;
    geo?: string;
    language?: string;
}) {
    const run = await prisma.webResearchRun.create({
        data: {
            query: input.query,
            mode: input.mode ?? "quick",
            status: "RUNNING",
            locale: input.locale ?? null,
            geo: input.geo ?? null,
            language: input.language ?? null,
        },
    });

    return run;
}

export async function markRunSuccess(runId: string, timingsMs?: any) {
    return prisma.webResearchRun.update({
        where: { id: runId },
        data: {
            status: "SUCCESS",
            timingsMs: timingsMs ?? undefined,
        },
    });
}

export async function getResearchRun(id: string) {
    return prisma.webResearchRun.findUnique({
        where: { id },
        include: {
            clusters: true,
            rows: true,
        },
    });
}
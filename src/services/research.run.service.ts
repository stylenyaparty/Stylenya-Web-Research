import { prisma } from "../db/prisma.js";

type CreateRunInput = {
    query: string;
    mode?: "quick" | "deep";
    locale?: string;
    geo?: string;
    language?: string;
};

export async function createRunRunning(input: CreateRunInput) {
    return prisma.webResearchRun.create({
        data: {
            query: input.query,
            mode: input.mode ?? "quick",
            locale: input.locale ?? null,
            geo: input.geo ?? null,
            language: input.language ?? null,
            status: "RUNNING",
        },
    });
}

export async function finalizeRunSuccess(
    runId: string,
    payload: { timingsMs: Record<string, number>; resultJson: unknown }
) {
    return prisma.webResearchRun.update({
        where: { id: runId },
        data: {
            status: "SUCCESS",
            timingsMs: payload.timingsMs,
            resultJson: payload.resultJson as any,
            errorJson: null,
        },
    });
}

export async function finalizeRunFailed(
    runId: string,
    payload: { timingsMs: Record<string, number>; errorJson: unknown }
) {
    return prisma.webResearchRun.update({
        where: { id: runId },
        data: {
            status: "FAILED",
            timingsMs: payload.timingsMs,
            errorJson: payload.errorJson as any,
        },
    });
}

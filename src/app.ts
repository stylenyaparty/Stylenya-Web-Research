import Fastify from "fastify";
import { runResearch } from "./research/research.controller.js";

export function buildApp() {
    const app = Fastify({ logger: true });

    app.get("/health", async () => {
        return { status: "ok" };
    });

    app.post("/research/run", runResearch);

    return app;
}
import { z } from "genkit";
import { ai } from "../index.js";
import { runResearchPipeline } from "../research/research.pipeline.js";

export const webResearchFlow = ai.defineFlow(
    {
        name: "webResearchFlow",
        inputSchema: z.object({
            prompt: z.string().min(1),
            mode: z.enum(["quick", "deep"]),
            market: z.string().min(1),
            language: z.string().optional(),
            topic: z.enum(["seasonal", "product", "supplier", "general"]).optional(),
        }),
        outputSchema: z.any(), // luego lo tipamos con tu schema real
    },
    async (input) => runResearchPipeline(input)
);
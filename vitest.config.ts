import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["test/setup.ts"],
    include: ["test/**/*.spec.ts"],
    testTimeout: 20_000,
  },
});

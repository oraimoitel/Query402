import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    exclude: [
      "src/providers/registry.test.ts",
      "src/lib/scrape-url-safety.test.ts",
      "src/services/query-service.test.ts"
    ]
  }
});

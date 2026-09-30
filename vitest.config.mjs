import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/application/**"],
      exclude: ["src/application/ports/**"],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});

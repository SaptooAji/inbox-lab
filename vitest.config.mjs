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
      include: [
        "src/domain/**",
        "src/application/**",
        "emails/build/**",
        "src/infrastructure/**",
        "src/presentation/**",
      ],
      exclude: [
        "src/application/ports/**",
        "src/application/send-policy.ts",
        "src/application/dto/**",
        "emails/build/cli.ts",
        "src/infrastructure/get-container.ts",
        "src/presentation/components/**",
        "src/infrastructure/get-template-services.ts",
      ],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@hair/ai": fileURLToPath(
        new URL("./packages/ai/src/index.ts", import.meta.url),
      ),
      "@hair/domain": fileURLToPath(
        new URL("./packages/domain/src/index.ts", import.meta.url),
      ),
      "@hair/service": fileURLToPath(
        new URL("./packages/service/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "tests/integration/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});

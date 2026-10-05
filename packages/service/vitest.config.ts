import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    alias: {
      "@hair/ai": fileURLToPath(
        new URL("../ai/src/index.ts", import.meta.url),
      ),
      "@hair/domain": fileURLToPath(
        new URL("../domain/src/index.ts", import.meta.url),
      ),
      "@hair/service": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
  },
});


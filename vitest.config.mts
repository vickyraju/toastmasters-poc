import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    // Component tests sign in, wait on the mock service delay and walk several steps.
    testTimeout: 15_000,
    setupFiles: ["./src/test/setup.ts"],
    env: { TZ: "UTC" },
  },
});

import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests/layout",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4178",
    browserName: "chromium",
    launchOptions: { executablePath },
    serviceWorkers: "block",
  },
  webServer: {
    command: "PORT=4178 BASE_PATH=/ pnpm run dev",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: false,
  },
});
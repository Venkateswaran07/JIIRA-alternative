import { spawnSync } from "node:child_process";

if (!process.env.E2E_BASE_URL) {
  console.log("Playwright browser tests skipped: set E2E_BASE_URL to run them.");
  process.exit(0);
}

const command = process.platform === "win32" ? "playwright.cmd" : "playwright";
const result = spawnSync(command, ["test"], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
process.exitCode = result.status ?? 1;

import { spawnSync } from "node:child_process";

const playwrightCli = new URL("../node_modules/@playwright/test/cli.js", import.meta.url);
const result = spawnSync(process.execPath, [playwrightCli.pathname.replace(/^\/([A-Z]:)/, "$1"), "test"], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;

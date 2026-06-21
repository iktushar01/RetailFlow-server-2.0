import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync("pnpm", ["exec", "tsx", "src/server.ts"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
  shell: true,
});

if (result.error) {
  console.error("Failed to start server:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

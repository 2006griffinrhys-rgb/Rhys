import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const hasEnv = existsSync(".env");
if (!hasEnv) {
  console.warn("No .env file found. App will run in demo mode unless env is provided.");
}

console.log("Running lint...");
run("npm", ["run", "lint"]);
console.log("Running typecheck...");
run("npm", ["run", "typecheck"]);

console.log("Preflight checks passed.");

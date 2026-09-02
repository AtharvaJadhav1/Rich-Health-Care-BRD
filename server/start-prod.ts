import "dotenv/config";
import { spawn } from "node:child_process";

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "production",
};

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const webPort = env.PORT ?? "43123";
const apiPort = env.API_PORT ?? "43124";

if (webPort === apiPort) {
  console.error("PORT (public website) and API_PORT (internal API) must be different.");
  process.exit(1);
}

function run(command: string, args: string[]) {
  const child = spawn(command, args, { stdio: "inherit", shell: true, env });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
  return child;
}

run("npx", ["tsx", "server/index.ts"]);
run("npx", ["next", "start", "-H", "0.0.0.0", "-p", webPort]);

import "dotenv/config";
import { spawn } from "node:child_process";

const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" };

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

async function waitForApi() {
  const url = `http://127.0.0.1:${apiPort}/health`;
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // API still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`API did not become ready on port ${apiPort}`);
}

run("npx", ["tsx", "server/index.ts"]);
waitForApi()
  .then(() => {
    run("npx", ["next", "start", "-H", "0.0.0.0", "-p", webPort]);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

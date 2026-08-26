import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";

const PORT = Number(process.env.API_PORT ?? 43124);
const HOST = process.env.API_HOST ?? "0.0.0.0";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await registerRoutes(app);
  await app.listen({ port: PORT, host: HOST });
  console.log(`Rich Health Care API on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

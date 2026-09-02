import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { registerRoutes } from "./routes";
import { ensurePlanAndCatalog } from "./bootstrap";

const PORT = Number(process.env.API_PORT ?? 43124);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const isProd = process.env.NODE_ENV === "production";

function assertSecrets() {
  if (isProd && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production.");
  }
  const secret = process.env.JWT_SECRET ?? "";
  const weak =
    secret.length < 24 ||
    /change-me/i.test(secret) ||
    secret === "rich-health-care-dev-secret";
  if (weak && isProd) {
    throw new Error("Set a strong JWT_SECRET (24+ random characters). Do not use the example value.");
  }
  if (weak) {
    console.warn("JWT_SECRET is weak. Generate a long secret before going live.");
  }
}

async function main() {
  assertSecrets();
  const app = Fastify({ logger: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  const origin = process.env.CORS_ORIGIN;
  await app.register(cors, {
    origin: origin ? origin.split(",").map((s) => s.trim()) : !isProd,
    credentials: true,
  });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await registerRoutes(app);
  await app.listen({ port: PORT, host: HOST });
  console.log(`Rich Health Care API on http://${HOST}:${PORT}`);
  ensurePlanAndCatalog().catch((err) => {
    console.error("Catalog sync failed.", err);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

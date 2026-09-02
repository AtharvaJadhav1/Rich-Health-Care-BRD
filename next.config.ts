import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // API traffic is forwarded by app/api/[...path]/route.ts (not rewrites),
  // so the preview proxy does not have to resolve Fastify itself.
};

export default nextConfig;

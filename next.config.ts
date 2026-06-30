import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/submit": ["./assets/**"],
  },
};

export default nextConfig;

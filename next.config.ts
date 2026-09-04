import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ali-oss", "better-sqlite3"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "@xyflow/react"],
  },
};

export default nextConfig;

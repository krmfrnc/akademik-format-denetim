import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "jose"],
  },
};

export default nextConfig;

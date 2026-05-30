import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "jose"],
  },
};

export default nextConfig;

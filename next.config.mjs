/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "jose"],
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "jose"],
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;

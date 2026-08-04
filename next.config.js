/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "menuara.app"] },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.bing.net" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "menuara.app"] },
  },
};

module.exports = nextConfig;

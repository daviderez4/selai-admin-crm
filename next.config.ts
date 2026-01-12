import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'selai.app',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Security headers
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],

  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;

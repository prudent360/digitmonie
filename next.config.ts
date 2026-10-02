import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // KYC uploads: proof of address is capped at 3 MB (Vercel allows 4.5 MB per request).
    serverActions: { bodySizeLimit: "4mb" },
  },
  async redirects() {
    return [
      { source: "/signin", destination: "/login", permanent: false },
      { source: "/signup", destination: "/register", permanent: false },
    ];
  },
};

export default nextConfig;

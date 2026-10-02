import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  async redirects() {
    return [
      { source: "/signin", destination: "/login", permanent: false },
      { source: "/signup", destination: "/register", permanent: false },
    ];
  },
};

export default nextConfig;

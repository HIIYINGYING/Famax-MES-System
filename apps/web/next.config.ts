import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@famax/ui", "@famax/portal", "@famax/auth", "@famax/flags"],
};

export default nextConfig;

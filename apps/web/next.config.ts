import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@mtanda/database",
    "@mtanda/auth",
    "@mtanda/tenant",
    "@mtanda/ui",
    "@mtanda/validation",
  ],
};

export default nextConfig;

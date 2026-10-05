import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hair/ai", "@hair/domain"],
};

export default nextConfig;

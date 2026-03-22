import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Despatch",
  assetPrefix: "/Despatch/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

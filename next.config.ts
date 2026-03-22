import type { NextConfig } from "next";
import { execSync } from "child_process";

// Auto-generate version from git + timestamp at build time
function getBuildVersion(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 16).replace(":", "");
  let hash = "dev";
  try {
    hash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    // Not a git repo or git not available
  }
  return `${date}.${time}.${hash}`;
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Despatch",
  assetPrefix: "/Despatch/",
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: getBuildVersion(),
  },
};

export default nextConfig;

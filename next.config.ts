import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    cpus: 1,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
    staticGenerationMaxConcurrency: 1,
    webpackBuildWorker: false,
    webpackMemoryOptimizations: true,
    workerThreads: false,
  },
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "mammoth"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

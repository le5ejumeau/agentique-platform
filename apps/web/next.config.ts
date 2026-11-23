import type { NextConfig } from "next";

const config: NextConfig = {
  // Les paquets du monorepo sont publiés en TypeScript source.
  transpilePackages: ["@agentique/core", "@agentique/agents"],
};

export default config;

import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@browserbasehq/stagehand", "playwright-core"],
};

export default config;

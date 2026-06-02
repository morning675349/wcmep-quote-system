import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium', 'pdf-parse'],
  // Force-include the Chromium brotli binaries into the serverless PDF function.
  // NOTE: key must be a glob that matches the route; literal "[id]" is treated
  // as a glob char-class, so use "**" instead.
  outputFileTracingIncludes: {
    '/api/pdf/**': ['./node_modules/@sparticuz/chromium/**/*'],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

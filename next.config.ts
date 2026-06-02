import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium', 'pdf-parse'],
  // Force-include the Chromium brotli binaries into the serverless PDF function
  outputFileTracingIncludes: {
    '/api/pdf/[id]': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

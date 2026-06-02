import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium', 'pdf-parse'],
  turbopack: {
    root: '/Users/wangchenan/Documents/wcmep_quote_system',
  },
};

export default nextConfig;

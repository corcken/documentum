import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './i18n/request.ts'
);

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  allowedDevOrigins: [
    "192.168.2.79",
    "192.168.*.*",
    "10.*.*.*",
    "localhost",
  ],
  /* Uploads: Konzept erlaubt 10 MB — Server-Actions-Limit muss darüber liegen,
     sonst blockt Next (Default 1 MB) vor der Validierung im Service. */
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    // proxy.ts kappt sonst Bodies > 10 MB, bevor die Action sie sieht
    proxyClientMaxBodySize: "12mb",
  },
};

export default withNextIntl(nextConfig);

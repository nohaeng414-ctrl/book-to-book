/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.8.104'],
  serverExternalPackages: ['@neondatabase/serverless', '@prisma/adapter-neon'],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  images: {
    dangerouslyAllowSVG: true,
    unoptimized: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    localPatterns: [
      {
        // السماح بصورة اللوجو العامة
        pathname: "/logo.png",
      },
      {
        // Allow cache-busting timestamps on our book-cover API only.
        pathname: "/api/books/*/cover",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Image uploads are capped at 500 KB; 1 MB leaves room for form overhead.
      bodySizeLimit: '1mb',
    },
  },
};

module.exports = nextConfig;

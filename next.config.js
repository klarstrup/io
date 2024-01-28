/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
    typedRoutes: true,
  },
  staticPageGenerationTimeout: 600,
};

module.exports = nextConfig;

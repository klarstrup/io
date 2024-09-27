/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  staticPageGenerationTimeout: 600,
};

module.exports = nextConfig;

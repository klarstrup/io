/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
    typedRoutes: true,
  },
  staticPageGenerationTimeout: 600,
};

module.exports = nextConfig;

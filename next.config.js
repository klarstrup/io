/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ["mongoose"],
    typedRoutes: true,
  },
  staticPageGenerationTimeout: 600,
};

module.exports = nextConfig;

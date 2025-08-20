/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  typedRoutes: true,
  staticPageGenerationTimeout: 600,
  rewrites: async () => {
    return [
      { source: "/cv", destination: "/cv.pdf" },
      { source: "/", destination: "/diary" },
    ];
  },
};

module.exports = nextConfig;

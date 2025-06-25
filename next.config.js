/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  staticPageGenerationTimeout: 600,
  rewrites: async () => {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "io.klarstrup.dk" }],
        destination: "/diary",
      },
      { source: "/cv", destination: "/cv.pdf" },
    ];
  },
};

module.exports = nextConfig;

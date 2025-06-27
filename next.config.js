/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  staticPageGenerationTimeout: 600,
  rewrites: async () => {
    return [{ source: "/cv", destination: "/cv.pdf" }];
  },
  redirects: async () => {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "klarstrup.dk" }],
        destination: "https://github.com/klarstrup",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

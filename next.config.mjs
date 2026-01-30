import { withSerwist } from "@serwist/turbopack";

/** @type {import('next').NextConfig} */
const nextConfig = withSerwist({
  cacheComponents: true,
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
});

export default nextConfig;

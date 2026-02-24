import { withSerwist } from "@serwist/turbopack";

/** @type {import('next').NextConfig} */
const nextConfig = withSerwist({
  cacheComponents: true,
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  typedRoutes: true,
  staticPageGenerationTimeout: 600,
  rewrites: () => [{ source: "/cv", destination: "/cv.pdf" }],
  redirects: () => [{ source: "/", destination: "/diary", permanent: false }],
});

export default nextConfig;

import { withSerwist } from "@serwist/turbopack";

/** @type {import('next').NextConfig} */
const nextConfig = withSerwist({
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackGc: true,
    turbopackLazyDynamicImports: true,
    turbopackPluginRuntimeStrategy: "workerThreads",
    turbopackChunking: {
      generateComponentChunks: true,
    },
  },
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  typedRoutes: true,
  typescript: { ignoreBuildErrors: true },
  staticPageGenerationTimeout: 600,
  rewrites: () => [{ source: "/cv", destination: "/cv.pdf" }],
  redirects: () => [{ source: "/", destination: "/diary", permanent: false }],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "shared.fastly.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
    ],
  },
});

export default nextConfig;

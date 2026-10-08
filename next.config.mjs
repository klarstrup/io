import { withSerwist } from "@serwist/turbopack";

/** @type {import('next').NextConfig} */
const nextConfig = withSerwist({
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackGc: true,
    turbopackLazyDynamicImports: true,
    turbopackPluginRuntimeStrategy: "workerThreads",
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
});

export default nextConfig;

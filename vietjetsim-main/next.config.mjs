import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  distDir: process.env.DIST_DIR || '.next',

  // TypeScript & ESLint errors now FAIL the build (CI gate).
  // Previously both were ignored, which let type errors slip into production.
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: imageHosts,
    qualities: [40, 55, 70, 80, 85, 90, 95, 100],
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/trang-chu',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;

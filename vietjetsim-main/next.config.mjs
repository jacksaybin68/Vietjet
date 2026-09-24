import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  distDir: process.env.DIST_DIR || '.next',

  // The floating dev overlay (the "N • n Issues" badge that sits on top of the
  // page) is turned off: it lands in every QA screenshot but is never part of
  // the product UI. Compile/runtime errors still print in the terminal and the
  // error overlay still appears when a route actually fails.
  devIndicators: false,

  // Type errors now FAIL the build (CI gate); previously they were ignored.
  // Lint is enforced by `npm run lint` in CI, not by the build — Next 15/16
  // removed the `eslint` config key and warns if it is still present.
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

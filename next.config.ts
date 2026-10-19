import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.local",
    "10.*.*.*",
    "172.*.*.*",
    "192.168.*.*",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {
        source: "/songs/search",
        destination: "/songs/new",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

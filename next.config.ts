import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build checks (git hook, CI) write elsewhere so they cannot overwrite the files a running `next dev` is serving.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

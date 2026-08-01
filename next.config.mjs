/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // server.js sets NEXT_DIST_DIR (dev -> .next-dev, prod -> .next) so dev and
  // prod builds never share a directory. Plain `next build` keeps the default.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;

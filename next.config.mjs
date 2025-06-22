/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
    unoptimized: false,
  },
  // Optimizing for Vercel deployment
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;

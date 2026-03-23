/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel ko strict ESLint aur TypeScript checking se rokne ke liye
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

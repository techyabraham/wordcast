/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  // Required for minimal Docker images — emits a self-contained server bundle
  output: 'standalone',
  // Compile workspace UI package inside Next.js rather than expecting pre-built dist
  transpilePackages: ['@wordcast/ui'],
};

export default nextConfig;

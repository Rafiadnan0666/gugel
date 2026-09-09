/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    minimumCacheTTL: 60,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Trim the client bundle: these icon/chart libs are imported in many
  // places — barrelling them without optimization bloats every page.
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react', 'recharts', 'framer-motion'],
  },
};


export default nextConfig;
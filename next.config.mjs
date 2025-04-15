/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['cheerio', 'xml2js']
  },
  webpack: (config, { isServer }) => {
    // Fix for module resolution issues
    if (!isServer) {
      // Don't bundle cheerio or xml2js on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'cheerio': false,
        'xml2js': false
      }
    }
    return config
  }
}

export default nextConfig 
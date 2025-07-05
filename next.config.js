// next.config.js
// Valider les variables d'environnement au démarrage
require('./lib/env-validation.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autoriser le stockage et l'accès aux images dans le dossier public/uploads
  images: {
    dangerouslyAllowSVG: true,
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Configuration des dossiers publics
  publicRuntimeConfig: {
    uploadsPath: '/uploads',
  },
  
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Configuration webpack pour optimiser le build
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimisation pour la production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig
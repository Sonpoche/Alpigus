// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autoriser le stockage et l'accès aux images dans le dossier public/uploads
  images: {
    dangerouslyAllowSVG: true,
    domains: [],
  },
  // Configuration des dossiers publics
  publicRuntimeConfig: {
    uploadsPath: '/uploads',
  }
}

module.exports = nextConfig
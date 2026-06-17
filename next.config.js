const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'static-assets', expiration: { maxEntries: 200 } },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
      },
    },
  ],
})

const productionHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
      : null
  } catch { return null }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', port: '', pathname: '/storage/**' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', productionHost].filter(Boolean),
    },
    staleTimes: {
      dynamic: 0,
    },
  },
}

module.exports = withPWA(nextConfig)

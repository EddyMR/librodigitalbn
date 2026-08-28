const withPWA = require('next-pwa')({
  dest: 'public',
  // next-pwa injects its registration into the Pages Router entry (main.js),
  // which the App Router never loads. We register the SW ourselves from
  // src/components/shared/ServiceWorkerRegister.tsx instead.
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/],
  // Cualquier navegación que falle sirve nuestra página en vez del error de Chrome.
  fallbacks: { document: '/offline.html' },
  runtimeCaching: [
    // Páginas que deben funcionar sin conexión. Solo URLs limpias: los payloads
    // RSC (?_rsc=) caen en el NetworkOnly de más abajo.
    //   /{colegio}/inicio                        — home del alumno
    //   /{colegio}/libros/{libroId}              — lista de bloques
    //   /{colegio}/libros/{libroId}/{b}/{hojaId} — lector
    {
      urlPattern: ({ url }) =>
        url.origin === self.location.origin && !url.search &&
        /^\/[^/]+\/(inicio|libros\/[^/]+(?:\/[^/]+\/[^/]+)?)$/.test(url.pathname),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'hoja-pages',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
        matchOptions: { ignoreVary: true },
      },
    },
    // Imágenes pasadas por el optimizador de Next (/_next/image?url=...).
    // Sin esta regla no tenían ningún handler y fallaban sin conexión.
    {
      urlPattern: ({ url }) => url.pathname === '/_next/image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // Root page (start_url): NetworkFirst so it works as an offline entry point.
    // OfflineRedirect component reads localStorage to jump to the last cached libro.
    {
      urlPattern: /^https?:\/\/[^/]+\/?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-shell',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
        matchOptions: { ignoreVary: true },
      },
    },
    // All other pages: NetworkOnly (no offline support)
    {
      urlPattern: ({ url }) =>
        url.pathname !== '/' &&
        !url.pathname.startsWith('/_next/') &&
        !url.pathname.startsWith('/api/') &&
        !url.pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|ttf|css|js)$/),
      handler: 'NetworkOnly',
      // next-pwa lee options.precacheFallback en cada regla al montar el
      // fallback; sin este objeto revienta el build.
      options: {},
    },
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

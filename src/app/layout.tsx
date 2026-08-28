import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister'

const geistSans = Inter({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] })

// Dominio canónico para las tarjetas al compartir. A propósito independiente de
// NEXT_PUBLIC_APP_URL, que apunta al dominio de Vercel y alimenta los orígenes
// permitidos de las server actions: si se comparte, debe verse teresianos.com.
const siteUrl = 'https://teresianos.com'
const titulo = 'Buena Nueva · Programa Teresiano de formación'
const descripcion =
  'Los libros de catequesis del programa Buena Nueva, para leer y trabajar desde el móvil — también sin conexión.'

export const metadata: Metadata = {
  // Sin metadataBase, Next no puede resolver la ruta de la imagen para
  // compartir y las tarjetas de WhatsApp/Facebook salen sin imagen.
  metadataBase: new URL(siteUrl),
  title: { template: '%s | Buena Nueva', default: titulo },
  description: descripcion,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Buena Nueva',
  },
  // La imagen la toma Next de src/app/opengraph-image.png
  openGraph: {
    type: 'website',
    siteName: 'Buena Nueva',
    title: titulo,
    description: descripcion,
    url: siteUrl,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: titulo,
    description: descripcion,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#4c6ef5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preload" href="/fonts/Avenir.ttc" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="font-sans min-h-dvh flex flex-col">
        <ServiceWorkerRegister />
        <PWAInstallBanner />
        {children}
      </body>
    </html>
  )
}

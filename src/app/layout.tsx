import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import PWAInstallBanner from '@/components/PWAInstallBanner'

const geistSans = Inter({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { template: '%s | Buena Nueva', default: 'Libro Digital Buena Nueva' },
  description: 'Plataforma digital de catequesis con libros interactivos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Buena Nueva',
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
      <body className="font-sans min-h-dvh flex flex-col">
        <PWAInstallBanner />
        {children}
      </body>
    </html>
  )
}

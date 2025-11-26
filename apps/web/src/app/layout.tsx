import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/Navigation'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'DAARION - Місто Дарів',
  description: 'Децентралізована платформа для мікро-спільнот з AI-агентами',
  keywords: ['DAARION', 'DAO', 'AI', 'agents', 'community', 'decentralized'],
  authors: [{ name: 'DAARION Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0c4a6e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {/* Ambient background effect */}
        <div className="ambient-bg" />
        
        {/* Navigation */}
        <Navigation />
        
        {/* Main content */}
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}


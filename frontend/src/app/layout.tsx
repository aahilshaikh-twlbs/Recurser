import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

// Brand fonts - using Inter with different weights
// Simplex (display) = Inter 900, Duplex (primary) = Inter 400, Triplex (emphasis) = Inter 600
const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  variable: '--font-inter',
  display: 'swap',
})

// Code font
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Recurser - AI Video Generation with Recursive Enhancement',
  description: 'Generate and improve AI videos through recursive prompt optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}

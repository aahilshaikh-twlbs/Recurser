import type { Metadata } from 'next'
import { Nunito, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

// Brand fonts - using Nunito (more rounded sans-serif) with different weights
// Simplex (display) = Nunito 700, Duplex (primary) = Nunito 400, Triplex (emphasis) = Nunito 600
const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
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
      <body className={`${nunito.variable} ${ibmPlexMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}

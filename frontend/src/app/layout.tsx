import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// System font fallback
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Fonts are loaded via @font-face in globals.css
// Milling is the main brand font (Duplex 1mm - weight 400 for 99% of usage)
// Inter is the system font fallback
// IBM Plex Mono for code

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
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}

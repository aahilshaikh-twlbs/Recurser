import type { Metadata } from 'next'
import './globals.css'

// Fonts are loaded via @font-face in globals.css
// Milling is the main brand font, IBM Plex Mono for code

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
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chat App',
  description: 'Simple two-user chat application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './client-layout'
import { metadata } from './metadata'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export { metadata }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className={`font-sans antialiased bg-white text-gray-900 ${inter.className}`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
} 
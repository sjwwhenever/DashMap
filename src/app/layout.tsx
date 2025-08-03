import type { Metadata } from 'next'
import { Fira_Code } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'

const firaCode = Fira_Code({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DashMap',
  description: 'DashMap application for video processing and analysis',
  icons: {
    icon: '/Icon/Icon256.png',
    shortcut: '/Icon/Icon256.png',
    apple: '/Icon/Icon256.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={firaCode.className}>
        <ThemeProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex-1">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
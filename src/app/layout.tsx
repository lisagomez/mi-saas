import type { Metadata } from 'next'
import './globals.css'
import PWARegister from '@/components/PWARegister'
import { PushNotificationPrompt } from '@/features/notifications/components/PushNotificationPrompt'

export const metadata: Metadata = {
  title: 'SaaS Factory App',
  description: 'Built with SaaS Factory',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        {children}
        <PWARegister />
        <PushNotificationPrompt />
      </body>
    </html>
  )
}

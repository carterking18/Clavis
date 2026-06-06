import './globals.css'
import { SWRegister } from './sw-register'
import { Geist, Instrument_Serif } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata = {
  title: 'Clavis',
  description: 'One card. Every reward.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clavis',
  },
}

export const viewport = {
  themeColor: '#FAFAFA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} ${instrumentSerif.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Clavis" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  )
}

import './tokens.css'
import './globals.css'
import { SWRegister } from './sw-register'
import { Figtree } from 'next/font/google'

// Clavis is set in Avenir Next. It ships with macOS and iOS but can't be
// self-hosted without a Monotype license, so other devices get Figtree, the
// closest free match in width and weight. See --font-sans in tokens.css.
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-figtree',
  display: 'swap',
})

const DESCRIPTION = 'Type where you are paying and Clavis ranks every card in your wallet by what it actually earns there, counting the credits you have not used yet. Free, no bank login.'

export const metadata = {
  metadataBase: new URL('https://claviscard.com'),
  title: { default: 'Clavis: which card to use, wherever you pay', template: '%s · Clavis' },
  description: DESCRIPTION,
  openGraph: {
    title: 'Which card should I use?',
    description: DESCRIPTION,
    siteName: 'Clavis',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Which card should I use?', description: DESCRIPTION },
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
    <html lang="en" className={figtree.variable}>
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

import './globals.css'

export const metadata = {
  title: 'Clavis',
  description: 'One card. Every reward.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
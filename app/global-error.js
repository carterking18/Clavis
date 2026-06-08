'use client'
import { useEffect } from 'react'

// Catches errors thrown from the root layout itself. Must render its own
// <html>/<body> since it fully replaces the root layout when active.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Clavis global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#FAFAFA', color: '#111827' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '24px' }}>CLAVIS</div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '10px' }}>
              Something went sideways.
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, marginBottom: '28px' }}>
              Clavis hit an unexpected error loading the app. Your data is safe — try reloading.
            </p>
            <button
              onClick={() => reset()}
              style={{ width: '100%', padding: '11px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}>
              Try again
            </button>
            {error?.digest && (
              <div style={{ marginTop: '20px', fontSize: '11px', color: '#D1D5DB' }}>
                Error ref: {error.digest}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}

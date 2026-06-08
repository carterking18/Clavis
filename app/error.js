'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Clavis route error:', error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-page)', textAlign: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="40" height="40" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="ekey">
                <circle cx="187" cy="254" r="107" fill="white"/>
                <circle cx="187" cy="254" r="61"  fill="black"/>
                <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                <rect x="354" y="276" width="42"  height="58" rx="11" fill="white"/>
                <rect x="408" y="276" width="30"  height="42" rx="9"  fill="white"/>
              </mask>
            </defs>
            <rect width="512" height="512" rx="114" fill="#F3F4F6"/>
            <rect width="512" height="512" fill="#C9A227" mask="url(#ekey)"/>
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: '10px' }}>
          Something went <span style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>sideways.</span>
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '28px' }}>
          That wasn&apos;t supposed to happen. Your data is safe — try reloading this screen, or head back to the dashboard.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <a className="btn-secondary" href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Back to dashboard
          </a>
        </div>

        {error?.digest && (
          <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-faintest)' }}>
            Error ref: {error.digest}
          </div>
        )}
      </div>
    </div>
  )
}

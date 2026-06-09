'use client'
import { KeySVG, MarketingBody, marketingStyles } from '../marketing-sections'

export default function About() {
  return (
    <>
      <style>{marketingStyles}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* ── Sticky nav ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(9,9,12,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo */}
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <KeySVG size={18} id="abkey"/>
              <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: '#dddde4' }}>CLAVIS</span>
            </a>

            {/* Center links */}
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <a href="#how-it-works" className="mkt-nav-link">How it works</a>
              <a href="#features"     className="mkt-nav-link">Features</a>
              <a href="#insights"     className="mkt-nav-link">Insights</a>
              <a href="/dashboard?tour=1" className="mkt-nav-link">Take a tour</a>
            </div>

            {/* Back to dashboard */}
            <a href="/dashboard" className="pill-dark" style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px' }}>
              ← Dashboard
            </a>
          </div>
        </nav>

        {/* ── All marketing sections ── */}
        <MarketingBody/>

        {/* ── Footer ── */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: 0 }}/>
        <footer style={{ padding: '32px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeySVG size={16} id="abftkey"/>
              <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', color: 'rgba(221,221,228,0.35)' }}>CLAVIS</span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(221,221,228,0.2)' }}>
              © {new Date().getFullYear()} Clavis · One card. Every reward.
            </span>
          </div>
        </footer>

      </div>
    </>
  )
}

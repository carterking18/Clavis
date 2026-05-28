'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { KeySVG, MarketingBody, marketingStyles } from './marketing-sections'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    }).catch(() => {})
  }, [router])

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
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <KeySVG size={18} id="navkey"/>
              <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: '#dddde4' }}>CLAVIS</span>
            </a>
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <a href="#how-it-works" className="mkt-nav-link">How it works</a>
              <a href="#features"     className="mkt-nav-link">Features</a>
              <a href="#insights"     className="mkt-nav-link">Insights</a>
            </div>
            <a href="/auth" className="pill-dark" style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px' }}>
              Sign in
            </a>
          </div>
        </nav>

        {/* ── Hero CTA pair (only on homepage) ── */}
        <div style={{ padding: '80px 24px 0', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ maxWidth: '560px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a227', marginBottom: '16px' }}>Card intelligence</div>
            <h1 className="display-xl">
              Always earn<br/>
              <span className="gradient-text">the most.</span>
            </h1>
            <p style={{ fontSize: '16px', lineHeight: '1.65', color: 'rgba(221,221,228,0.55)', marginTop: '16px', maxWidth: '420px' }}>
              Tell Clavis what you&apos;re buying. It scores every card in your wallet and picks the one that earns the highest reward — every single time.
            </p>
            <div className="hero-ctas" style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
              <a href="/auth" className="pill-dark">Get started free</a>
              <a href="#how-it-works" className="pill-outline">See how it works</a>
            </div>
            <p style={{ marginTop: '20px', fontSize: '11px', color: 'rgba(221,221,228,0.2)', fontWeight: '500', letterSpacing: '0.03em' }}>
              Free · No credit card required
            </p>
          </div>
        </div>

        {/* ── Shared marketing sections ── */}
        <MarketingBody/>

        {/* ── CTA section ── */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: 0 }}/>
        <section style={{ padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a227', marginBottom: '16px' }}>Get started</div>
            <h2 className="display-lg">Stop leaving money<br/><span className="gradient-text">on the table.</span></h2>
            <p style={{ fontSize: '16px', lineHeight: '1.65', color: 'rgba(221,221,228,0.55)', maxWidth: '400px', margin: '16px auto 0' }}>
              The average cardholder misses $200–400 in rewards each year from choosing the wrong card. Clavis fixes that.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '36px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/auth" className="pill-dark">Create free account</a>
              <a href="/auth" className="pill-outline">Sign in</a>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: 0 }}/>
        <footer style={{ padding: '32px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeySVG size={16} id="ftkey"/>
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

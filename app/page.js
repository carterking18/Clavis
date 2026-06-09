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

      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)' }}>

        {/* ── Sticky nav ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(250,250,250,0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <KeySVG size={18} id="navkey"/>
              <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>CLAVIS</span>
            </a>
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <a href="#how-it-works" className="mkt-nav-link">How it works</a>
              <a href="#features"     className="mkt-nav-link">Features</a>
              <a href="#insights"     className="mkt-nav-link">Insights</a>
              <a href="/dashboard?tour=1" className="mkt-nav-link">Take a tour</a>
            </div>
            <a href="/auth" className="pill-dark" style={{ fontSize: '12px', fontWeight: '600', padding: '9px 20px' }}>
              Sign in
            </a>
          </div>
        </nav>

        {/* ── Hero CTA pair (only on homepage) ── */}
        <div style={{ padding: '80px 24px 0', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ maxWidth: '560px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Free to use</div>
            <h1 className="display-xl">
              Which card<br/>
              <span className="gradient-text">should I use?</span>
            </h1>
            <p style={{ fontSize: '16px', lineHeight: '1.65', color: 'var(--text-secondary)', marginTop: '16px', maxWidth: '420px' }}>
              Clavis looks at every card in your wallet and tells you which one earns the most at wherever you are shopping. Add your cards once and it handles the rest. All those perks you have? Clavis tracks them too and makes sure you actually get your money&apos;s worth.
            </p>
            <div className="hero-ctas" style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
              <a href="/auth" className="pill-dark">Get started free</a>
              <a href="#how-it-works" className="pill-outline">See how it works</a>
            </div>
            <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-faintest)', fontWeight: '500' }}>
              Free · No credit card required
            </p>
          </div>
        </div>

        {/* ── Tour CTA ── */}
        <div style={{ padding: '0 24px 80px', maxWidth: '1100px', margin: '0 auto' }}>
          <a href="/dashboard?tour=1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '22px 28px', textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,162,39,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '6px' }}>See it in action</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Take a quick tour of Clavis</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>A 60-second walkthrough of every feature. No sign up needed to look around.</div>
            </div>
            <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </a>
        </div>

        {/* ── Shared marketing sections ── */}
        <MarketingBody/>

        {/* ── CTA section ── */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }}/>
        <section style={{ padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Get started</div>
            <h2 className="display-lg">Start getting more<br/><span className="gradient-text">from every purchase.</span></h2>
            <p style={{ fontSize: '16px', lineHeight: '1.65', color: 'var(--text-secondary)', maxWidth: '400px', margin: '16px auto 0' }}>
              You already have the cards. Clavis just makes sure you are using the right one every time you spend.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '36px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/auth" className="pill-dark">Create free account</a>
              <a href="/auth" className="pill-outline">Sign in</a>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }}/>
        <footer style={{ padding: '32px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeySVG size={16} id="ftkey"/>
              <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-faintest)' }}>CLAVIS</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-faintest)' }}>
              © {new Date().getFullYear()} Clavis · One card. Every reward.
            </span>
          </div>
        </footer>

      </div>
    </>
  )
}

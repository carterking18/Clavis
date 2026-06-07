'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Auth() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')

    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account, then log in.')

    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) setError(error.message)
      else setMessage("Password reset link sent — check your inbox. You can close this page.")
    }

    setLoading(false)
  }

  const heading = {
    login:  <>Welcome<br/><span style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>back.</span></>,
    signup: <>Start<br/><span style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>earning more.</span></>,
    forgot: <>Reset your<br/><span style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>password.</span></>,
  }

  const subtext = {
    login:  'Sign in to your Clavis account.',
    signup: 'Create a free account — no credit card required.',
    forgot: "Enter your email and we'll send you a reset link.",
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ marginBottom: '40px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '32px' }}>
            <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="akey">
                  <circle cx="187" cy="254" r="107" fill="white"/>
                  <circle cx="187" cy="254" r="61"  fill="black"/>
                  <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                  <rect x="354" y="276" width="42"  height="58" rx="11" fill="white"/>
                  <rect x="408" y="276" width="30"  height="42" rx="9"  fill="white"/>
                </mask>
              </defs>
              <rect width="512" height="512" fill="#C9A227" mask="url(#akey)"/>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>CLAVIS</span>
          </a>

          <h1 style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '32px', fontWeight: '700', letterSpacing: '-0.01em', lineHeight: '1.1', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {heading[mode]}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400', lineHeight: '1.5' }}>
            {subtext[mode]}
          </p>
        </div>

        {error   && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>

          {/* Email — shown on all modes */}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Password — hidden on forgot mode */}
          {mode !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                {mode === 'login' && (
                  <button
                    onClick={() => switchMode('forgot')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                className="input"
                type="password"
                placeholder="minimum 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginBottom: '10px' }}>
          {loading
            ? 'Loading…'
            : mode === 'login'  ? 'Sign in'
            : mode === 'signup' ? 'Create account'
            : 'Send reset link'}
        </button>

        {mode === 'forgot' ? (
          <button className="btn-secondary" onClick={() => switchMode('login')}>
            Back to sign in
          </button>
        ) : (
          <button className="btn-secondary" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        )}

      </div>
    </div>
  )
}

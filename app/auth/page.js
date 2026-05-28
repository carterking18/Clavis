'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Auth() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setMessage('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account, then log in.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
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
              <rect width="512" height="512" fill="#c9a227" mask="url(#akey)"/>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: 'rgba(221,221,228,0.5)' }}>CLAVIS</span>
          </a>

          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: '1.1', color: '#dddde4', marginBottom: '8px' }}>
            {mode === 'login' ? (
              <>Welcome<br/><span style={{ background: 'linear-gradient(135deg,#c9a227,#e4c040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>back.</span></>
            ) : (
              <>Start<br/><span style={{ background: 'linear-gradient(135deg,#c9a227,#e4c040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>earning more.</span></>
            )}
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(221,221,228,0.35)', fontWeight: '400', lineHeight: '1.5' }}>
            {mode === 'login' ? 'Sign in to your Clavis account.' : 'Create a free account — no credit card required.'}
          </p>
        </div>

        {error   && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
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

          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginBottom: '10px' }}>
          {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          className="btn-secondary"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>

      </div>
    </div>
  )
}

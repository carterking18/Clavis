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
    <div className="app" style={{ maxWidth: '420px', paddingTop: '5rem' }}>

      {/* Logo + tagline */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontFamily: "'SF Mono', 'Menlo', 'Monaco', monospace", fontSize: '16px', fontWeight: '700', letterSpacing: '0.16em', color: '#f0f0f0', marginBottom: '8px' }}>
          CLA<span style={{ color: '#c8a84b' }}>VIS</span>
        </div>
        <div style={{ fontFamily: "'SF Mono', 'Menlo', 'Monaco', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em' }}>
          ONE CARD. EVERY REWARD.
        </div>
      </div>

      {/* Mode label */}
      <div style={{ fontFamily: "'SF Mono', 'Menlo', 'Monaco', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1rem' }}>
        {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div style={{ marginBottom: '14px' }}>
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

      <div style={{ marginBottom: '1.5rem' }}>
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

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      <button
        className="btn-secondary"
        style={{ marginTop: '10px' }}
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>

    </div>
  )
}

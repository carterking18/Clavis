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
    <div className="app" style={{ maxWidth: '420px', paddingTop: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Cla<span style={{ color: '#c8a84b' }}>vis</span>
        </div>
        <div style={{ fontSize: '14px', color: '#888' }}>One card. Every reward.</div>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div style={{ marginBottom: '14px' }}>
        <label className="label">EMAIL</label>
        <input
          className="input"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="label">PASSWORD</label>
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
        {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
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
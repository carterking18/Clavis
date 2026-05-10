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
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '6px', color: '#f5f5f5' }}>
          Cla<span style={{ color: '#e8b84b' }}>vis</span>
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
          One card. Every reward.
        </div>
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

      <div style={{ marginBottom: '20px' }}>
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

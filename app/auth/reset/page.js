'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      await supabase.auth.signOut()
      router.push('/auth?reset=1')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        <div style={{ marginBottom: '40px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '32px' }}>
            <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="akey2">
                  <circle cx="187" cy="254" r="107" fill="white"/>
                  <circle cx="187" cy="254" r="61"  fill="black"/>
                  <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                  <rect x="354" y="276" width="42"  height="58" rx="11" fill="white"/>
                  <rect x="408" y="276" width="30"  height="42" rx="9"  fill="white"/>
                </mask>
              </defs>
              <rect width="512" height="512" fill="#C9A227" mask="url(#akey2)"/>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>CLAVIS</span>
          </a>

          <h1 style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '32px', fontWeight: '400', letterSpacing: '-0.01em', lineHeight: '1.1', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Set a new<br/>
            <span style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>password.</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {ready ? 'Choose a new password for your account.' : 'Verifying your reset link…'}
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        {!ready ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '2rem 0' }}>
            Waiting for confirmation…
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label className="label">New password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="same as above"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={handleReset} disabled={loading}>
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

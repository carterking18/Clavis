'use client'
import { useState, useEffect } from 'react'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIOS, setShowIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode()) return
    if (localStorage.getItem('clavis_install_dismissed')) return

    if (isIOS()) {
      // Delay a bit so it doesn't fire immediately on first load
      const t = setTimeout(() => setShowIOS(true), 3000)
      return () => clearTimeout(t)
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const t = setTimeout(() => setVisible(true), 3000)
      return () => clearTimeout(t)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('clavis_install_dismissed', '1')
    setVisible(false)
    setShowIOS(false)
    setDeferredPrompt(null)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('clavis_install_dismissed', '1')
    }
    setDeferredPrompt(null)
    setVisible(false)
  }

  const show = visible || showIOS
  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '400px',
      background: '#1c1c24',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '16px',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      {/* Icon */}
      <img src="/icon-192.png" alt="Clavis" style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '15px', color: '#f0f0f5', marginBottom: '4px' }}>
          Add Clavis to your home screen
        </div>
        {showIOS ? (
          <div style={{ fontSize: '13px', color: '#8e8e99', lineHeight: '1.4' }}>
            Tap the <ShareIcon /> share button, then <strong style={{ color: '#c0c0cc' }}>Add to Home Screen</strong>.
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#8e8e99', lineHeight: '1.4' }}>
            Install for faster access and a full-screen experience.
          </div>
        )}
        {!showIOS && (
          <button
            onClick={install}
            style={{
              marginTop: '10px',
              background: '#5b4fff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            Install
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#8e8e99',
          cursor: 'pointer',
          padding: '2px',
          fontSize: '18px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg
      style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/auth')
      }
    }).catch(() => {
      router.push('/auth')
    })

    // Fallback: force redirect after 2 seconds no matter what
    const timeout = setTimeout(() => {
      router.push('/auth')
    }, 2000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#888', fontSize: '14px' }}>Loading...</p>
    </div>
  )
}
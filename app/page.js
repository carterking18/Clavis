'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { MarketingBody, MarketingFooter, MarketingNav, marketingStyles } from './marketing-sections'

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
      <div className="mkt-page">
        <MarketingNav cta={{ href: '/auth', label: 'Sign in' }}/>
        <MarketingBody cta={{ href: '/auth', label: 'Get started free' }} secondaryCta={{ href: '/auth', label: 'Sign in' }}/>
        <MarketingFooter/>
      </div>
    </>
  )
}

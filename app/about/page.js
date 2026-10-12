'use client'
import { MarketingBody, MarketingFooter, MarketingNav, marketingStyles } from '../marketing-sections'

// The landing page for signed-in users (/ redirects them to /dashboard)
export default function About() {
  return (
    <>
      <style>{marketingStyles}</style>
      <div className="mkt-page">
        <MarketingNav cta={{ href: '/dashboard', label: 'Dashboard' }} id="abkey"/>
        <MarketingBody cta={{ href: '/dashboard', label: 'Open your dashboard' }}/>
        <MarketingFooter id="abftkey"/>
      </div>
    </>
  )
}

'use client'
import { useState } from 'react'
import { addCard, addMultipliers } from '../lib/cards'
import { getSuggestedMultipliers } from '../lib/cardRewards'
import { getCardDesign } from '../lib/cardImages'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

function CardArt({ name, style = {} }) {
  const design = getCardDesign(name)
  return (
    <div style={{
      borderRadius: '10px',
      background: `linear-gradient(135deg, ${design.gradient[0]}, ${design.gradient[1]})`,
      ...style
    }} />
  )
}

function Step({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '28px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? '20px' : '6px',
          height: '6px',
          borderRadius: '3px',
          background: i === current ? '#e8b84b' : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        }} />
      ))}
    </div>
  )
}

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [cardName, setCardName] = useState('')
  const [balanceUnit, setBalanceUnit] = useState('points')
  const [annualFee, setAnnualFee] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggestion, setSuggestion] = useState(null)

  function handleNameChange(name) {
    setCardName(name)
    const s = getSuggestedMultipliers(name)
    setSuggestion(s || null)
    if (s?.balanceUnit) setBalanceUnit(s.balanceUnit)
  }

  async function handleAddCard() {
    if (!cardName.trim()) { onComplete(); return }
    setSaving(true)
    try {
      const created = await addCard({
        name: cardName.trim(),
        type: 'credit',
        balance: 0,
        balance_unit: balanceUnit,
        annual_fee: parseFloat(annualFee) || 0,
      })
      const s = getSuggestedMultipliers(cardName)
      if (s) {
        const mults = {}
        CATEGORIES.forEach(cat => { if (s.multipliers[cat]) mults[cat] = s.multipliers[cat] })
        if (Object.keys(mults).length) await addMultipliers(created.id, mults)
      }
    } catch (e) { console.error(e) }
    setSaving(false)
    setStep(2)
  }

  function finish() {
    if (typeof window !== 'undefined') localStorage.setItem('clavis_onboarded', '1')
    onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#222224',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>

        {/* ── Step 0: Welcome ───────────────────────────── */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <Step current={0} total={3} />

            {/* Logo mark */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="64" height="64" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="obg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2c2c2e"/>
                    <stop offset="100%" stopColor="#1a1a1b"/>
                  </linearGradient>
                  <linearGradient id="ogold" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#f5cb6a"/>
                    <stop offset="100%" stopColor="#d49530"/>
                  </linearGradient>
                  <mask id="okey">
                    <circle cx="187" cy="254" r="107" fill="white"/>
                    <circle cx="187" cy="254" r="61" fill="black"/>
                    <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                    <rect x="354" y="276" width="42" height="58" rx="11" fill="white"/>
                    <rect x="408" y="276" width="30" height="42" rx="9" fill="white"/>
                  </mask>
                </defs>
                <rect width="512" height="512" rx="114" fill="url(#obg)"/>
                <rect width="512" height="512" fill="url(#ogold)" mask="url(#okey)"/>
              </svg>
            </div>

            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Welcome to Cla<span style={{ color: '#e8b84b' }}>vis</span>
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', marginBottom: '28px' }}>
              Every card in your wallet, ranked instantly.<br/>
              Always know which one to tap.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '💳', text: 'Store all your cards in one place' },
                { icon: '⚡', text: 'Instant best-card recommendations' },
                { icon: '💰', text: 'Track rewards earned over time' },
              ].map(item => (
                <div key={item.text} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '11px 14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: '500' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={() => setStep(1)} style={{ marginTop: '24px' }}>
              Get started →
            </button>
          </div>
        )}

        {/* ── Step 1: Add first card ─────────────────────── */}
        {step === 1 && (
          <div>
            <Step current={1} total={3} />

            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              Add your main card
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '22px', lineHeight: '1.5' }}>
              Clavis auto-fills rewards rates for hundreds of cards.
            </div>

            {/* Card name */}
            <div style={{ marginBottom: '12px' }}>
              <label className="label">Card name</label>
              <input
                className="input"
                placeholder="e.g. Chase Sapphire Reserve"
                value={cardName}
                onChange={e => handleNameChange(e.target.value)}
                autoFocus
              />
            </div>

            {/* Card art preview */}
            {cardName && (
              <div style={{ marginBottom: '12px' }}>
                <CardArt name={cardName} style={{ height: '56px' }} />
              </div>
            )}

            {/* Auto-fill notice */}
            {suggestion && (
              <div style={{ marginBottom: '12px', fontSize: '12px', color: '#5b9cf6', background: 'rgba(91,156,246,0.1)', border: '1px solid rgba(91,156,246,0.2)', borderRadius: '8px', padding: '9px 12px' }}>
                ✦ Rewards rates auto-filled — {suggestion.note}
              </div>
            )}

            {/* Rewards unit + annual fee */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
              <div>
                <label className="label">Rewards type</label>
                <select className="input" value={balanceUnit} onChange={e => setBalanceUnit(e.target.value)}>
                  <option value="points">Points</option>
                  <option value="miles">Miles</option>
                  <option value="cash back">Cash back</option>
                </select>
              </div>
              <div>
                <label className="label">Annual fee ($)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={annualFee}
                  onChange={e => setAnnualFee(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={handleAddCard} disabled={saving}>
                {saving ? 'Adding...' : cardName ? 'Add card →' : 'Skip for now →'}
              </button>
            </div>

            <button
              onClick={finish}
              style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', fontSize: '13px', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '4px', fontFamily: 'inherit' }}>
              Skip setup
            </button>
          </div>
        )}

        {/* ── Step 2: Ready ─────────────────────────────── */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <Step current={2} total={3} />

            <div style={{ fontSize: '44px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              You&apos;re all set
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px', lineHeight: '1.6' }}>
              Here&apos;s how to use Clavis at checkout
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px', textAlign: 'left' }}>
              {[
                { step: '1', text: 'Type where you\'re shopping in the search bar' },
                { step: '2', text: 'Clavis shows your best card instantly' },
                { step: '3', text: 'Tap the card and go — that\'s it' },
              ].map(item => (
                <div key={item.step} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(232,184,75,0.2)', border: '1px solid rgba(232,184,75,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '800', color: '#e8b84b',
                  }}>
                    {item.step}
                  </div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: '500', lineHeight: '1.5', paddingTop: '2px' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={finish}>
              Open Smart Tap →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

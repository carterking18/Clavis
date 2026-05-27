'use client'
import { useState, useEffect, useRef } from 'react'
import { addCard, addMultipliers, addPerk } from '../lib/cards'
import { getSuggestedMultipliers } from '../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../lib/cardPerks'
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

function StepIndicator({ current, total }) {
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
  const [suggestion, setSuggestion] = useState(null)    // multiplier suggestion
  const [fetchingCard, setFetchingCard] = useState(false)
  const fetchTimer = useRef(null)

  // Perk step state
  const [pendingCardId, setPendingCardId] = useState(null)
  const [suggestedPerks, setSuggestedPerks] = useState(null)   // null = unchecked, [] = none, [...] = perks
  const [selectedPerkIndices, setSelectedPerkIndices] = useState([])
  const [addingPerks, setAddingPerks] = useState(false)

  // 3 steps (Welcome/AddCard/Done) or 4 (Welcome/AddCard/Perks/Done)
  const totalSteps = suggestedPerks && suggestedPerks.length > 0 ? 4 : 3
  // Map logical step to indicator position
  const indicatorStep = step === 3 ? totalSteps - 1 : step

  function handleNameChange(name) {
    setCardName(name)

    // Instant internal-DB lookup
    const s = getSuggestedMultipliers(name)
    if (s) {
      setSuggestion(s)
      if (fetchTimer.current) clearTimeout(fetchTimer.current)
      setFetchingCard(false)
      return
    }
    setSuggestion(null)

    // Debounced API lookup for unknown cards
    if (fetchTimer.current) clearTimeout(fetchTimer.current)
    if (name.trim().length < 4) { setFetchingCard(false); return }

    fetchTimer.current = setTimeout(async () => {
      setFetchingCard(true)
      try {
        const res = await fetch('/api/card-perks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        })
        const data = await res.json()
        if (data.note || data.multipliers) {
          setSuggestion({ multipliers: data.multipliers, note: data.note + (data.source === 'claude' ? ' (AI-generated · verify with issuer)' : '') })
        }
      } catch (e) { /* silent */ }
      setFetchingCard(false)
    }, 900)
  }

  useEffect(() => () => { if (fetchTimer.current) clearTimeout(fetchTimer.current) }, [])

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

      // Add multipliers from suggestion (internal or Claude)
      const s = getSuggestedMultipliers(cardName) || suggestion
      if (s?.multipliers) {
        const mults = {}
        CATEGORIES.forEach(cat => { if (s.multipliers[cat]) mults[cat] = s.multipliers[cat] })
        if (Object.keys(mults).length) await addMultipliers(created.id, mults)
      }

      // Check for known perks (internal DB only — Claude perks would need a separate call)
      const perks = getSuggestedPerks(cardName.trim())
      if (perks && perks.length > 0) {
        setPendingCardId(created.id)
        setSuggestedPerks(perks)
        setSelectedPerkIndices(perks.map((_, i) => i))
        setStep(2)  // perk selection step
      } else {
        setSuggestedPerks([])
        setStep(3)  // success
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleAddPerks() {
    if (!pendingCardId || !suggestedPerks) { setStep(3); return }
    setAddingPerks(true)
    try {
      for (const i of selectedPerkIndices) {
        const p = suggestedPerks[i]
        await addPerk({
          name: p.name,
          total_amount: p.total_amount,
          used_amount: 0,
          period: p.period,
          resets_at: calculateResetsAt(p.period),
          card_id: pendingCardId,
        })
      }
    } catch (e) { console.error(e) }
    setAddingPerks(false)
    setStep(3)
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
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>

        {/* ── Step 0: Welcome ───────────────────────────── */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <StepIndicator current={0} total={3} />

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
                { icon: '💰', text: 'Track rewards and expiring benefits' },
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
            <StepIndicator current={1} total={3} />

            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              Add your main card
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '22px', lineHeight: '1.5' }}>
              Clavis auto-fills rewards rates and perks for hundreds of cards.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="label">Card name</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  placeholder="e.g. Chase Sapphire Reserve"
                  value={cardName}
                  onChange={e => handleNameChange(e.target.value)}
                  autoFocus
                />
                {fetchingCard && (
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    Looking up...
                  </div>
                )}
              </div>
            </div>

            {cardName && (
              <div style={{ marginBottom: '12px' }}>
                <CardArt name={cardName} style={{ height: '56px' }} />
              </div>
            )}

            {suggestion && (
              <div style={{ marginBottom: '12px', fontSize: '12px', color: '#5b9cf6', background: 'rgba(91,156,246,0.1)', border: '1px solid rgba(91,156,246,0.2)', borderRadius: '8px', padding: '9px 12px' }}>
                ✦ Rewards rates auto-filled — {suggestion.note}
              </div>
            )}

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

        {/* ── Step 2: Known perks found ─────────────────── */}
        {step === 2 && suggestedPerks && suggestedPerks.length > 0 && (
          <div>
            <StepIndicator current={2} total={4} />

            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', marginBottom: '4px' }}>
              Known perks found
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Select the benefits you have on this card. You can edit amounts later.
            </div>

            {suggestedPerks.map((perk, i) => (
              <div key={i}
                onClick={() => setSelectedPerkIndices(prev =>
                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                )}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px',
                  border: selectedPerkIndices.includes(i) ? '2px solid #30c98a' : '1.5px solid rgba(255,255,255,0.2)',
                  background: selectedPerkIndices.includes(i) ? '#30c98a' : 'transparent',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5' }}>{perk.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    {perk.period}{perk.total_amount > 0 ? ` · $${perk.total_amount}` : ''}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
              <button className="btn-primary" onClick={handleAddPerks} disabled={addingPerks}>
                {addingPerks ? 'Saving...' : `Add ${selectedPerkIndices.length} perk${selectedPerkIndices.length !== 1 ? 's' : ''} →`}
              </button>
              <button className="btn-secondary" onClick={() => setStep(3)}>Skip</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ──────────────────────────────── */}
        {(step === 3 || (step === 2 && (!suggestedPerks || suggestedPerks.length === 0))) && (
          <div style={{ textAlign: 'center' }}>
            <StepIndicator current={totalSteps - 1} total={totalSteps} />

            <div style={{ fontSize: '44px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              You&apos;re all set
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px', lineHeight: '1.6' }}>
              Here&apos;s how to use Clavis at checkout
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px', textAlign: 'left' }}>
              {[
                { step: '1', text: "Type where you're shopping in the search bar" },
                { step: '2', text: 'Clavis shows your best card instantly' },
                { step: '3', text: "Tap the card and go — that's it" },
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
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: '500', lineHeight: '1.5', paddingTop: '2px' }}>
                    {item.text}
                  </span>
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

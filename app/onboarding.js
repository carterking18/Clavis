'use client'
import { useState, useEffect, useRef } from 'react'
import { addCard, addMultipliers, addPerk } from '../lib/cards'
import { getSuggestedMultipliers } from '../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../lib/cardPerks'
import { getCardDesign } from '../lib/cardImages'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

export const TOUR_SLIDES = [
  { icon: '⚡', tab: 'Tap',      title: 'Smart Tap', text: "Type where you're shopping and Clavis instantly tells you which card in your wallet earns the most — right when you need it." },
  { icon: '💳', tab: 'Wallet',   title: 'Wallet',    text: "Every card in one place — annual fees, balances, and the value you've earned, all tracked automatically." },
  { icon: '🎁', tab: 'Perks',    title: 'Perks',     text: 'Keep tabs on annual credits and benefits across your cards so nothing expires unused.' },
  { icon: '🕐', tab: 'History',  title: 'History',   text: 'Every tap is logged automatically, building a running record of what you earned and where.' },
  { icon: '💡', tab: 'Insights', title: 'Insights',  text: 'Personalized tips — perks about to expire, money left on the table, and cards worth adding to your wallet.' },
]

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
          background: i === current ? 'var(--gold)' : 'rgba(0,0,0,0.12)',
          transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        }} />
      ))}
    </div>
  )
}

export function Onboarding({ onComplete, tourOnly = false }) {
  const [step, setStep] = useState(0)
  const [tourIndex, setTourIndex] = useState(tourOnly ? 0 : null) // null = not touring; 0..N = current tour slide
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
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>

        {/* ── Tour: quick walkthrough of the 5 tabs ──────── */}
        {tourIndex !== null && (
          <div style={{ textAlign: 'center' }}>
            <StepIndicator current={tourIndex} total={TOUR_SLIDES.length} />

            <div style={{ fontSize: '40px', marginBottom: '14px' }}>{TOUR_SLIDES[tourIndex].icon}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '6px' }}>
              {TOUR_SLIDES[tourIndex].tab} tab
            </div>
            <div style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
              {TOUR_SLIDES[tourIndex].title}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '28px', minHeight: '78px' }}>
              {TOUR_SLIDES[tourIndex].text}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {tourIndex > 0 && (
                <button className="btn-secondary" onClick={() => setTourIndex(i => i - 1)} style={{ width: 'auto', flexShrink: 0, padding: '11px 18px' }}>
                  ← Back
                </button>
              )}
              <button className="btn-primary" onClick={() => {
                if (tourIndex < TOUR_SLIDES.length - 1) setTourIndex(i => i + 1)
                else if (tourOnly) onComplete()
                else { setTourIndex(null); setStep(1) }
              }}>
                {tourIndex < TOUR_SLIDES.length - 1 ? 'Next →' : (tourOnly ? 'Done' : "Let's add your first card →")}
              </button>
            </div>

            {!tourOnly && (
              <button
                onClick={() => { setTourIndex(null); setStep(1) }}
                style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', fontSize: '13px', color: 'var(--text-faintest)', cursor: 'pointer', padding: '4px', fontFamily: 'inherit' }}>
                Skip tour
              </button>
            )}
            {tourOnly && (
              <button
                onClick={onComplete}
                style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', fontSize: '13px', color: 'var(--text-faintest)', cursor: 'pointer', padding: '4px', fontFamily: 'inherit' }}>
                Close
              </button>
            )}
          </div>
        )}

        {/* ── Step 0: Welcome ───────────────────────────── */}
        {tourIndex === null && step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <StepIndicator current={0} total={3} />

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="56" height="56" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <mask id="okey">
                    <circle cx="187" cy="254" r="107" fill="white"/>
                    <circle cx="187" cy="254" r="61" fill="black"/>
                    <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                    <rect x="354" y="276" width="42" height="58" rx="11" fill="white"/>
                    <rect x="408" y="276" width="30" height="42" rx="9" fill="white"/>
                  </mask>
                </defs>
                <rect width="512" height="512" rx="114" fill="#F3F4F6"/>
                <rect width="512" height="512" fill="#C9A227" mask="url(#okey)"/>
              </svg>
            </div>

            <div style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '8px' }}>
              Welcome to Clavis
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '28px' }}>
              Every card in your wallet, ranked instantly.<br/>
              Always know which one to tap.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '💳', text: 'Store all your cards in one place' },
                { icon: '⚡', text: 'Instant best-card recommendations' },
                { icon: '💰', text: 'Track rewards and expiring benefits' },
              ].map(item => (
                <div key={item.text} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-elevated)', borderRadius: '8px', padding: '11px 14px',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={() => setTourIndex(0)} style={{ marginTop: '24px' }}>
              Get started →
            </button>
          </div>
        )}

        {/* ── Step 1: Add first card ─────────────────────── */}
        {tourIndex === null && step === 1 && (
          <div>
            <StepIndicator current={1} total={3} />

            <div style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Add your main card
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '22px', lineHeight: '1.5' }}>
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
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)' }}>
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
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--blue)', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: '6px', padding: '9px 12px' }}>
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
              style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', fontSize: '13px', color: 'var(--text-faintest)', cursor: 'pointer', padding: '4px', fontFamily: 'inherit' }}>
              Skip setup
            </button>
          </div>
        )}

        {/* ── Step 2: Known perks found ─────────────────── */}
        {tourIndex === null && step === 2 && suggestedPerks && suggestedPerks.length > 0 && (
          <div>
            <StepIndicator current={2} total={4} />

            <div style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Known perks found
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Select the benefits you have on this card. You can edit amounts later.
            </div>

            {suggestedPerks.map((perk, i) => (
              <div key={i}
                onClick={() => setSelectedPerkIndices(prev =>
                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                )}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px',
                  border: selectedPerkIndices.includes(i) ? `2px solid var(--green)` : `1.5px solid var(--border)`,
                  background: selectedPerkIndices.includes(i) ? 'var(--green)' : 'transparent',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{perk.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
        {tourIndex === null && (step === 3 || (step === 2 && (!suggestedPerks || suggestedPerks.length === 0))) && (
          <div style={{ textAlign: 'center' }}>
            <StepIndicator current={totalSteps - 1} total={totalSteps} />

            <div style={{ fontSize: '44px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              You&apos;re all set
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.6' }}>
              Here&apos;s how to use Clavis at checkout
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px', textAlign: 'left' }}>
              {[
                { step: '1', text: "Type where you're shopping in the search bar" },
                { step: '2', text: 'Clavis shows your best card instantly' },
                { step: '3', text: "Tap the card and go — that's it" },
              ].map(item => (
                <div key={item.step} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  background: 'var(--bg-elevated)', borderRadius: '8px', padding: '12px 14px',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700', color: 'var(--gold)',
                  }}>
                    {item.step}
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', lineHeight: '1.5', paddingTop: '2px' }}>
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

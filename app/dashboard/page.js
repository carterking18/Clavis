'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, updateCardBalance, addMultipliers, updateCardMultipliers, addPerk, updatePerk, deletePerk } from '../../lib/cards'
import { getCardDesign } from '../../lib/cardImages'
import { getSuggestedMultipliers } from '../../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../../lib/cardPerks'
import { searchMerchants } from '../../lib/merchants'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

function CardArt({ name, style = {} }) {
  const design = getCardDesign(name)
  return (
    <div style={{
      borderRadius: '8px',
      background: `linear-gradient(135deg, ${design.gradient[0]}, ${design.gradient[1]})`,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...style
    }}>
      {design.chip && (
        <div style={{ width: '20px', height: '14px', borderRadius: '3px', background: 'rgba(255,255,255,0.25)', border: '0.5px solid rgba(255,255,255,0.15)' }} />
      )}
      {design.network && (
        <div style={{ alignSelf: 'flex-end', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em', marginTop: 'auto' }}>
          {design.network}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [tab, setTab] = useState('tap')
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('dining')
  const [selectedAmt, setSelectedAmt] = useState(0)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [tapConfirm, setTapConfirm] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddPerk, setShowAddPerk] = useState(false)
  const [showRankings, setShowRankings] = useState(false)
  const [merchantQuery, setMerchantQuery] = useState('')
  const [merchantSuggestions, setMerchantSuggestions] = useState([])
  const [detectedMerchant, setDetectedMerchant] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [editMultipliers, setEditMultipliers] = useState({})
  const [suggestedPerks, setSuggestedPerks] = useState(null)
  const [pendingCardId, setPendingCardId] = useState(null)
  const [selectedPerkIndices, setSelectedPerkIndices] = useState([])
  const [emptyGiftCards, setEmptyGiftCards] = useState([])
  const [emptyGiftCardIndex, setEmptyGiftCardIndex] = useState(0)
  const [addingToCardId, setAddingToCardId] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const [newCard, setNewCard] = useState({
    name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a',
    balance: '', balance_unit: 'points',
    multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' }
  })

  const [newPerk, setNewPerk] = useState({
    name: '', total_amount: '', used_amount: '0', period: 'monthly', resets_at: ''
  })

  const loadCards = useCallback(async () => {
    try {
      const data = await getUserCards()
      setCards(data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      loadCards().then(() => setLoading(false))
    })
  }, [router, loadCards])

  useEffect(() => {
    if (!cards.length) return
    const empty = cards.filter(c => c.type === 'gift' && (c.balance || 0) <= 0)
    if (empty.length > 0) { setEmptyGiftCards(empty); setEmptyGiftCardIndex(0) }
  }, [cards])

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) } })
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [tab, cards, showAddCard, showAddPerk])

  function scoreCard(card) {
    const mult = card.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
    const perks = card.perks || []
    const activePerks = perks.filter(p => p.used_amount < p.total_amount)
    const expiringPerks = activePerks.filter(p => {
      if (!p.resets_at) return false
      const days = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
      return days <= 14 && days > 0
    })
    const isGiftWithBalance = card.type === 'gift' && (card.balance || 0) > 0
    let score = mult
    score += activePerks.length * 2
    score += expiringPerks.length * 3
    if (isGiftWithBalance) score += 10
    const reasons = []
    if (mult > 0) reasons.push(isCashBack(card) ? `${mult}% back` : `${mult}x ${selectedCat}`)
    if (expiringPerks.length > 0) reasons.push(`${expiringPerks.length} perk${expiringPerks.length > 1 ? 's' : ''} expiring soon`)
    else if (activePerks.length > 0) reasons.push(`${activePerks.length} active perk${activePerks.length > 1 ? 's' : ''}`)
    if (isGiftWithBalance) reasons.push(`$${card.balance} gift balance`)
    return { card, score, reasons }
  }

  function getRankedCards() { return [...cards].map(scoreCard).sort((a, b) => b.score - a.score) }
  function getBestCard() { if (!cards.length) return null; return getRankedCards()[0].card }
  function getActiveCard() {
    if (selectedCardId) return cards.find(c => c.id === selectedCardId) || getBestCard()
    return getBestCard()
  }
  function getMultiplier(card) {
    if (!card) return 0
    return card.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
  }
  function isCashBack(card) { return card?.balance_unit === 'cash back' || card?.balance_unit === 'dollars' }
  function formatRate(card, mult) {
    if (mult <= 0) return null
    return isCashBack(card) ? mult + '%' : mult + 'x pts'
  }

  async function simulateTap() {
    const card = getActiveCard()
    if (!card) return
    const mult = getMultiplier(card)
    if (card.type === 'gift') {
      const currentBalance = card.balance || 0
      const charge = Math.min(selectedAmt, currentBalance)
      const newBalance = Math.max(0, currentBalance - charge)
      await updateCardBalance(card.id, newBalance)
      await loadCards()
      setTapConfirm(`Tapped ${card.name} · $${charge.toFixed(2)} charged · $${newBalance.toFixed(2)} remaining`)
    } else {
      const rate = formatRate(card, mult)
      setTapConfirm(`Tapped as ${card.name} · ${rate ? `${rate} on $${selectedAmt}` : 'card charged'} · Transaction complete`)
    }
    setTimeout(() => setTapConfirm(''), 3500)
  }

  async function handleAddCard() {
    if (!newCard.name) return
    try {
      const created = await addCard({
        name: newCard.name, type: newCard.type, network: newCard.network,
        last_four: newCard.last_four, color: newCard.color,
        balance: parseFloat(newCard.balance) || 0, balance_unit: newCard.balance_unit
      })
      const mults = {}
      CATEGORIES.forEach(cat => { if (newCard.multipliers[cat]) mults[cat] = newCard.multipliers[cat] })
      if (Object.keys(mults).length) await addMultipliers(created.id, mults)
      await loadCards()
      setShowAddCard(false)
      const perks = getSuggestedPerks(newCard.name)
      setNewCard({ name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a', balance: '', balance_unit: 'points', multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' } })
      if (perks && perks.length > 0) { setSuggestedPerks(perks); setPendingCardId(created.id); setSelectedPerkIndices(perks.map((_, i) => i)) }
    } catch (e) { console.error(e) }
  }

  async function handleAddSuggestedPerks() {
    if (!pendingCardId || !suggestedPerks) return
    try {
      for (const i of selectedPerkIndices) {
        const p = suggestedPerks[i]
        await addPerk({ name: p.name, total_amount: p.total_amount, used_amount: 0, period: p.period, resets_at: calculateResetsAt(p.period), card_id: pendingCardId })
      }
      await loadCards()
    } catch (e) { console.error(e) }
    setSuggestedPerks(null); setPendingCardId(null); setSelectedPerkIndices([])
  }

  async function handleAddPerk() {
    if (!newPerk.name || !newPerk.total_amount || !addingToCardId) return
    try {
      await addPerk({ ...newPerk, card_id: addingToCardId, total_amount: parseFloat(newPerk.total_amount), used_amount: parseFloat(newPerk.used_amount) || 0 })
      await loadCards()
      setShowAddPerk(false)
      setNewPerk({ name: '', total_amount: '', used_amount: '0', period: 'monthly', resets_at: '' })
    } catch (e) { console.error(e) }
  }

  function openEditCard(card) {
    const mults = {}
    CATEGORIES.forEach(cat => { const m = card.multipliers?.find(m => m.category === cat); mults[cat] = m ? String(m.multiplier) : '' })
    setEditMultipliers(mults); setEditingCard(card)
  }

  async function handleSaveEdit() {
    if (!editingCard) return
    try { await updateCardMultipliers(editingCard.id, editMultipliers); await loadCards(); setEditingCard(null) } catch (e) { console.error(e) }
  }

  async function handleUpdatePerkUsed(perkId, usedAmount) {
    try { await updatePerk(perkId, { used_amount: parseFloat(usedAmount) }); await loadCards() } catch (e) { console.error(e) }
  }

  async function sendEmail() {
    if (!user) return
    setEmailSending(true); setEmailMsg('')
    const allPerks = cards.flatMap(c => c.perks || [])
    try {
      const res = await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, perks: allPerks }) })
      const data = await res.json()
      setEmailMsg(data.message === 'Email sent' ? 'Email sent! Check your inbox.' : 'No expiring perks to report right now.')
    } catch (e) { setEmailMsg('Failed to send email.') }
    setEmailSending(false)
  }

  const activeCard = getActiveCard()
  const allPerks = cards.flatMap(c => c.perks || [])
  const expiringPerks = allPerks.filter(p => {
    if (!p.resets_at) return false
    const days = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
    return days <= 14 && days > 0
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Loading your wallet...</p>
    </div>
  )

  // Shared modal sheet style
  const sheetStyle = {
    background: '#2a2a2e',
    borderRadius: '20px 20px 0 0',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
    border: '1px solid rgba(255,255,255,0.08)',
    borderBottom: 'none',
  }

  return (
    <div className="app">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.03em', color: '#f5f5f5' }}>
          Cla<span style={{ color: '#e8b84b' }}>vis</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
          style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          Sign out
        </button>
      </div>

      {/* Segmented tab bar */}
      <div className="tab-bar">
        {['tap', 'wallet', 'perks'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'tap' ? 'Smart Tap' : t === 'wallet' ? 'My Wallet' : 'Perks'}
          </button>
        ))}
      </div>

      {/* ── SMART TAP ─────────────────────────────────── */}
      {tab === 'tap' && (
        <div>
          {/* Active card panel */}
          <div data-reveal style={{ background: 'linear-gradient(145deg, #2a2a2e 0%, #212124 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase' }}>
              Active Card
            </div>
            <div style={{ fontSize: '19px', fontWeight: '700', color: '#f5f5f5', marginBottom: '3px', letterSpacing: '-0.02em' }}>
              {activeCard ? activeCard.name : 'No card selected'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>
              {activeCard ? `${selectedCat} · ${selectedCardId ? 'Manually selected' : 'Auto-selected'}` : 'Add a card to begin'}
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Earning this purchase
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#e8b84b', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {activeCard
                    ? (activeCard.type === 'gift'
                        ? `$${(activeCard.balance || 0).toFixed(2)}`
                        : getMultiplier(activeCard) > 0
                          ? formatRate(activeCard, getMultiplier(activeCard))
                          : isCashBack(activeCard) ? '1%' : '1x pts')
                    : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '3px' }}>
                  {activeCard?.type === 'gift' ? 'balance remaining' : 'per dollar'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em' }}>
                {activeCard?.last_four ? `•••• ${activeCard.last_four}` : ''}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={simulateTap} disabled={!activeCard} style={{ marginBottom: '6px' }}>
            ◉ &nbsp;Hold to Tap Clavis
          </button>

          {cards.length > 1 && (
            <button onClick={() => setShowRankings(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontSize: '13px', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', marginBottom: '16px', padding: '4px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
            >
              See card rankings
            </button>
          )}

          {/* Merchant search */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', border: detectedMerchant ? '1px solid rgba(48,201,138,0.4)' : '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.28)', marginBottom: '5px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Where are you shopping?
              </div>
              <input
                type="text"
                placeholder="e.g. Starbucks, Target, Shell..."
                value={merchantQuery}
                onChange={e => {
                  const q = e.target.value
                  setMerchantQuery(q)
                  setMerchantSuggestions(searchMerchants(q))
                  if (!q) setDetectedMerchant(null)
                }}
                style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '15px', fontWeight: '600', color: '#f5f5f5', fontFamily: 'inherit', outline: 'none' }}
              />
              {detectedMerchant && (
                <div style={{ fontSize: '12px', color: '#30c98a', marginTop: '5px' }}>
                  → {detectedMerchant.category.charAt(0).toUpperCase() + detectedMerchant.category.slice(1)} category auto-selected
                </div>
              )}
            </div>
            {merchantSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#2d2d2f', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px', zIndex: 50, overflow: 'hidden' }}>
                {merchantSuggestions.map(m => (
                  <div key={m.name} onClick={() => {
                    setMerchantQuery(m.name); setDetectedMerchant(m)
                    setSelectedCat(m.category); setSelectedCardId(null); setMerchantSuggestions([])
                  }} style={{ padding: '11px 14px', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: '600', color: '#f5f5f5' }}>{m.name}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: '6px' }}>{m.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category + Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[
              {
                label: 'Category',
                content: (
                  <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedCardId(null); setDetectedMerchant(null) }}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#f5f5f5', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                )
              },
              {
                label: 'Amount',
                content: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.35)' }}>$</span>
                    <input type="number" min="0" placeholder="0" value={selectedAmt || ''}
                      onChange={e => setSelectedAmt(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#f5f5f5', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                )
              }
            ].map(({ label, content }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.28)', marginBottom: '5px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
                {content}
              </div>
            ))}
          </div>

          {/* Card list */}
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              No cards yet. Go to My Wallet to add your first card.
            </div>
          ) : (
            getRankedCards().map(({ card }, i) => {
              const mult = getMultiplier(card)
              const isGift = card.type === 'gift'
              const hasGiftBalance = isGift && (card.balance || 0) > 0
              const isBest = i === 0 && (mult > 0 || hasGiftBalance)
              const isSelected = selectedCardId === card.id
              return (
                <div key={card.id} data-reveal onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  style={{
                    borderRadius: '12px',
                    border: isSelected
                      ? '1.5px solid rgba(91,156,246,0.55)'
                      : isBest
                        ? '1.5px solid rgba(232,184,75,0.45)'
                        : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected
                      ? 'rgba(91,156,246,0.06)'
                      : isBest
                        ? 'rgba(232,184,75,0.05)'
                        : 'rgba(255,255,255,0.04)',
                    padding: '12px 14px',
                    marginBottom: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}>
                  <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isBest && (
                      <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: '700', color: '#e8b84b', background: 'rgba(232,184,75,0.15)', borderRadius: '5px', padding: '1px 6px', marginBottom: '4px', letterSpacing: '0.04em' }}>
                        Best
                      </div>
                    )}
                    {isSelected && !isBest && (
                      <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: '700', color: '#5b9cf6', background: 'rgba(91,156,246,0.15)', borderRadius: '5px', padding: '1px 6px', marginBottom: '4px', letterSpacing: '0.04em' }}>
                        Selected
                      </div>
                    )}
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{card.type}{isGift ? '' : ` · ${card.balance_unit}`}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isGift ? (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: hasGiftBalance ? '#30c98a' : 'rgba(255,255,255,0.25)' }}>${(card.balance || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{hasGiftBalance ? 'remaining' : 'empty'}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: mult > 0 ? '#e8b84b' : 'rgba(255,255,255,0.22)' }}>{mult > 0 ? formatRate(card, mult) : '—'}</div>
                        {mult > 0 && selectedAmt > 0 && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>≈ ${(selectedAmt * mult * 0.01).toFixed(2)} back</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {tapConfirm && <div className="success" style={{ marginTop: '1rem', textAlign: 'center' }}>{tapConfirm}</div>}
        </div>
      )}

      {/* ── MY WALLET ─────────────────────────────────── */}
      {tab === 'wallet' && (
        <div>
          {/* Stats */}
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px', marginBottom: '1.5rem' }}>
            {[
              { label: 'Cards', value: cards.length },
              { label: 'Gift value', value: '$' + cards.filter(c => c.type === 'gift').reduce((s, c) => s + (c.balance || 0), 0).toFixed(0) },
              { label: 'Active perks', value: allPerks.filter(p => p.used_amount < p.total_amount).length }
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#f5f5f5', marginBottom: '4px' }}>{m.value}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '1rem' }}>
              No cards yet. Add your first one below.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px', marginBottom: '1.5rem' }}>
              {cards.map(card => (
                <div key={card.id} data-reveal className="card">
                  <CardArt name={card.name} style={{ height: '56px', marginBottom: '10px' }} />
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginBottom: '3px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {card.type}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f5f5f5', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                    {card.balance} {card.balance_unit}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setAddingToCardId(card.id); setShowAddPerk(true) }}
                      style={{ flex: 1, padding: '6px 4px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontWeight: '600', transition: 'border-color 0.15s, color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#f5f5f5' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
                      + perk
                    </button>
                    <button onClick={() => openEditCard(card)}
                      style={{ padding: '6px 9px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontWeight: '600', transition: 'border-color 0.15s, color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#f5f5f5' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
                      edit
                    </button>
                    <button onClick={() => deleteCard(card.id).then(loadCards)}
                      style={{ padding: '6px 9px', fontSize: '11px', border: '1px solid rgba(224,92,92,0.3)', borderRadius: '7px', background: 'transparent', cursor: 'pointer', color: '#e05c5c', fontWeight: '600', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(224,92,92,0.6)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(224,92,92,0.3)'}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn-primary" onClick={() => setShowAddCard(true)}>
            + Add card
          </button>

          {/* Add card form */}
          {showAddCard && (
            <div data-reveal style={{ marginTop: '14px', background: '#2a2a2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#f5f5f5', marginBottom: '1.125rem' }}>Add a card</div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Card name</label>
                <input className="input" placeholder="e.g. Amex Gold" value={newCard.name} onChange={e => {
                  const name = e.target.value
                  const suggestion = getSuggestedMultipliers(name)
                  if (suggestion) {
                    const mults = {}
                    CATEGORIES.forEach(cat => { mults[cat] = String(suggestion.multipliers[cat] ?? '') })
                    setNewCard(prev => ({ ...prev, name, multipliers: mults, _suggestion: suggestion.note }))
                  } else {
                    setNewCard(prev => ({ ...prev, name, _suggestion: null }))
                  }
                }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Type</label>
                <select className="input" value={newCard.type} onChange={e => setNewCard({ ...newCard, type: e.target.value })}>
                  <option value="credit">Credit card</option>
                  <option value="loyalty">Loyalty card</option>
                  <option value="gift">Gift card</option>
                  <option value="store">Store credit card</option>
                </select>
              </div>

              {newCard.name && (
                <div style={{ marginBottom: '12px' }}>
                  <CardArt name={newCard.name} style={{ height: '64px' }} />
                </div>
              )}

              {newCard.type === 'gift' && (
                <div style={{ marginBottom: '12px' }}>
                  <label className="label">Remaining balance ($)</label>
                  <input className="input" type="number" placeholder="0.00" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value, balance_unit: 'dollars' })} />
                </div>
              )}

              {newCard.type === 'loyalty' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="label">Points / miles balance</label>
                    <input className="input" type="number" placeholder="0" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                      <option value="points">Points</option>
                      <option value="miles">Miles</option>
                      <option value="stars">Stars</option>
                    </select>
                  </div>
                </div>
              )}

              {(newCard.type === 'credit' || newCard.type === 'store') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label className="label">Last 4 digits</label>
                      <input className="input" placeholder="4821" maxLength={4} value={newCard.last_four} onChange={e => setNewCard({ ...newCard, last_four: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Rewards unit</label>
                      <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                        <option value="cash back">Cash back (%)</option>
                        <option value="points">Points</option>
                        <option value="miles">Miles</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Rewards rate</label>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', lineHeight: '1.5' }}>
                      Cash back: enter % (e.g. 1.5). Points: enter multiplier (e.g. 3 for 3x).
                    </div>
                    {newCard._suggestion && (
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#5b9cf6', background: 'rgba(91,156,246,0.1)', border: '1px solid rgba(91,156,246,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
                        ✦ Rates auto-filled — {newCard._suggestion}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>Apply to all categories</span>
                      <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '5px 8px', fontSize: '13px', flex: 1 }}
                        onChange={e => {
                          const val = e.target.value
                          const filled = {}
                          CATEGORIES.forEach(cat => { filled[cat] = val })
                          setNewCard({ ...newCard, multipliers: filled })
                        }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Or per category:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CATEGORIES.map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', width: '68px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                          <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 8px', fontSize: '13px' }}
                            value={newCard.multipliers[cat]} onChange={e => setNewCard({ ...newCard, multipliers: { ...newCard.multipliers, [cat]: e.target.value } })} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={handleAddCard}>Save card</button>
                <button className="btn-secondary" onClick={() => setShowAddCard(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Add perk form */}
          {showAddPerk && (
            <div data-reveal style={{ marginTop: '14px', background: '#2a2a2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#f5f5f5', marginBottom: '4px' }}>Add a perk</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.125rem' }}>
                <CardArt name={cards.find(c => c.id === addingToCardId)?.name || ''} style={{ width: '28px', height: '20px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>
                  {cards.find(c => c.id === addingToCardId)?.name}
                </span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Perk name</label>
                <input className="input" placeholder="e.g. Saks Fifth Avenue credit" value={newPerk.name} onChange={e => setNewPerk({ ...newPerk, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Total amount ($)</label>
                  <input className="input" type="number" placeholder="50" value={newPerk.total_amount} onChange={e => setNewPerk({ ...newPerk, total_amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Already used ($)</label>
                  <input className="input" type="number" placeholder="0" value={newPerk.used_amount} onChange={e => setNewPerk({ ...newPerk, used_amount: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Reset period</label>
                  <select className="input" value={newPerk.period} onChange={e => setNewPerk({ ...newPerk, period: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Expiry / reset date</label>
                  <input className="input" type="date" value={newPerk.resets_at} onChange={e => setNewPerk({ ...newPerk, resets_at: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={handleAddPerk}>Save perk</button>
                <button className="btn-secondary" onClick={() => setShowAddPerk(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PERKS ─────────────────────────────────────── */}
      {tab === 'perks' && (
        <div>
          {expiringPerks.length > 0 && (
            <div data-reveal style={{ background: 'rgba(224,154,58,0.1)', border: '1px solid rgba(224,154,58,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: '#e09a3a', fontWeight: '500' }}>
              ⚠ {expiringPerks.length} credit{expiringPerks.length > 1 ? 's' : ''} expiring within 14 days — use them now.
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <button className="btn-primary" onClick={sendEmail} disabled={emailSending}>
              {emailSending ? 'Sending...' : 'Email me my perk summary'}
            </button>
          </div>
          {emailMsg && <div className="success">{emailMsg}</div>}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              No cards yet. Add cards in My Wallet to track perks.
            </div>
          ) : cards.map(card => {
            const cardPerks = card.perks || []
            if (cardPerks.length === 0) return null
            return (
              <div key={card.id} data-reveal style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CardArt name={card.name} style={{ width: '32px', height: '22px', flexShrink: 0 }} />
                  {card.name}
                </div>
                <div className="card" style={{ padding: '0 1.125rem' }}>
                  {cardPerks.map((perk, pi) => {
                    const remaining = perk.total_amount - perk.used_amount
                    const pct = Math.min((perk.used_amount / perk.total_amount) * 100, 100)
                    const daysLeft = perk.resets_at ? Math.ceil((new Date(perk.resets_at) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    const isExpiring = daysLeft !== null && daysLeft <= 14 && daysLeft > 0
                    const isUsed = remaining <= 0
                    const accent = isUsed ? '#e05c5c' : isExpiring ? '#e09a3a' : '#30c98a'
                    return (
                      <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: pi < cardPerks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f5f5f5', marginBottom: '3px' }}>{perk.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                            {perk.period}{daysLeft !== null ? ` · ${isExpiring ? `⚠ ${daysLeft}d left` : `resets in ${daysLeft}d`}` : ''}
                          </div>
                          <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                            <div style={{ height: '3px', borderRadius: '2px', width: pct + '%', background: accent, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: accent, marginBottom: '5px' }}>
                            {isUsed ? 'Used' : `$${remaining.toFixed(0)} left`}
                          </div>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                            {!isUsed && (
                              <button onClick={() => handleUpdatePerkUsed(perk.id, perk.total_amount)}
                                style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontWeight: '600', transition: 'border-color 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                                mark used
                              </button>
                            )}
                            <button onClick={() => deletePerk(perk.id).then(loadCards)}
                              style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid rgba(224,92,92,0.3)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#e05c5c', fontWeight: '600', transition: 'border-color 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(224,92,92,0.6)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(224,92,92,0.3)'}>
                              remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────── */}

      {/* Empty gift card */}
      {emptyGiftCards.length > 0 && emptyGiftCards[emptyGiftCardIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#2a2a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <CardArt name={emptyGiftCards[emptyGiftCardIndex].name} style={{ height: '64px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5', marginBottom: '6px' }}>
              {emptyGiftCards[emptyGiftCardIndex].name} is empty
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
              This gift card has a $0 balance. Would you like to remove it from your wallet?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ background: '#e05c5c' }} onClick={async () => {
                await deleteCard(emptyGiftCards[emptyGiftCardIndex].id)
                await loadCards()
                const remaining = emptyGiftCards.filter((_, i) => i !== emptyGiftCardIndex)
                setEmptyGiftCards(remaining); setEmptyGiftCardIndex(0)
              }}>Remove card</button>
              <button className="btn-secondary" onClick={() => {
                const remaining = emptyGiftCards.filter((_, i) => i !== emptyGiftCardIndex)
                setEmptyGiftCards(remaining); setEmptyGiftCardIndex(0)
              }}>Keep it</button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested perks sheet */}
      {suggestedPerks && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={sheetStyle}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5', marginBottom: '4px' }}>Known perks found</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem' }}>Select the perks you have on this card. You can edit amounts later.</div>
            {suggestedPerks.map((perk, i) => (
              <div key={i} onClick={() => setSelectedPerkIndices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: selectedPerkIndices.includes(i) ? '2px solid #30c98a' : '1.5px solid rgba(255,255,255,0.2)', background: selectedPerkIndices.includes(i) ? '#30c98a' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5' }}>{perk.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{perk.period}{perk.total_amount > 0 ? ` · $${perk.total_amount}` : ''}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
              <button className="btn-primary" onClick={handleAddSuggestedPerks}>Add {selectedPerkIndices.length} perk{selectedPerkIndices.length !== 1 ? 's' : ''}</button>
              <button className="btn-secondary" onClick={() => { setSuggestedPerks(null); setPendingCardId(null); setSelectedPerkIndices([]) }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Rankings sheet */}
      {showRankings && (
        <div onClick={() => setShowRankings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ ...sheetStyle, maxHeight: '70vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5' }}>Card rankings</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1)} · ${selectedAmt}</div>
              </div>
              <button onClick={() => setShowRankings(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {getRankedCards().map(({ card, score, reasons }, i) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#e8b84b' : 'rgba(255,255,255,0.22)', width: '22px', flexShrink: 0 }}>#{i + 1}</div>
                <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{reasons.length > 0 ? reasons.join(' · ') : 'No rewards for this category'}</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#e8b84b' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                  {score > 0 ? score.toFixed(1) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit card sheet */}
      {editingCard && (
        <div onClick={() => setEditingCard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={sheetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5' }}>Edit {editingCard.name}</div>
              <button onClick={() => setEditingCard(null)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <CardArt name={editingCard.name} style={{ height: '56px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', lineHeight: '1.5' }}>
              Cash back: enter % (e.g. 1.5). Points/miles: enter multiplier (e.g. 3 for 3x).
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>Apply to all categories</span>
              <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '5px 8px', fontSize: '13px', flex: 1 }}
                onChange={e => { const val = e.target.value; const filled = {}; CATEGORIES.forEach(cat => { filled[cat] = val }); setEditMultipliers(filled) }} />
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Or per category:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', width: '68px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 8px', fontSize: '13px' }}
                    value={editMultipliers[cat] || ''} onChange={e => setEditMultipliers({ ...editMultipliers, [cat]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={handleSaveEdit}>Save changes</button>
              <button className="btn-secondary" onClick={() => setEditingCard(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

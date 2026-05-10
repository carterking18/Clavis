'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, updateCardBalance, addMultipliers, updateCardMultipliers, addPerk, updatePerk, deletePerk } from '../../lib/cards'
import { getCardDesign } from '../../lib/cardImages'
import { getSuggestedMultipliers } from '../../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../../lib/cardPerks'
import { searchMerchants, getMerchantCategory } from '../../lib/merchants'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

function CardArt({ name, style = {} }) {
  const design = getCardDesign(name)
  return (
    <div style={{
      borderRadius: '4px',
      background: `linear-gradient(135deg, ${design.gradient[0]}, ${design.gradient[1]})`,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...style
    }}>
      {design.chip && (
        <div style={{ width: '18px', height: '13px', borderRadius: '2px', background: 'rgba(255,255,255,0.22)', border: '0.5px solid rgba(255,255,255,0.12)' }} />
      )}
      {design.network && (
        <div style={{ alignSelf: 'flex-end', fontSize: '8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginTop: 'auto', fontFamily: "'SF Mono', monospace" }}>
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
  const newCardDesign = getCardDesign(newCard.name)

  const [newPerk, setNewPerk] = useState({
    name: '', total_amount: '', used_amount: '0', period: 'monthly', resets_at: ''
  })

  const loadCards = useCallback(async () => {
    try {
      const data = await getUserCards()
      setCards(data)
    } catch (e) {
      console.error(e)
    }
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
    if (empty.length > 0) {
      setEmptyGiftCards(empty)
      setEmptyGiftCardIndex(0)
    }
  }, [cards])

  // Scroll reveal via IntersectionObserver
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' })
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

  function getRankedCards() {
    return [...cards].map(scoreCard).sort((a, b) => b.score - a.score)
  }

  function getBestCard() {
    if (!cards.length) return null
    return getRankedCards()[0].card
  }

  function getActiveCard() {
    if (selectedCardId) return cards.find(c => c.id === selectedCardId) || getBestCard()
    return getBestCard()
  }

  function getMultiplier(card) {
    if (!card) return 0
    return card.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
  }

  function isCashBack(card) {
    return card?.balance_unit === 'cash back' || card?.balance_unit === 'dollars'
  }

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
      if (perks && perks.length > 0) {
        setSuggestedPerks(perks)
        setPendingCardId(created.id)
        setSelectedPerkIndices(perks.map((_, i) => i))
      }
    } catch (e) { console.error(e) }
  }

  async function handleAddSuggestedPerks() {
    if (!pendingCardId || !suggestedPerks) return
    try {
      const { data: { user } } = await (await import('../../lib/supabase')).supabase.auth.getUser()
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
      await loadCards()
    } catch (e) { console.error(e) }
    setSuggestedPerks(null)
    setPendingCardId(null)
    setSelectedPerkIndices([])
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
    CATEGORIES.forEach(cat => {
      const m = card.multipliers?.find(m => m.category === cat)
      mults[cat] = m ? String(m.multiplier) : ''
    })
    setEditMultipliers(mults)
    setEditingCard(card)
  }

  async function handleSaveEdit() {
    if (!editingCard) return
    try {
      await updateCardMultipliers(editingCard.id, editMultipliers)
      await loadCards()
      setEditingCard(null)
    } catch (e) { console.error(e) }
  }

  async function handleUpdatePerkUsed(perkId, usedAmount) {
    try {
      await updatePerk(perkId, { used_amount: parseFloat(usedAmount) })
      await loadCards()
    } catch (e) { console.error(e) }
  }

  async function sendEmail() {
    if (!user) return
    setEmailSending(true)
    setEmailMsg('')
    const allPerks = cards.flatMap(c => c.perks || [])
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, perks: allPerks })
      })
      const data = await res.json()
      setEmailMsg(data.message === 'Email sent' ? 'Email sent! Check your inbox.' : 'No expiring perks to report right now.')
    } catch (e) { setEmailMsg('Failed to send email.') }
    setEmailSending(false)
  }

  const activeCard = getActiveCard()
  const bestCard = getBestCard()
  const allPerks = cards.flatMap(c => c.perks || [])
  const expiringPerks = allPerks.filter(p => {
    if (!p.resets_at) return false
    const days = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
    return days <= 14 && days > 0
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.18)' }}>CLAVIS</div>
      <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em' }}>LOADING WALLET...</div>
    </div>
  )

  return (
    <div className="app">

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '0.14em', color: '#f0f0f0' }}>
          CLA<span style={{ color: '#c8a84b' }}>VIS</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
          style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
        >
          Sign Out
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div className="tab-bar">
        {['tap', 'wallet', 'perks'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'tap' ? 'Smart Tap' : t === 'wallet' ? 'My Wallet' : 'Perks'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* SMART TAP TAB                                      */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'tap' && (
        <div>

          {/* Active card display */}
          <div data-reveal style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', padding: '1.375rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
            {/* Subtle grid overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.013) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.013) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.125rem' }}>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em' }}>ACTIVE CARD</div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.18em' }}>CLAVIS</div>
              </div>

              <div style={{ marginBottom: '1.125rem' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#f0f0f0', marginBottom: '5px', letterSpacing: '-0.01em' }}>
                  {activeCard ? activeCard.name : 'No card selected'}
                </div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.1em' }}>
                  {activeCard
                    ? `${selectedCat.toUpperCase()} · ${selectedCardId ? 'MANUAL SELECT' : 'AUTO-OPTIMIZED'}`
                    : 'ADD A CARD TO BEGIN'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <div>
                  <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em', marginBottom: '5px' }}>EARNING THIS PURCHASE</div>
                  <div style={{ fontSize: '30px', fontWeight: '600', color: '#c8a84b', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {activeCard
                      ? (activeCard.type === 'gift'
                          ? `$${(activeCard.balance || 0).toFixed(2)}`
                          : getMultiplier(activeCard) > 0
                            ? formatRate(activeCard, getMultiplier(activeCard))
                            : isCashBack(activeCard) ? '1%' : '1x pts')
                      : '—'}
                  </div>
                  <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', marginTop: '4px' }}>
                    {activeCard?.type === 'gift' ? 'BALANCE REMAINING' : 'PER DOLLAR'}
                  </div>
                </div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                  {activeCard?.last_four ? `•••• ${activeCard.last_four}` : ''}
                </div>
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={simulateTap} disabled={!activeCard} style={{ marginBottom: '6px' }}>
            ◉ &nbsp;Hold to Tap Clavis
          </button>

          {cards.length > 1 && (
            <button
              onClick={() => setShowRankings(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', marginBottom: '1.5rem', padding: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >
              View Card Rankings →
            </button>
          )}

          {/* Merchant search */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{ background: '#0d0d0d', borderRadius: '2px', padding: '12px 14px', border: detectedMerchant ? '1px solid rgba(26,158,117,0.45)' : '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s' }}>
              <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginBottom: '6px', letterSpacing: '0.16em' }}>MERCHANT</div>
              <input
                type="text"
                placeholder="Starbucks, Target, Shell..."
                value={merchantQuery}
                onChange={e => {
                  const q = e.target.value
                  setMerchantQuery(q)
                  setMerchantSuggestions(searchMerchants(q))
                  if (!q) { setDetectedMerchant(null) }
                }}
                style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: '500', color: '#f0f0f0', fontFamily: 'inherit', outline: 'none' }}
              />
              {detectedMerchant && (
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: '#1a9e75', marginTop: '6px', letterSpacing: '0.06em' }}>
                  → {detectedMerchant.category.toUpperCase()} CATEGORY AUTO-SELECTED
                </div>
              )}
            </div>
            {merchantSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', borderRadius: '0 0 2px 2px', zIndex: 50, overflow: 'hidden' }}>
                {merchantSuggestions.map(m => (
                  <div key={m.name} onClick={() => {
                    setMerchantQuery(m.name)
                    setDetectedMerchant(m)
                    setSelectedCat(m.category)
                    setSelectedCardId(null)
                    setMerchantSuggestions([])
                  }} style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ color: '#f0f0f0', fontWeight: '500' }}>{m.name}</span>
                    <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{m.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category and Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
            <div style={{ background: '#0d0d0d', borderRadius: '2px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginBottom: '6px', letterSpacing: '0.16em' }}>CATEGORY</div>
              <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedCardId(null); setDetectedMerchant(null) }}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#f0f0f0', fontSize: '14px', fontWeight: '500', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ background: '#0d0d0d', borderRadius: '2px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginBottom: '6px', letterSpacing: '0.16em' }}>AMOUNT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.35)' }}>$</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={selectedAmt || ''}
                  onChange={e => setSelectedAmt(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#f0f0f0', fontSize: '14px', fontWeight: '500', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Card list */}
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em' }}>
              NO CARDS — ADD ONE IN MY WALLET
            </div>
          ) : (
            getRankedCards().map(({ card, score }, i) => {
              const mult = getMultiplier(card)
              const isGift = card.type === 'gift'
              const hasGiftBalance = isGift && (card.balance || 0) > 0
              const isBest = i === 0 && (mult > 0 || hasGiftBalance)
              const isSelected = selectedCardId === card.id
              return (
                <div key={card.id} data-reveal onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  style={{
                    border: isSelected
                      ? '1px solid rgba(74,143,255,0.5)'
                      : isBest
                        ? '1px solid rgba(200,168,75,0.35)'
                        : '1px solid rgba(255,255,255,0.07)',
                    background: isSelected
                      ? 'rgba(74,143,255,0.04)'
                      : isBest
                        ? 'rgba(200,168,75,0.04)'
                        : '#0d0d0d',
                    borderRadius: '2px',
                    padding: '1rem 1.125rem',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s'
                  }}>
                  <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isBest && (
                      <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '8px', color: '#c8a84b', letterSpacing: '0.16em', marginBottom: '4px' }}>◆ BEST</div>
                    )}
                    {isSelected && !isBest && (
                      <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '8px', color: '#4a8fff', letterSpacing: '0.16em', marginBottom: '4px' }}>◆ SELECTED</div>
                    )}
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f0', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>
                      {card.type}{isGift ? '' : ` · ${card.balance_unit}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isGift ? (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: hasGiftBalance ? '#1a9e75' : 'rgba(255,255,255,0.22)' }}>
                          ${(card.balance || 0).toFixed(2)}
                        </div>
                        <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', marginTop: '2px' }}>
                          {hasGiftBalance ? 'REMAINING' : 'EMPTY'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: mult > 0 ? '#c8a84b' : 'rgba(255,255,255,0.22)' }}>
                          {mult > 0 ? formatRate(card, mult) : '—'}
                        </div>
                        {mult > 0 && selectedAmt > 0 && (
                          <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', marginTop: '2px' }}>
                            ≈ ${(selectedAmt * mult * 0.01).toFixed(2)} back
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {tapConfirm && (
            <div className="success" style={{ marginTop: '1rem', textAlign: 'center' }}>{tapConfirm}</div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* MY WALLET TAB                                      */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'wallet' && (
        <div>
          {/* Stats row */}
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px', marginBottom: '1.5rem' }}>
            {[
              { label: 'Cards', value: cards.length },
              { label: 'Gift Value', value: '$' + cards.filter(c => c.type === 'gift').reduce((s, c) => s + (c.balance || 0), 0).toFixed(0) },
              { label: 'Active Perks', value: allPerks.filter(p => p.used_amount < p.total_amount).length }
            ].map(m => (
              <div key={m.label} style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: '#f0f0f0', marginBottom: '5px' }}>{m.value}</div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              NO CARDS — ADD YOUR FIRST BELOW
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px', marginBottom: '1.5rem' }}>
              {cards.map(card => (
                <div key={card.id} data-reveal className="card">
                  <CardArt name={card.name} style={{ height: '56px', marginBottom: '10px' }} />
                  <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginBottom: '4px', letterSpacing: '0.12em' }}>
                    {card.type.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </div>
                  <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginBottom: '10px', letterSpacing: '0.04em' }}>
                    {card.balance} {card.balance_unit}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => { setAddingToCardId(card.id); setShowAddPerk(true) }}
                      style={{ flex: 1, padding: '5px 4px', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', transition: 'border-color 0.15s, color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#f0f0f0' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}>
                      + PERK
                    </button>
                    <button onClick={() => openEditCard(card)}
                      style={{ padding: '5px 8px', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', transition: 'border-color 0.15s, color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#f0f0f0' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}>
                      EDIT
                    </button>
                    <button onClick={() => deleteCard(card.id).then(loadCards)}
                      style={{ padding: '5px 8px', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', border: '1px solid rgba(204,68,68,0.28)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: '#cc4444', letterSpacing: '0.08em', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(204,68,68,0.6)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(204,68,68,0.28)'}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn-primary" onClick={() => setShowAddCard(true)}>
            + Add Card
          </button>

          {/* Add card form */}
          {showAddCard && (
            <div data-reveal style={{ marginTop: '1.25rem', background: '#0d0d0d', borderRadius: '2px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.18em', marginBottom: '1.25rem' }}>ADD CARD</div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Card Name</label>
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
                  <label className="label">Remaining Balance ($)</label>
                  <input className="input" type="number" placeholder="0.00" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value, balance_unit: 'dollars' })} />
                </div>
              )}

              {newCard.type === 'loyalty' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="label">Points / Miles Balance</label>
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
                      <label className="label">Last 4 Digits</label>
                      <input className="input" placeholder="4821" maxLength={4} value={newCard.last_four} onChange={e => setNewCard({ ...newCard, last_four: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Rewards Unit</label>
                      <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                        <option value="cash back">Cash back (%)</option>
                        <option value="points">Points</option>
                        <option value="miles">Miles</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Rewards Rate</label>
                    <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginBottom: '10px', letterSpacing: '0.04em', lineHeight: '1.6' }}>
                      Cash back: enter % (e.g. 1.5 for 1.5%). Points: enter multiplier (e.g. 3 for 3x).
                    </div>
                    {newCard._suggestion && (
                      <div style={{ marginBottom: '10px', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: '#4a8fff', background: 'rgba(74,143,255,0.07)', border: '1px solid rgba(74,143,255,0.2)', borderRadius: '2px', padding: '8px 10px', letterSpacing: '0.04em' }}>
                        ✦ Rates auto-filled — {newCard._suggestion}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', padding: '10px 12px' }}>
                      <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.38)', flexShrink: 0, letterSpacing: '0.08em' }}>APPLY TO ALL</span>
                      <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '4px 8px', fontSize: '13px', flex: 1 }}
                        onChange={e => {
                          const val = e.target.value
                          const filled = {}
                          CATEGORIES.forEach(cat => { filled[cat] = val })
                          setNewCard({ ...newCard, multipliers: filled })
                        }} />
                    </div>
                    <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.22)', marginBottom: '8px', letterSpacing: '0.12em' }}>PER CATEGORY:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CATEGORIES.map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.38)', width: '60px', flexShrink: 0, letterSpacing: '0.06em' }}>{cat.toUpperCase()}</span>
                          <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 8px', fontSize: '13px' }}
                            value={newCard.multipliers[cat]} onChange={e => setNewCard({ ...newCard, multipliers: { ...newCard.multipliers, [cat]: e.target.value } })} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={handleAddCard}>Save Card</button>
                <button className="btn-secondary" onClick={() => setShowAddCard(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Add perk form */}
          {showAddPerk && (
            <div data-reveal style={{ marginTop: '1.25rem', background: '#0d0d0d', borderRadius: '2px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.18em', marginBottom: '4px' }}>ADD PERK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <CardArt name={cards.find(c => c.id === addingToCardId)?.name || ''} style={{ width: '28px', height: '20px', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f0' }}>{cards.find(c => c.id === addingToCardId)?.name}</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Perk Name</label>
                <input className="input" placeholder="e.g. Saks Fifth Avenue credit" value={newPerk.name} onChange={e => setNewPerk({ ...newPerk, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Total Amount ($)</label>
                  <input className="input" type="number" placeholder="50" value={newPerk.total_amount} onChange={e => setNewPerk({ ...newPerk, total_amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Already Used ($)</label>
                  <input className="input" type="number" placeholder="0" value={newPerk.used_amount} onChange={e => setNewPerk({ ...newPerk, used_amount: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Reset Period</label>
                  <select className="input" value={newPerk.period} onChange={e => setNewPerk({ ...newPerk, period: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Expiry / Reset Date</label>
                  <input className="input" type="date" value={newPerk.resets_at} onChange={e => setNewPerk({ ...newPerk, resets_at: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={handleAddPerk}>Save Perk</button>
                <button className="btn-secondary" onClick={() => setShowAddPerk(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* PERKS TAB                                          */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'perks' && (
        <div>
          {expiringPerks.length > 0 && (
            <div data-reveal style={{ background: 'rgba(200,115,10,0.08)', border: '1px solid rgba(200,115,10,0.3)', borderRadius: '2px', padding: '10px 14px', marginBottom: '1rem', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '11px', color: '#c8730a', letterSpacing: '0.06em' }}>
              ⚠ &nbsp;{expiringPerks.length} credit{expiringPerks.length > 1 ? 's' : ''} expiring within 14 days — use them now
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <button className="btn-primary" onClick={sendEmail} disabled={emailSending}>
              {emailSending ? 'Sending...' : 'Email Perk Summary'}
            </button>
          </div>
          {emailMsg && <div className="success" style={{ marginBottom: '1rem' }}>{emailMsg}</div>}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em' }}>
              NO CARDS — ADD CARDS IN MY WALLET
            </div>
          ) : cards.map(card => {
            const cardPerks = card.perks || []
            if (cardPerks.length === 0) return null
            return (
              <div key={card.id} data-reveal style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f0', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    const accentColor = isUsed ? '#cc4444' : isExpiring ? '#c8730a' : '#1a9e75'
                    return (
                      <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: pi < cardPerks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f0', marginBottom: '3px' }}>{perk.name}</div>
                          <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginBottom: '8px', letterSpacing: '0.08em' }}>
                            {perk.period.toUpperCase()}{daysLeft !== null ? ` · ${isExpiring ? `⚠ ${daysLeft}D LEFT` : `RESETS IN ${daysLeft}D`}` : ''}
                          </div>
                          <div style={{ height: '2px', background: 'rgba(255,255,255,0.07)', borderRadius: '1px', width: '100%' }}>
                            <div style={{ height: '2px', borderRadius: '1px', width: pct + '%', background: accentColor, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: accentColor, marginBottom: '5px' }}>
                            {isUsed ? 'USED' : `$${remaining.toFixed(0)}`}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            {!isUsed && (
                              <button onClick={() => handleUpdatePerkUsed(perk.id, perk.total_amount)}
                                style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', padding: '3px 7px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em', transition: 'border-color 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                                USED
                              </button>
                            )}
                            <button onClick={() => deletePerk(perk.id).then(loadCards)}
                              style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', padding: '3px 7px', border: '1px solid rgba(204,68,68,0.25)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: '#cc4444', letterSpacing: '0.06em', transition: 'border-color 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(204,68,68,0.6)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(204,68,68,0.25)'}>
                              ×
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

      {/* ══════════════════════════════════════════════════ */}
      {/* MODALS (root level — outside all tab conditionals) */}
      {/* ══════════════════════════════════════════════════ */}

      {/* Empty gift card prompt */}
      {emptyGiftCards.length > 0 && emptyGiftCards[emptyGiftCardIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '2px', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em', marginBottom: '1rem' }}>GIFT CARD EMPTY</div>
            <CardArt name={emptyGiftCards[emptyGiftCardIndex].name} style={{ height: '64px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#f0f0f0', marginBottom: '6px' }}>
              {emptyGiftCards[emptyGiftCardIndex].name}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem', lineHeight: '1.65' }}>
              This gift card has a $0 balance. Remove it from your wallet?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ background: '#cc4444' }} onClick={async () => {
                await deleteCard(emptyGiftCards[emptyGiftCardIndex].id)
                await loadCards()
                const remaining = emptyGiftCards.filter((_, i) => i !== emptyGiftCardIndex)
                setEmptyGiftCards(remaining)
                setEmptyGiftCardIndex(0)
              }}>
                Remove
              </button>
              <button className="btn-secondary" onClick={() => {
                const remaining = emptyGiftCards.filter((_, i) => i !== emptyGiftCardIndex)
                setEmptyGiftCards(remaining)
                setEmptyGiftCardIndex(0)
              }}>
                Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested perks bottom sheet */}
      {suggestedPerks && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)', borderTop: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none', borderRadius: '0', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em', marginBottom: '5px' }}>KNOWN PERKS DETECTED</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
              Select the perks active on this card. You can edit amounts anytime.
            </div>
            {suggestedPerks.map((perk, i) => (
              <div key={i} onClick={() => setSelectedPerkIndices(prev =>
                prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
              )} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '2px', border: selectedPerkIndices.includes(i) ? '1.5px solid #1a9e75' : '1px solid rgba(255,255,255,0.22)', background: selectedPerkIndices.includes(i) ? '#1a9e75' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '10px', fontWeight: '700', lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f0' }}>{perk.name}</div>
                  <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '3px', letterSpacing: '0.08em' }}>
                    {perk.period.toUpperCase()}{perk.total_amount > 0 ? ` · $${perk.total_amount}` : ''}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
              <button className="btn-primary" onClick={handleAddSuggestedPerks}>
                Add {selectedPerkIndices.length} Perk{selectedPerkIndices.length !== 1 ? 's' : ''}
              </button>
              <button className="btn-secondary" onClick={() => { setSuggestedPerks(null); setPendingCardId(null); setSelectedPerkIndices([]) }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card rankings bottom sheet */}
      {showRankings && (
        <div onClick={() => setShowRankings(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none', borderRadius: '0', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em', marginBottom: '5px' }}>CARD RANKINGS</div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em' }}>
                  {selectedCat.toUpperCase()} · ${selectedAmt}
                </div>
              </div>
              <button onClick={() => setShowRankings(false)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {getRankedCards().map(({ card, score, reasons }, i) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '12px', fontWeight: '700', color: i === 0 ? '#c8a84b' : 'rgba(255,255,255,0.2)', width: '24px', flexShrink: 0 }}>#{i + 1}</div>
                <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '3px', letterSpacing: '0.04em' }}>
                    {reasons.length > 0 ? reasons.join(' · ') : 'No rewards for this category'}
                  </div>
                </div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '12px', fontWeight: '600', color: i === 0 ? '#c8a84b' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                  {score > 0 ? score.toFixed(1) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit card bottom sheet */}
      {editingCard && (
        <div onClick={() => setEditingCard(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none', borderRadius: '0', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em', marginBottom: '5px' }}>EDIT CARD</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#f0f0f0' }}>{editingCard.name}</div>
              </div>
              <button onClick={() => setEditingCard(null)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <CardArt name={editingCard.name} style={{ height: '56px', marginBottom: '1rem' }} />
            <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginBottom: '10px', letterSpacing: '0.04em', lineHeight: '1.6' }}>
              Cash back: enter % (e.g. 1.5) · Points/miles: enter multiplier (e.g. 3)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', padding: '10px 12px' }}>
              <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.38)', flexShrink: 0, letterSpacing: '0.08em' }}>ALL CATEGORIES</span>
              <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '4px 8px', fontSize: '13px', flex: 1 }}
                onChange={e => {
                  const val = e.target.value
                  const filled = {}
                  CATEGORIES.forEach(cat => { filled[cat] = val })
                  setEditMultipliers(filled)
                }} />
            </div>
            <div style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.22)', marginBottom: '8px', letterSpacing: '0.12em' }}>PER CATEGORY:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: "'SF Mono', 'Menlo', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.38)', width: '60px', flexShrink: 0, letterSpacing: '0.06em' }}>{cat.toUpperCase()}</span>
                  <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 8px', fontSize: '13px' }}
                    value={editMultipliers[cat] || ''}
                    onChange={e => setEditMultipliers({ ...editMultipliers, [cat]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={handleSaveEdit}>Save Changes</button>
              <button className="btn-secondary" onClick={() => setEditingCard(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

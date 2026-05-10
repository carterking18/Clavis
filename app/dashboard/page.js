'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, updateCardBalance, addMultipliers, updateCardMultipliers, addPerk, updatePerk, deletePerk } from '../../lib/cards'
import { getCardDesign } from '../../lib/cardImages'
import { getSuggestedMultipliers } from '../../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../../lib/cardPerks'
import { searchMerchants } from '../../lib/merchants'
import { dollarValuePerDollar, formatValuePerDollar } from '../../lib/pointValues'
import { logTap, getTaps, deleteTap } from '../../lib/taps'
import { Onboarding } from '../onboarding'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

const CAT_META = {
  dining:    { icon: '🍽', label: 'Dining' },
  travel:    { icon: '✈', label: 'Travel' },
  hotel:     { icon: '🏨', label: 'Hotel' },
  grocery:   { icon: '🛒', label: 'Grocery' },
  gas:       { icon: '⛽', label: 'Gas' },
  streaming: { icon: '📺', label: 'Stream' },
  retail:    { icon: '🛍', label: 'Retail' },
  other:     { icon: '···', label: 'Other' },
}

function getSavedCategory() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('clavis_last_cat')
    if (saved && CATEGORIES.includes(saved)) return saved
  }
  return 'dining'
}

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

function TimeAgo({ dateStr }) {
  const date = new Date(dateStr)
  const now = new Date()
  const mins = Math.floor((now - date) / 60000)
  if (mins < 1) return <span>just now</span>
  if (mins < 60) return <span>{mins}m ago</span>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return <span>{hrs}h ago</span>
  const days = Math.floor(hrs / 24)
  if (days < 7) return <span>{days}d ago</span>
  return <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [tab, setTab] = useState('tap')
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState(getSavedCategory)
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
  const [taps, setTaps] = useState([])
  const [tapsLoading, setTapsLoading] = useState(false)
  const [expandedRoiId, setExpandedRoiId] = useState(null)
  const [missedInsight, setMissedInsight] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const [newCard, setNewCard] = useState({
    name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a',
    balance: '', balance_unit: 'points', annual_fee: '',
    multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' }
  })

  const [newPerk, setNewPerk] = useState({
    name: '', total_amount: '', used_amount: '0', period: 'monthly', resets_at: ''
  })

  const loadCards = useCallback(async () => {
    try { const data = await getUserCards(); setCards(data) } catch (e) { console.error(e) }
  }, [])

  const loadTaps = useCallback(async () => {
    setTapsLoading(true)
    try { const data = await getTaps(); setTaps(data) } catch (e) { console.error(e) }
    setTapsLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      Promise.all([loadCards(), loadTaps()]).then(([c]) => {
        setLoading(false)
        const seen = typeof window !== 'undefined' && localStorage.getItem('clavis_onboarded')
        if (!seen) setShowOnboarding(true)
      })
    })
  }, [router, loadCards, loadTaps])

  useEffect(() => {
    if (!cards.length) return
    const empty = cards.filter(c => c.type === 'gift' && (c.balance || 0) <= 0)
    if (empty.length > 0) { setEmptyGiftCards(empty); setEmptyGiftCardIndex(0) }
  }, [cards])

  useEffect(() => {
    if (tab === 'history') loadTaps()
  }, [tab, loadTaps])

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) } })
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [tab, cards, showAddCard, showAddPerk, taps])

  function pickCategory(cat) {
    setSelectedCat(cat)
    setSelectedCardId(null)
    setDetectedMerchant(null)
    if (typeof window !== 'undefined') localStorage.setItem('clavis_last_cat', cat)
  }

  function isCashBack(card) { return card?.balance_unit === 'cash back' || card?.balance_unit === 'dollars' }
  function getMultiplier(card) {
    if (!card) return 0
    return card.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
  }
  function formatRate(card, mult) {
    if (mult <= 0) return null
    return isCashBack(card) ? `${mult}%` : `${mult}x pts`
  }

  function scoreCard(card) {
    const mult = getMultiplier(card)
    // Normalize to dollar value per dollar spent for fair comparison
    const dollarVal = isCashBack(card)
      ? mult / 100
      : dollarValuePerDollar(card, mult)

    const perks = card.perks || []
    const activePerks = perks.filter(p => p.used_amount < p.total_amount)
    const expiringPerks = activePerks.filter(p => {
      if (!p.resets_at) return false
      const days = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
      return days <= 14 && days > 0
    })
    const isGiftWithBalance = card.type === 'gift' && (card.balance || 0) > 0

    let score = dollarVal * 100 // convert to cents for scoring clarity
    score += activePerks.length * 0.5
    score += expiringPerks.length * 1.5
    if (isGiftWithBalance) score += 5

    const reasons = []
    if (mult > 0) {
      const fvpd = formatValuePerDollar(card, mult)
      reasons.push(isCashBack(card) ? `${mult}% back` : `${mult}x pts${fvpd ? ` (${fvpd})` : ''}`)
    }
    if (expiringPerks.length > 0) reasons.push(`${expiringPerks.length} perk${expiringPerks.length > 1 ? 's' : ''} expiring soon`)
    else if (activePerks.length > 0) reasons.push(`${activePerks.length} active perk${activePerks.length > 1 ? 's' : ''}`)
    if (isGiftWithBalance) reasons.push(`$${card.balance} gift balance`)

    return { card, score, dollarVal, reasons }
  }

  function getRankedCards() { return [...cards].map(scoreCard).sort((a, b) => b.score - a.score) }
  function getBestCard() { if (!cards.length) return null; return getRankedCards()[0].card }
  function getActiveCard() {
    if (selectedCardId) return cards.find(c => c.id === selectedCardId) || getBestCard()
    return getBestCard()
  }

  async function simulateTap() {
    const card = getActiveCard()
    if (!card) return
    const mult = getMultiplier(card)
    const rate = formatRate(card, mult)
    const dollarVal = dollarValuePerDollar(card, mult)
    const estimatedValue = parseFloat((dollarVal * selectedAmt).toFixed(4))

    let confirmMsg = ''

    if (card.type === 'gift') {
      const currentBalance = card.balance || 0
      const charge = Math.min(selectedAmt, currentBalance)
      const newBalance = Math.max(0, currentBalance - charge)
      await updateCardBalance(card.id, newBalance)
      await loadCards()
      confirmMsg = `Tapped ${card.name} · $${charge.toFixed(2)} charged · $${newBalance.toFixed(2)} remaining`
    } else {
      confirmMsg = `Tapped as ${card.name} · ${rate ? `${rate} on $${selectedAmt}` : 'card charged'} · Transaction complete`
    }

    // Log the tap
    await logTap({
      card_id: card.id,
      card_name: card.name,
      merchant: detectedMerchant?.name || merchantQuery || null,
      category: selectedCat,
      amount: selectedAmt,
      rewards_rate: rate || (card.type === 'gift' ? 'gift' : null),
      estimated_value: card.type === 'gift' ? 0 : estimatedValue,
    })

    setTapConfirm(confirmMsg)
    setMissedInsight(null)

    // "Leaving money on the table" — only for non-gift taps
    if (card.type !== 'gift' && selectedCardId) {
      const ranked = getRankedCards()
      const best = ranked[0]
      if (best.card.id !== card.id && best.dollarVal > dollarVal + 0.0005) {
        const bestMult = getMultiplier(best.card)
        const bestFmt = formatValuePerDollar(best.card, bestMult)
        const missedPerDollar = ((best.dollarVal - dollarVal) * 100).toFixed(1)
        const missedOnAmt = selectedAmt > 0 ? (best.dollarVal - dollarVal) * selectedAmt : 0
        setMissedInsight({
          cardName: best.card.name,
          rate: bestFmt,
          missedPerDollar,
          missedOnAmt: missedOnAmt > 0.01 ? missedOnAmt : null,
        })
      }
    }

    setTimeout(() => { setTapConfirm(''); setMissedInsight(null) }, 5000)
  }

  async function handleAddCard() {
    if (!newCard.name) return
    try {
      const created = await addCard({
        name: newCard.name, type: newCard.type, network: newCard.network,
        last_four: newCard.last_four, color: newCard.color,
        balance: parseFloat(newCard.balance) || 0, balance_unit: newCard.balance_unit,
        annual_fee: parseFloat(newCard.annual_fee) || 0,
      })
      const mults = {}
      CATEGORIES.forEach(cat => { if (newCard.multipliers[cat]) mults[cat] = newCard.multipliers[cat] })
      if (Object.keys(mults).length) await addMultipliers(created.id, mults)
      await loadCards()
      setShowAddCard(false)
      const perks = getSuggestedPerks(newCard.name)
      setNewCard({ name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a', balance: '', balance_unit: 'points', annual_fee: '', multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' } })
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
      await loadCards(); setShowAddPerk(false)
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

  // History stats
  const totalEarned = taps.reduce((s, t) => s + (t.estimated_value || 0), 0)
  const thisMonthTaps = taps.filter(t => {
    const d = new Date(t.tapped_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthEarned = thisMonthTaps.reduce((s, t) => s + (t.estimated_value || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Loading your wallet...</p>
    </div>
  )

  const sheetStyle = {
    background: '#2a2a2e', borderRadius: '20px 20px 0 0', padding: '1.5rem',
    width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
    border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
  }

  return (
    <div className="app">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2c2c2e"/>
                <stop offset="100%" stopColor="#1a1a1b"/>
              </linearGradient>
              <linearGradient id="hgold" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#f5cb6a"/>
                <stop offset="100%" stopColor="#d49530"/>
              </linearGradient>
              <mask id="hkey">
                <circle cx="187" cy="254" r="107" fill="white"/>
                <circle cx="187" cy="254" r="61"  fill="black"/>
                <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                <rect x="354" y="276" width="42"  height="58" rx="11" fill="white"/>
                <rect x="408" y="276" width="30"  height="42" rx="9"  fill="white"/>
              </mask>
            </defs>
            <rect width="512" height="512" rx="114" fill="url(#hbg)"/>
            <rect width="512" height="512" fill="url(#hgold)" mask="url(#hkey)"/>
          </svg>
          <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.03em', color: '#f5f5f5' }}>
            Cla<span style={{ color: '#e8b84b' }}>vis</span>
          </span>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
          style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
          Sign out
        </button>
      </div>

      {/* Segmented tab bar */}
      <div className="tab-bar">
        {[
          { key: 'tap', label: 'Smart Tap' },
          { key: 'wallet', label: 'My Wallet' },
          { key: 'perks', label: 'Perks' },
          { key: 'history', label: 'History' },
        ].map(({ key, label }) => (
          <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── SMART TAP ─────────────────────────────────── */}
      {tab === 'tap' && (
        <div>

          {/* 1 ── Merchant search ── primary input */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '13px 16px',
              border: detectedMerchant
                ? '1.5px solid rgba(48,201,138,0.45)'
                : '1.5px solid rgba(255,255,255,0.1)',
              transition: 'border-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '17px', flexShrink: 0, opacity: detectedMerchant ? 1 : 0.45 }}>
                {detectedMerchant ? CAT_META[detectedMerchant.category]?.icon : '🔍'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  placeholder="Where are you? (Starbucks, Target…)"
                  value={merchantQuery}
                  onChange={e => {
                    const q = e.target.value
                    setMerchantQuery(q)
                    setMerchantSuggestions(searchMerchants(q))
                    if (!q) setDetectedMerchant(null)
                  }}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    fontSize: '15px', fontWeight: '600', color: '#f5f5f5',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
                {detectedMerchant && (
                  <div style={{ fontSize: '12px', color: '#30c98a', marginTop: '3px', fontWeight: '500' }}>
                    {CAT_META[detectedMerchant.category]?.label} · auto-categorized
                  </div>
                )}
              </div>
              {merchantQuery && (
                <button
                  onClick={() => { setMerchantQuery(''); setDetectedMerchant(null); setMerchantSuggestions([]); setSelectedCardId(null) }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              )}
            </div>
            {merchantSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#2d2d2f', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', borderRadius: '0 0 14px 14px', zIndex: 50, overflow: 'hidden' }}>
                {merchantSuggestions.map(m => (
                  <div key={m.name}
                    onClick={() => { setMerchantQuery(m.name); setDetectedMerchant(m); pickCategory(m.category); setMerchantSuggestions([]) }}
                    style={{ padding: '12px 16px', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px' }}>{CAT_META[m.category]?.icon}</span>
                      <span style={{ fontWeight: '600', color: '#f5f5f5' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>{CAT_META[m.category]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2 ── Category pills ── secondary, one-tap switching */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => pickCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: '7px 13px',
                  borderRadius: '20px',
                  border: selectedCat === cat ? '1.5px solid rgba(232,184,75,0.55)' : '1px solid rgba(255,255,255,0.1)',
                  background: selectedCat === cat ? 'rgba(232,184,75,0.13)' : 'rgba(255,255,255,0.04)',
                  color: selectedCat === cat ? '#e8b84b' : 'rgba(255,255,255,0.4)',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: '14px' }}>{CAT_META[cat].icon}</span>
                <span>{CAT_META[cat].label}</span>
              </button>
            ))}
          </div>

          {/* 3 ── Hero answer ── the whole point */}
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              No cards yet — add one in My Wallet.
            </div>
          ) : (() => {
            const mult = getMultiplier(activeCard)
            const dollarVal = activeCard ? dollarValuePerDollar(activeCard, mult) : 0
            const valuePer = activeCard ? formatValuePerDollar(activeCard, mult) : null
            const estimatedOnAmt = selectedAmt > 0 && dollarVal > 0 ? dollarVal * selectedAmt : 0
            const isGift = activeCard?.type === 'gift'

            return (
              <div data-reveal style={{
                background: 'linear-gradient(150deg, #2c2c30 0%, #1e1e21 100%)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '20px',
                padding: '22px 22px 18px',
                marginBottom: '10px',
              }}>
                {/* Card identity row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                  <CardArt name={activeCard?.name || ''} style={{ width: '70px', height: '48px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {selectedCardId ? 'Selected card' : 'Best card'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#f5f5f5', letterSpacing: '-0.03em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCard?.name || '—'}
                    </div>
                    {activeCard?.last_four && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)', marginTop: '2px', letterSpacing: '0.06em' }}>
                        •••• {activeCard.last_four}
                      </div>
                    )}
                  </div>
                  {selectedCardId && (
                    <button onClick={() => setSelectedCardId(null)}
                      style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', fontWeight: '600', flexShrink: 0 }}>
                      auto
                    </button>
                  )}
                </div>

                {/* The big rate number */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '16px' }} />
                {isGift ? (
                  <div>
                    <div style={{ fontSize: '46px', fontWeight: '900', color: '#30c98a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      ${(activeCard.balance || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>gift card balance remaining</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '46px', fontWeight: '900', color: '#e8b84b', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {mult > 0 ? formatRate(activeCard, mult) : isCashBack(activeCard) ? '1%' : '1x pts'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '7px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)' }}>
                        {valuePer && mult > 0 ? valuePer : 'per dollar'}
                      </span>
                      {estimatedOnAmt > 0 && (
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#30c98a' }}>
                          ≈ ${estimatedOnAmt.toFixed(2)} back
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 4 ── Tap button */}
          <button className="btn-primary" onClick={simulateTap} disabled={!activeCard} style={{ marginBottom: '8px' }}>
            ◉ &nbsp;Tap Clavis
          </button>

          {/* 5 ── Amount input ── optional, secondary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '10px 14px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: '500', flexShrink: 0 }}>Amount</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>$</span>
            <input type="number" min="0" placeholder="0.00" value={selectedAmt || ''}
              onChange={e => setSelectedAmt(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#f5f5f5', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', outline: 'none' }} />
            {selectedAmt > 0 && (
              <button onClick={() => setSelectedAmt(0)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '13px', padding: '0 2px' }}>✕</button>
            )}
          </div>

          {/* 6 ── See all cards ── collapsed by default */}
          {cards.length > 1 && (
            <button onClick={() => setShowRankings(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontSize: '13px', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: '6px', transition: 'color 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}>
              See all {cards.length} cards ranked →
            </button>
          )}

          {tapConfirm && (
            <div className="success" style={{ marginTop: '10px', textAlign: 'center' }}>
              {tapConfirm}
            </div>
          )}

          {missedInsight && (
            <div style={{
              marginTop: '8px',
              background: 'rgba(224,154,58,0.1)',
              border: '1px solid rgba(224,154,58,0.28)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>💡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e09a3a', marginBottom: '2px' }}>
                  {missedInsight.missedOnAmt
                    ? `$${missedInsight.missedOnAmt.toFixed(2)} more with ${missedInsight.cardName}`
                    : `${missedInsight.missedPerDollar}¢/$ more with ${missedInsight.cardName}`}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  {missedInsight.cardName} earns {missedInsight.rate} here
                  {missedInsight.missedOnAmt ? ` · ${missedInsight.missedPerDollar}¢ more per dollar` : ''}
                </div>
              </div>
              <button
                onClick={() => setMissedInsight(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '14px', padding: '0', flexShrink: 0 }}>
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MY WALLET ─────────────────────────────────── */}
      {tab === 'wallet' && (
        <div>
          {(() => {
            const totalFees = cards.reduce((s, c) => s + (c.annual_fee || 0), 0)
            const totalPerksVal = cards.flatMap(c => c.perks || []).reduce((s, p) => s + (p.used_amount || 0), 0)
            const totalTapVal = taps.reduce((s, t) => s + (t.estimated_value || 0), 0)
            const netValue = totalPerksVal + totalTapVal - totalFees
            return (
              <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Cards', value: cards.length, color: '#f5f5f5' },
                  { label: 'Annual fees', value: totalFees > 0 ? `$${totalFees.toFixed(0)}` : '$0', color: totalFees > 0 ? '#e05c5c' : 'rgba(255,255,255,0.3)' },
                  { label: 'Net value', value: `${netValue >= 0 ? '+' : ''}$${netValue.toFixed(0)}`, color: netValue >= 0 ? '#30c98a' : '#e05c5c' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: m.color, marginBottom: '4px' }}>{m.value}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '1rem' }}>No cards yet. Add your first one below.</div>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              {cards.map(card => {
                // Annual fee ROI calculation
                const fee = card.annual_fee || 0
                const perksValue = (card.perks || []).reduce((s, p) => s + (p.used_amount || 0), 0)
                const cardTaps = taps.filter(t => t.card_id === card.id)
                const tapValue = cardTaps.reduce((s, t) => s + (t.estimated_value || 0), 0)
                const totalValue = perksValue + tapValue
                const roiPct = fee > 0 ? Math.min((totalValue / fee) * 100, 100) : 0
                const remaining = fee > 0 ? Math.max(fee - totalValue, 0) : 0
                const isExpanded = expandedRoiId === card.id

                // Break-even pace projection
                let breakEvenLabel = null
                if (fee > 0 && remaining > 0 && (tapValue > 0 || perksValue > 0)) {
                  const oldestTap = cardTaps.length > 0 ? new Date(cardTaps[cardTaps.length - 1].tapped_at) : null
                  if (oldestTap) {
                    const daysSinceFirst = Math.max(1, Math.ceil((new Date() - oldestTap) / (1000 * 60 * 60 * 24)))
                    const dailyRate = totalValue / daysSinceFirst
                    if (dailyRate > 0) {
                      const daysToBreakEven = Math.ceil(remaining / dailyRate)
                      if (daysToBreakEven <= 365) breakEvenLabel = `Break-even in ~${daysToBreakEven}d at current pace`
                    }
                  }
                }
                const isPaidOff = fee > 0 && roiPct >= 100

                return (
                  <div key={card.id} data-reveal style={{ marginBottom: '8px', borderRadius: '14px', border: isPaidOff ? '1.5px solid rgba(48,201,138,0.3)' : '1px solid rgba(255,255,255,0.08)', background: isPaidOff ? 'rgba(48,201,138,0.04)' : 'rgba(255,255,255,0.03)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    {/* Card header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 14px', cursor: fee > 0 ? 'pointer' : 'default' }}
                      onClick={() => fee > 0 && setExpandedRoiId(isExpanded ? null : card.id)}>
                      <CardArt name={card.name} style={{ width: '48px', height: '32px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                          {card.type}{fee > 0 ? ` · $${fee}/yr fee` : ''}
                        </div>
                      </div>
                      {fee > 0 ? (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {isPaidOff ? (
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#30c98a', background: 'rgba(48,201,138,0.15)', borderRadius: '6px', padding: '3px 8px' }}>✓ Paid off</div>
                          ) : (
                            <>
                              <div style={{ fontSize: '16px', fontWeight: '800', color: '#e8b84b', letterSpacing: '-0.02em' }}>{roiPct.toFixed(0)}%</div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>${remaining.toFixed(0)} to go</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', padding: '0 4px' }}>no fee</div>
                      )}
                    </div>

                    {/* ROI bar (only for fee cards) */}
                    {fee > 0 && (
                      <div style={{ padding: '0 14px', marginBottom: isExpanded ? '0' : '12px' }}>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '4px', borderRadius: '3px', width: roiPct + '%', background: isPaidOff ? '#30c98a' : roiPct > 60 ? '#e8b84b' : 'rgba(232,184,75,0.6)', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                        {!isExpanded && breakEvenLabel && (
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '5px', marginBottom: '2px' }}>{breakEvenLabel}</div>
                        )}
                      </div>
                    )}

                    {/* Expanded ROI breakdown */}
                    {fee > 0 && isExpanded && (
                      <div style={{ margin: '0 14px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {/* Breakdown rows */}
                        {[
                          { label: 'Perks captured', value: perksValue, color: '#5b9cf6' },
                          { label: 'Tap rewards', value: tapValue, color: '#30c98a' },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: row.value > 0 ? row.color : 'rgba(255,255,255,0.22)' }}>
                              {row.value > 0 ? `+$${row.value.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        ))}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakEvenLabel ? '8px' : '0' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Annual fee</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#e05c5c' }}>−${fee.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakEvenLabel ? '8px' : '0' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>Net value</span>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: totalValue >= fee ? '#30c98a' : '#e8b84b', letterSpacing: '-0.02em' }}>
                            {totalValue >= fee ? '+' : ''}${(totalValue - fee).toFixed(2)}
                          </span>
                        </div>
                        {breakEvenLabel && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '7px', fontSize: '11px', color: '#e8b84b', fontWeight: '500' }}>
                            ⏱ {breakEvenLabel}
                          </div>
                        )}
                        {isPaidOff && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(48,201,138,0.1)', border: '1px solid rgba(48,201,138,0.25)', borderRadius: '7px', fontSize: '11px', color: '#30c98a', fontWeight: '600' }}>
                            ✓ This card has fully paid for its annual fee
                          </div>
                        )}
                        {!isPaidOff && tapValue === 0 && perksValue === 0 && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: '7px', fontSize: '11px', color: '#e05c5c', fontWeight: '500' }}>
                            No value captured yet — use Smart Tap or mark perks used
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '5px', padding: fee > 0 ? '0 14px 14px' : '0 14px 14px' }}>
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
                )
              })}
            </div>
          )}

          <button className="btn-primary" onClick={() => setShowAddCard(true)}>+ Add card</button>

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
                  } else { setNewCard(prev => ({ ...prev, name, _suggestion: null })) }
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

              {newCard.name && <div style={{ marginBottom: '12px' }}><CardArt name={newCard.name} style={{ height: '64px' }} /></div>}

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

                  <div style={{ marginBottom: '12px' }}>
                    <label className="label">Annual fee ($) — optional</label>
                    <input className="input" type="number" placeholder="0" value={newCard.annual_fee} onChange={e => setNewCard({ ...newCard, annual_fee: e.target.value })} />
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
                        onChange={e => { const val = e.target.value; const filled = {}; CATEGORIES.forEach(cat => { filled[cat] = val }); setNewCard({ ...newCard, multipliers: filled }) }} />
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

          {showAddPerk && (
            <div data-reveal style={{ marginTop: '14px', background: '#2a2a2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#f5f5f5', marginBottom: '4px' }}>Add a perk</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.125rem' }}>
                <CardArt name={cards.find(c => c.id === addingToCardId)?.name || ''} style={{ width: '28px', height: '20px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>{cards.find(c => c.id === addingToCardId)?.name}</span>
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
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>No cards yet. Add cards in My Wallet to track perks.</div>
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

      {/* ── HISTORY ───────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {/* Summary stats */}
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>This month</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#30c98a', letterSpacing: '-0.03em' }}>${thisMonthEarned.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{thisMonthTaps.length} tap{thisMonthTaps.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>All time</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#e8b84b', letterSpacing: '-0.03em' }}>${totalEarned.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{taps.length} tap{taps.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {tapsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading...</div>
          ) : taps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              No taps yet. Use Smart Tap to start tracking your rewards.
            </div>
          ) : (
            <div className="card" style={{ padding: '0 1.125rem' }}>
              {taps.map((tap, i) => (
                <div key={tap.id} data-reveal style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: i < taps.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <CardArt name={tap.card_name} style={{ width: '40px', height: '27px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f5f5f5', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tap.merchant || tap.card_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {tap.card_name}{tap.category ? ` · ${tap.category}` : ''}
                      {' · '}<TimeAgo dateStr={tap.tapped_at} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {tap.amount > 0 && (
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#f5f5f5', marginBottom: '1px' }}>${tap.amount.toFixed(2)}</div>
                    )}
                    {tap.estimated_value > 0 ? (
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#30c98a' }}>+${tap.estimated_value.toFixed(2)}</div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>{tap.rewards_rate || '—'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────── */}

      {emptyGiftCards.length > 0 && emptyGiftCards[emptyGiftCardIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#2a2a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <CardArt name={emptyGiftCards[emptyGiftCardIndex].name} style={{ height: '64px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5', marginBottom: '6px' }}>{emptyGiftCards[emptyGiftCardIndex].name} is empty</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem', lineHeight: '1.6' }}>This gift card has a $0 balance. Would you like to remove it from your wallet?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ background: '#e05c5c' }} onClick={async () => {
                await deleteCard(emptyGiftCards[emptyGiftCardIndex].id); await loadCards()
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

      {showRankings && (
        <div onClick={() => setShowRankings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ ...sheetStyle, maxHeight: '70vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5' }}>Card rankings</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1)} · ${selectedAmt}</div>
              </div>
              <button onClick={() => setShowRankings(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {getRankedCards().map(({ card, reasons, dollarVal }, i) => {
              const mult = getMultiplier(card)
              return (
                <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#e8b84b' : 'rgba(255,255,255,0.22)', width: '22px', flexShrink: 0 }}>#{i + 1}</div>
                  <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{reasons.length > 0 ? reasons.join(' · ') : 'No rewards for this category'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#e8b84b' : 'rgba(255,255,255,0.35)' }}>
                      {mult > 0 ? formatRate(card, mult) : '—'}
                    </div>
                    {dollarVal > 0 && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{formatValuePerDollar(card, mult)}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showOnboarding && (
        <Onboarding onComplete={() => {
          setShowOnboarding(false)
          loadCards()
        }} />
      )}

      {editingCard && (
        <div onClick={() => setEditingCard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={sheetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f5f5f5' }}>Edit {editingCard.name}</div>
              <button onClick={() => setEditingCard(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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

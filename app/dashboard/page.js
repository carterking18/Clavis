'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, updateCardBalance, addMultipliers, updateCardMultipliers, addPerk, updatePerk, deletePerk } from '../../lib/cards'
import { getCardDesign } from '../../lib/cardImages'
import { getSuggestedMultipliers } from '../../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../../lib/cardPerks'
import { searchMerchants } from '../../lib/merchants'
import { dollarValuePerDollar, formatValuePerDollar } from '../../lib/pointValues'
import { logTap, getTaps, deleteTap } from '../../lib/taps'
import { generateInsights, analyzeRetroactiveTaps } from '../../lib/insights'
import { generateRecommendations, debugRecommendations } from '../../lib/recommendations'
import { Onboarding } from '../onboarding'
import { InstallPrompt } from '../install-prompt'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

const CAT_META = {
  dining:    { label: 'Dining' },
  travel:    { label: 'Travel' },
  hotel:     { label: 'Hotel' },
  grocery:   { label: 'Grocery' },
  gas:       { label: 'Gas' },
  streaming: { label: 'Stream' },
  retail:    { label: 'Retail' },
  other:     { label: 'Other' },
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
      borderRadius: '4px',
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
        <div style={{ alignSelf: 'flex-end', fontSize: '9px', fontWeight: '700', color: 'rgba(221,221,228,0.65)', letterSpacing: '0.04em', marginTop: 'auto' }}>
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

function formatResetDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  const [selectedMonth, setSelectedMonth] = useState(null)

  // Add-card form state
  const [newCard, setNewCard] = useState({
    name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a',
    balance: '', balance_unit: 'points', annual_fee: '',
    multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' }
  })
  const [fetchingCardData, setFetchingCardData] = useState(false)
  const cardFetchTimer = useRef(null)

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
      Promise.all([loadCards(), loadTaps()]).then(() => {
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

  useEffect(() => () => { if (cardFetchTimer.current) clearTimeout(cardFetchTimer.current) }, [])

  // Insights computed from current wallet + history
  const perkInsights = useMemo(() => generateInsights(cards, taps), [cards, taps])
  const retroactiveMissed = useMemo(() => analyzeRetroactiveTaps(taps, cards), [taps, cards])
  const totalMissed = useMemo(() => retroactiveMissed.reduce((s, m) => s + m.missedTotal, 0), [retroactiveMissed])
  const cardRecs = useMemo(() => generateRecommendations(cards, taps), [cards, taps])
  const debugRecs = [{ rec: { name: 'TEST CARD', annualFee: 0, why: 'Debug test', studentFriendly: true }, netAnnualGain: 99, improvements: [{ category: 'gas', gainPerDollar: 0.01 }] }]

  // Monthly missed breakdown
  const missedByMonth = useMemo(() => {
    const map = {}
    for (const item of retroactiveMissed) {
      const d = new Date(item.tap.tapped_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, total: 0, count: 0 }
      map[key].total += item.missedTotal
      map[key].count++
    }
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
  }, [retroactiveMissed])

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
    const dollarVal = isCashBack(card) ? mult / 100 : dollarValuePerDollar(card, mult)

    const perks = card.perks || []
    const activePerks = perks.filter(p => p.used_amount < p.total_amount)
    const expiringPerks = activePerks.filter(p => {
      if (!p.resets_at) return false
      const days = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
      return days <= 14 && days > 0
    })
    const isGiftWithBalance = card.type === 'gift' && (card.balance || 0) > 0

    let score = dollarVal * 100
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

  function getRankedCards() {
    return [...cards]
      .filter(c => !(c.type === 'gift' && (c.balance || 0) <= 0))
      .map(scoreCard).sort((a, b) => {
        const d = b.score - a.score
        if (Math.abs(d) > 0.001) return d
        return (b.card.annual_fee || 0) - (a.card.annual_fee || 0)
      })
  }
  function getBestCard() { if (!cards.length) return null; return getRankedCards()[0].card }
  function getActiveCard() {
    if (selectedCardId) return cards.find(c => c.id === selectedCardId) || getBestCard()
    return getBestCard()
  }
  function isBestTied() {
    if (cards.length < 2 || selectedCardId) return false
    const ranked = getRankedCards()
    return Math.abs(ranked[0].score - ranked[1].score) <= 0.001 &&
           (ranked[0].card.annual_fee || 0) === (ranked[1].card.annual_fee || 0)
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

  // Debounced card-data fetch for unknown cards in the Add Card form
  function handleNewCardNameChange(name) {
    const suggestion = getSuggestedMultipliers(name)
    if (suggestion) {
      const mults = {}
      CATEGORIES.forEach(cat => { mults[cat] = String(suggestion.multipliers[cat] ?? '') })
      setNewCard(prev => ({ ...prev, name, multipliers: mults, _suggestion: suggestion.note, _aiSuggestion: false }))
      setFetchingCardData(false)
      if (cardFetchTimer.current) clearTimeout(cardFetchTimer.current)
      return
    }
    setNewCard(prev => ({ ...prev, name, _suggestion: null, _aiSuggestion: false }))

    if (cardFetchTimer.current) clearTimeout(cardFetchTimer.current)
    if (name.trim().length < 4) { setFetchingCardData(false); return }

    cardFetchTimer.current = setTimeout(async () => {
      setFetchingCardData(true)
      try {
        const res = await fetch('/api/card-perks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        })
        const data = await res.json()
        if (data.multipliers || data.note) {
          const mults = {}
          if (data.multipliers) {
            CATEGORIES.forEach(cat => { mults[cat] = String(data.multipliers[cat] ?? '') })
          }
          const noteText = data.note + (data.source === 'claude' ? ' · AI-generated, verify with issuer' : '')
          setNewCard(prev => ({
            ...prev,
            multipliers: data.multipliers ? mults : prev.multipliers,
            _suggestion: noteText,
            _aiSuggestion: data.source === 'claude',
            _aiPerks: data.perks || [],
          }))
        }
      } catch (e) { /* silent */ }
      setFetchingCardData(false)
    }, 900)
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

      // Perk suggestions: prefer internal DB, fall back to AI perks from the async fetch
      const dbPerks = getSuggestedPerks(newCard.name)
      const perksToSuggest = dbPerks && dbPerks.length > 0 ? dbPerks : (newCard._aiPerks || [])

      setNewCard({ name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a', balance: '', balance_unit: 'points', annual_fee: '', multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' } })

      if (perksToSuggest.length > 0) {
        setSuggestedPerks(perksToSuggest)
        setPendingCardId(created.id)
        setSelectedPerkIndices(perksToSuggest.map((_, i) => i))
      }
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

  const totalEarned = taps.reduce((s, t) => s + (t.estimated_value || 0), 0)
  const thisMonthTaps = taps.filter(t => {
    const d = new Date(t.tapped_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthEarned = thisMonthTaps.reduce((s, t) => s + (t.estimated_value || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'rgba(221,221,228,0.35)', fontSize: '14px' }}>Loading your wallet...</p>
    </div>
  )

  const sheetStyle = {
    background: '#0f0f13', borderRadius: '8px 8px 0 0', padding: '1.5rem',
    width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
    border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none',
  }

  const insightCount = perkInsights.length + retroactiveMissed.length + cardRecs.length

  return (
    <div className="app">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <svg width="22" height="22" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="hkey">
                <circle cx="187" cy="254" r="107" fill="white"/>
                <circle cx="187" cy="254" r="61"  fill="black"/>
                <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
                <rect x="354" y="276" width="42"  height="58" rx="11" fill="white"/>
                <rect x="408" y="276" width="30"  height="42" rx="9"  fill="white"/>
              </mask>
            </defs>
            <rect width="512" height="512" fill="#c9a227" mask="url(#hkey)"/>
          </svg>
          <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '0.02em', color: '#dddde4' }}>
            CLAVIS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/about"
            style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(221,221,228,0.22)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(221,221,228,0.55)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(221,221,228,0.22)'}>
            About
          </a>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
            style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(221,221,228,0.22)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(221,221,228,0.55)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(221,221,228,0.22)'}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {[
          { key: 'tap',      label: 'Tap' },
          { key: 'wallet',   label: 'Wallet' },
          { key: 'perks',    label: 'Perks' },
          { key: 'history',  label: 'History' },
          { key: 'insights', label: 'Insights' },
        ].map(({ key, label }) => (
          <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}
            style={key === 'insights' && insightCount > 0 && tab !== key ? { color: '#c9a227' } : {}}>
            {label}
            {key === 'insights' && insightCount > 0 && tab !== key && (
              <span style={{ display: 'inline-block', width: '5px', height: '5px', background: '#c9a227', borderRadius: '50%', marginLeft: '4px', verticalAlign: 'middle', marginBottom: '2px' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── SMART TAP ─────────────────────────────────── */}
      {tab === 'tap' && (
        <div>

          {/* 1 ── Merchant search */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{
              background: 'transparent',
              borderRadius: '4px',
              padding: '11px 14px',
              border: detectedMerchant
                ? '1px solid rgba(29,184,122,0.4)'
                : '1px solid rgba(255,255,255,0.08)',
              transition: 'border-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: 'rgba(221,221,228,0.22)', flexShrink: 0, textTransform: 'uppercase' }}>
                {detectedMerchant ? CAT_META[detectedMerchant.category]?.label : 'Merchant'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  placeholder="Starbucks, Target, Delta…"
                  value={merchantQuery}
                  onChange={e => {
                    const q = e.target.value
                    setMerchantQuery(q)
                    setMerchantSuggestions(searchMerchants(q))
                    if (!q) setDetectedMerchant(null)
                  }}
                  style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: '500', color: '#dddde4', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              {merchantQuery && (
                <button
                  onClick={() => { setMerchantQuery(''); setDetectedMerchant(null); setMerchantSuggestions([]); setSelectedCardId(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(221,221,228,0.3)', fontSize: '14px', flexShrink: 0, lineHeight: 1, padding: '0 2px' }}>
                  ×
                </button>
              )}
            </div>
            {merchantSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#141419', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 50, overflow: 'hidden' }}>
                {merchantSuggestions.map(m => (
                  <div key={m.name}
                    onClick={() => { setMerchantQuery(m.name); setDetectedMerchant(m); pickCategory(m.category); setMerchantSuggestions([]) }}
                    style={{ padding: '11px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontWeight: '500', color: '#dddde4' }}>{m.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(221,221,228,0.35)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '9999px' }}>{CAT_META[m.category]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2 ── Category selector */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '18px', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => pickCategory(cat)}
                style={{
                  flexShrink: 0, padding: '6px 14px',
                  borderRadius: '9999px',
                  border: selectedCat === cat ? '1px solid rgba(201,162,39,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  background: selectedCat === cat ? 'rgba(201,162,39,0.1)' : 'transparent',
                  color: selectedCat === cat ? '#c9a227' : 'rgba(221,221,228,0.35)',
                  fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                {CAT_META[cat].label}
              </button>
            ))}
          </div>

          {/* 3 ── Hero card */}
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(221,221,228,0.25)', fontSize: '13px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px' }}>
              No cards yet — add one in Wallet.
            </div>
          ) : (() => {
            const mult = getMultiplier(activeCard)
            const dollarVal = activeCard ? dollarValuePerDollar(activeCard, mult) : 0
            const valuePer = activeCard ? formatValuePerDollar(activeCard, mult) : null
            const estimatedOnAmt = selectedAmt > 0 && dollarVal > 0 ? dollarVal * selectedAmt : 0
            const isGift = activeCard?.type === 'gift'
            const label = selectedCardId ? 'Selected' : isBestTied() ? 'Tied' : 'Recommended'

            return (
              <div data-reveal style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden' }}>
                {/* Card header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <CardArt name={activeCard?.name || ''} style={{ width: '52px', height: '35px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9.5px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(221,221,228,0.3)', marginBottom: '3px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#dddde4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCard?.name || '—'}
                    </div>
                    {activeCard?.last_four && (
                      <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.2)', marginTop: '1px', letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
                        •••• {activeCard.last_four}
                      </div>
                    )}
                  </div>
                  {selectedCardId && (
                    <button onClick={() => setSelectedCardId(null)}
                      style={{ fontSize: '9.5px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(221,221,228,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9999px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Auto
                    </button>
                  )}
                </div>
                {/* Rate row */}
                <div style={{ padding: '16px 16px 18px', background: 'rgba(255,255,255,0.015)' }}>
                  {isGift ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ fontSize: '40px', fontWeight: '700', color: '#1db87a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        ${(activeCard.balance || 0).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', fontWeight: '500' }}>remaining</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                        <span style={{ fontSize: '40px', fontWeight: '700', color: '#c9a227', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {mult > 0 ? formatRate(activeCard, mult) : isCashBack(activeCard) ? '1%' : '1×'}
                        </span>
                        {valuePer && mult > 0 && (
                          <span style={{ fontSize: '13px', color: 'rgba(221,221,228,0.35)', fontWeight: '500' }}>{valuePer}</span>
                        )}
                      </div>
                      {estimatedOnAmt > 0 && (
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1db87a', fontVariantNumeric: 'tabular-nums' }}>
                          +${estimatedOnAmt.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 4 ── Tap button */}
          <button className="btn-primary" onClick={simulateTap} disabled={!activeCard} style={{ marginBottom: '8px' }}>
            ◉ &nbsp;Tap Clavis
          </button>

          {/* 5 ── Amount input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '10px 14px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(221,221,228,0.3)', fontWeight: '500', flexShrink: 0 }}>Amount</span>
            <span style={{ fontSize: '14px', color: 'rgba(221,221,228,0.3)', fontWeight: '600' }}>$</span>
            <input type="number" min="0" placeholder="0.00" value={selectedAmt || ''}
              onChange={e => setSelectedAmt(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#dddde4', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', outline: 'none' }} />
            {selectedAmt > 0 && (
              <button onClick={() => setSelectedAmt(0)} style={{ background: 'none', border: 'none', color: 'rgba(221,221,228,0.3)', cursor: 'pointer', fontSize: '13px', padding: '0 2px' }}>✕</button>
            )}
          </div>

          {/* 6 ── See all cards */}
          {cards.length > 1 && (
            <button onClick={() => setShowRankings(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(221,221,228,0.22)', cursor: 'pointer', padding: '8px', transition: 'color 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(221,221,228,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(221,221,228,0.22)'}>
              View all {cards.length} cards →
            </button>
          )}

          {tapConfirm && (
            <div className="success" style={{ marginTop: '10px', textAlign: 'center' }}>{tapConfirm}</div>
          )}

          {missedInsight && (
            <div style={{ marginTop: '8px', background: 'rgba(196,124,42,0.1)', border: '1px solid rgba(196,124,42,0.28)', borderRadius: '4px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>💡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#c47c2a', marginBottom: '2px' }}>
                  {missedInsight.missedOnAmt
                    ? `$${missedInsight.missedOnAmt.toFixed(2)} more with ${missedInsight.cardName}`
                    : `${missedInsight.missedPerDollar}¢/$ more with ${missedInsight.cardName}`}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  {missedInsight.cardName} earns {missedInsight.rate} here
                  {missedInsight.missedOnAmt ? ` · ${missedInsight.missedPerDollar}¢ more per dollar` : ''}
                </div>
              </div>
              <button onClick={() => setMissedInsight(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '14px', padding: '0', flexShrink: 0 }}>✕</button>
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
                  { label: 'Cards', value: cards.length, color: '#dddde4' },
                  { label: 'Annual fees', value: totalFees > 0 ? `$${totalFees.toFixed(0)}` : '$0', color: totalFees > 0 ? '#d95252' : 'rgba(221,221,228,0.3)' },
                  { label: 'Net value', value: `${netValue >= 0 ? '+' : ''}$${netValue.toFixed(0)}`, color: netValue >= 0 ? '#1db87a' : '#d95252' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '14px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: m.color, marginBottom: '4px' }}>{m.value}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)', fontWeight: '500' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(221,221,228,0.3)', fontSize: '14px', marginBottom: '1rem' }}>No cards yet. Add your first one below.</div>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              {cards.map(card => {
                const fee = card.annual_fee || 0
                const perksValue = (card.perks || []).reduce((s, p) => s + (p.used_amount || 0), 0)
                const cardTaps = taps.filter(t => t.card_id === card.id)
                const tapValue = cardTaps.reduce((s, t) => s + (t.estimated_value || 0), 0)
                const totalValue = perksValue + tapValue
                const roiPct = fee > 0 ? Math.min((totalValue / fee) * 100, 100) : 0
                const remaining = fee > 0 ? Math.max(fee - totalValue, 0) : 0
                const isExpanded = expandedRoiId === card.id

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
                  <div key={card.id} data-reveal style={{ marginBottom: '8px', borderRadius: '4px', border: isPaidOff ? '1.5px solid rgba(29,184,122,0.3)' : '1px solid rgba(255,255,255,0.06)', background: isPaidOff ? 'rgba(29,184,122,0.04)' : 'rgba(255,255,255,0.03)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 14px', cursor: fee > 0 ? 'pointer' : 'default' }}
                      onClick={() => fee > 0 && setExpandedRoiId(isExpanded ? null : card.id)}>
                      <CardArt name={card.name} style={{ width: '48px', height: '32px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#dddde4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)', marginTop: '1px' }}>
                          {card.type}{fee > 0 ? ` · $${fee}/yr fee` : ''}
                        </div>
                      </div>
                      {fee > 0 ? (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {isPaidOff ? (
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1db87a', background: 'rgba(29,184,122,0.15)', borderRadius: '9999px', padding: '3px 10px' }}>✓ Paid off</div>
                          ) : (
                            <>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: '#c9a227', letterSpacing: '-0.02em' }}>{roiPct.toFixed(0)}%</div>
                              <div style={{ fontSize: '10px', color: 'rgba(221,221,228,0.3)', marginTop: '1px' }}>${remaining.toFixed(0)} to go</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', padding: '0 4px' }}>no fee</div>
                      )}
                    </div>

                    {fee > 0 && (
                      <div style={{ padding: '0 14px', marginBottom: isExpanded ? '0' : '12px' }}>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '4px', borderRadius: '3px', width: roiPct + '%', background: isPaidOff ? '#1db87a' : roiPct > 60 ? '#c9a227' : 'rgba(201,162,39,0.6)', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                        {!isExpanded && breakEvenLabel && (
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '5px', marginBottom: '2px' }}>{breakEvenLabel}</div>
                        )}
                      </div>
                    )}

                    {fee > 0 && isExpanded && (
                      <div style={{ margin: '0 14px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {[
                          { label: 'Perks captured', value: perksValue, color: '#4d8ef0' },
                          { label: 'Tap rewards', value: tapValue, color: '#1db87a' },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.5)' }}>{row.label}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: row.value > 0 ? row.color : 'rgba(255,255,255,0.22)' }}>
                              {row.value > 0 ? `+$${row.value.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        ))}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakEvenLabel ? '8px' : '0' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.5)' }}>Annual fee</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#d95252' }}>−${fee.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakEvenLabel ? '8px' : '0' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>Net value</span>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: totalValue >= fee ? '#1db87a' : '#c9a227', letterSpacing: '-0.02em' }}>
                            {totalValue >= fee ? '+' : ''}${(totalValue - fee).toFixed(2)}
                          </span>
                        </div>
                        {breakEvenLabel && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '4px', fontSize: '11px', color: '#c9a227', fontWeight: '500' }}>
                            — {breakEvenLabel}
                          </div>
                        )}
                        {isPaidOff && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(29,184,122,0.1)', border: '1px solid rgba(29,184,122,0.25)', borderRadius: '4px', fontSize: '11px', color: '#1db87a', fontWeight: '600' }}>
                            ✓ This card has fully paid for its annual fee
                          </div>
                        )}
                        {!isPaidOff && tapValue === 0 && perksValue === 0 && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(217,82,82,0.08)', border: '1px solid rgba(217,82,82,0.2)', borderRadius: '4px', fontSize: '11px', color: '#d95252', fontWeight: '500' }}>
                            No value captured yet — use Smart Tap or mark perks used
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '5px', padding: '0 14px 14px' }}>
                      <button onClick={() => { setAddingToCardId(card.id); setShowAddPerk(true) }}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontWeight: '600', transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#dddde4' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
                        + perk
                      </button>
                      <button onClick={() => openEditCard(card)}
                        style={{ padding: '6px 9px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontWeight: '600', transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#dddde4' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
                        edit
                      </button>
                      <button onClick={() => deleteCard(card.id).then(loadCards)}
                        style={{ padding: '6px 9px', fontSize: '11px', border: '1px solid rgba(217,82,82,0.3)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: '#d95252', fontWeight: '600', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(217,82,82,0.6)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(217,82,82,0.3)'}>
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
            <div data-reveal style={{ marginTop: '14px', background: '#0f0f13', borderRadius: '4px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#dddde4', marginBottom: '1.125rem' }}>Add a card</div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Card name</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" placeholder="e.g. Amex Gold" value={newCard.name}
                    onChange={e => handleNewCardNameChange(e.target.value)} />
                  {fetchingCardData && (
                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'rgba(221,221,228,0.3)' }}>
                      Looking up...
                    </div>
                  )}
                </div>
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
                    <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', marginBottom: '10px', lineHeight: '1.5' }}>
                      Cash back: enter % (e.g. 1.5). Points: enter multiplier (e.g. 3 for 3x).
                    </div>
                    {newCard._suggestion && (
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: newCard._aiSuggestion ? '#c9a227' : '#4d8ef0', background: newCard._aiSuggestion ? 'rgba(201,162,39,0.1)' : 'rgba(77,142,240,0.1)', border: `1px solid ${newCard._aiSuggestion ? 'rgba(201,162,39,0.2)' : 'rgba(77,142,240,0.2)'}`, borderRadius: '4px', padding: '8px 12px' }}>
                        {newCard._aiSuggestion ? '✦ AI-populated' : '✦ Rates auto-filled'} — {newCard._suggestion}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.38)', flexShrink: 0 }}>Apply to all categories</span>
                      <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '5px 8px', fontSize: '13px', flex: 1 }}
                        onChange={e => { const val = e.target.value; const filled = {}; CATEGORIES.forEach(cat => { filled[cat] = val }); setNewCard({ ...newCard, multipliers: filled }) }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Or per category:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CATEGORIES.map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.38)', width: '68px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
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
            <div data-reveal style={{ marginTop: '14px', background: '#0f0f13', borderRadius: '4px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#dddde4', marginBottom: '4px' }}>Add a perk</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.125rem' }}>
                <CardArt name={cards.find(c => c.id === addingToCardId)?.name || ''} style={{ width: '28px', height: '20px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(221,221,228,0.55)', fontWeight: '500' }}>{cards.find(c => c.id === addingToCardId)?.name}</span>
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
            <div data-reveal style={{ background: 'rgba(196,124,42,0.1)', border: '1px solid rgba(196,124,42,0.3)', borderRadius: '4px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: '#c47c2a', fontWeight: '500' }}>
              — {expiringPerks.length} credit{expiringPerks.length > 1 ? 's' : ''} expiring within 14 days — use them now.
            </div>
          )}

          {/* Total remaining perks value */}
          {allPerks.length > 0 && (() => {
            const totalRemaining = allPerks.reduce((s, p) => s + Math.max(p.total_amount - (p.used_amount || 0), 0), 0)
            const totalAll = allPerks.reduce((s, p) => s + p.total_amount, 0)
            const usedPct = totalAll > 0 ? Math.round(((totalAll - totalRemaining) / totalAll) * 100) : 0
            return totalRemaining > 0 ? (
              <div data-reveal style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '14px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Uncaptured value</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1db87a', letterSpacing: '-0.03em' }}>${totalRemaining.toFixed(0)}</div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px' }}>
                    <div style={{ height: '3px', borderRadius: '2px', width: usedPct + '%', background: '#1db87a', transition: 'width 0.5s' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.02em' }}>{usedPct}%</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>used</div>
                </div>
              </div>
            ) : null
          })()}

          <div style={{ marginBottom: '1.25rem' }}>
            <button className="btn-primary" onClick={sendEmail} disabled={emailSending}>
              {emailSending ? 'Sending...' : 'Email me my perk summary'}
            </button>
          </div>
          {emailMsg && <div className="success">{emailMsg}</div>}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(221,221,228,0.3)', fontSize: '14px' }}>No cards yet. Add cards in Wallet to track perks.</div>
          ) : cards.map(card => {
            const cardPerks = card.perks || []
            if (cardPerks.length === 0) return null
            return (
              <div key={card.id} data-reveal style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#dddde4', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CardArt name={card.name} style={{ width: '32px', height: '22px', flexShrink: 0 }} />
                  {card.name}
                </div>
                <div className="card" style={{ padding: '0 1.125rem' }}>
                  {cardPerks.map((perk, pi) => {
                    const remaining = perk.total_amount - perk.used_amount
                    const pct = Math.min((perk.used_amount / perk.total_amount) * 100, 100)
                    const daysLeft = perk.resets_at ? Math.ceil((new Date(perk.resets_at) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    const isExpiring = daysLeft !== null && daysLeft <= 14 && daysLeft > 0
                    const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft > 0
                    const isUsed = remaining <= 0
                    const accent = isUsed ? '#d95252' : isUrgent ? '#d95252' : isExpiring ? '#c47c2a' : '#1db87a'
                    return (
                      <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: pi < cardPerks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#dddde4', marginBottom: '3px' }}>{perk.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)', marginBottom: '8px' }}>
                            {perk.period}
                            {daysLeft !== null ? ` · ${isUrgent ? `${daysLeft}d left` : isExpiring ? `${daysLeft}d left` : `resets in ${daysLeft}d`}` : ''}
                          </div>
                          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
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
                                style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontWeight: '600', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                                mark used
                              </button>
                            )}
                            <button onClick={() => deletePerk(perk.id).then(loadCards)}
                              style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid rgba(217,82,82,0.3)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: '#d95252', fontWeight: '600', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(217,82,82,0.6)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(217,82,82,0.3)'}>
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
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(221,221,228,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>This month</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1db87a', letterSpacing: '-0.03em' }}>${thisMonthEarned.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', marginTop: '3px' }}>{thisMonthTaps.length} tap{thisMonthTaps.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(221,221,228,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>All time</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#c9a227', letterSpacing: '-0.03em' }}>${totalEarned.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', marginTop: '3px' }}>{taps.length} tap{taps.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {tapsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(221,221,228,0.3)', fontSize: '14px' }}>Loading...</div>
          ) : taps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(221,221,228,0.3)', fontSize: '14px' }}>
              No taps yet. Use Smart Tap to start tracking your rewards.
            </div>
          ) : (
            <div className="card" style={{ padding: '0 1.125rem' }}>
              {taps.map((tap, i) => (
                <div key={tap.id} data-reveal style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: i < taps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <CardArt name={tap.card_name} style={{ width: '40px', height: '27px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#dddde4', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tap.merchant || tap.card_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)' }}>
                      {tap.card_name}{tap.category ? ` · ${tap.category}` : ''}
                      {' · '}<TimeAgo dateStr={tap.tapped_at} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {tap.amount > 0 && (
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#dddde4', marginBottom: '1px' }}>${tap.amount.toFixed(2)}</div>
                    )}
                    {tap.estimated_value > 0 ? (
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1db87a' }}>+${tap.estimated_value.toFixed(2)}</div>
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

      {/* ── INSIGHTS ──────────────────────────────────── */}
      {tab === 'insights' && (
        <div>
          <pre style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '8px' }}>{debugRecommendations(cards, taps)}</pre>
          {perkInsights.length === 0 && retroactiveMissed.length === 0 && cardRecs.length === 0 && debugRecs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(221,221,228,0.5)', marginBottom: '8px' }}>No insights yet</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.28)', lineHeight: '1.6' }}>
                Add cards with perks and use Smart Tap to start seeing personalized optimization tips.
              </div>
            </div>
          ) : (
            <>
              {/* ── Proactive recommendations ── */}
              {perkInsights.length > 0 && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(221,221,228,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Use before they expire
                  </div>
                  {perkInsights.map(insight => {
                    const urgentColor = insight.days <= 7 ? '#d95252' : insight.days <= 14 ? '#c47c2a' : '#1db87a'
                    const urgentBg = insight.days <= 7 ? 'rgba(217,82,82,0.08)' : insight.days <= 14 ? 'rgba(196,124,42,0.08)' : 'rgba(29,184,122,0.06)'
                    const urgentBorder = insight.days <= 7 ? 'rgba(217,82,82,0.25)' : insight.days <= 14 ? 'rgba(196,124,42,0.25)' : 'rgba(29,184,122,0.2)'
                    return (
                      <div key={insight.id} data-reveal style={{ background: urgentBg, border: `1px solid ${urgentBorder}`, borderLeft: `3px solid ${urgentColor}`, borderRadius: '4px', padding: '14px 14px 14px 12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <CardArt name={insight.card.name} style={{ width: '40px', height: '27px', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)', fontWeight: '500', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insight.card.name}</div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#dddde4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insight.perk.name}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '22px', fontWeight: '700', color: urgentColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
                              ${insight.remaining.toFixed(0)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(221,221,228,0.3)', marginTop: '2px' }}>{insight.days}d left</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(221,221,228,0.55)', lineHeight: '1.55' }}>
                          {'You have '}
                          <span style={{ color: '#dddde4', fontWeight: '600' }}>${insight.remaining.toFixed(0)}</span>
                          {' in '}
                          <span style={{ color: '#dddde4', fontWeight: '600' }}>{insight.perk.name}</span>
                          {' until '}
                          <span style={{ color: urgentColor, fontWeight: '600' }}>{formatResetDate(insight.resetDate)}</span>
                          {insight.suggestion && (
                            <> — based on your history, <span style={{ color: '#c9a227', fontWeight: '600' }}>{insight.suggestion}</span> would use this optimally</>
                          )}
                          {!insight.suggestion && '.'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Retroactive optimization feed ── */}
              {retroactiveMissed.length > 0 && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(221,221,228,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Left on the table
                  </div>

                  {/* Monthly picker */}
                  {missedByMonth.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '2px' }}>
                      <button
                        onClick={() => setSelectedMonth(null)}
                        style={{ flexShrink: 0, padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', background: selectedMonth === null ? '#c47c2a' : 'transparent', borderColor: selectedMonth === null ? '#c47c2a' : 'rgba(255,255,255,0.12)', color: selectedMonth === null ? '#fff' : 'rgba(221,221,228,0.5)' }}
                      >
                        All time
                      </button>
                      {missedByMonth.map(m => {
                        const [yr, mo] = m.key.split('-')
                        const label = new Date(+yr, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
                        const active = selectedMonth === m.key
                        return (
                          <button key={m.key} onClick={() => setSelectedMonth(m.key)}
                            style={{ flexShrink: 0, padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', background: active ? '#c47c2a' : 'transparent', borderColor: active ? '#c47c2a' : 'rgba(255,255,255,0.12)', color: active ? '#fff' : 'rgba(221,221,228,0.5)' }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Summary hero */}
                  {(() => {
                    const filtered = selectedMonth
                      ? retroactiveMissed.filter(m => {
                          const d = new Date(m.tap.tapped_at)
                          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                          return key === selectedMonth
                        })
                      : retroactiveMissed
                    const filteredTotal = filtered.reduce((s, m) => s + m.missedTotal, 0)
                    const [yr, mo] = (selectedMonth || '').split('-')
                    const monthLabel = selectedMonth
                      ? new Date(+yr, +mo - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
                      : 'all time'

                    return (
                      <>
                        <div data-reveal style={{ background: 'rgba(196,124,42,0.08)', border: '1px solid rgba(196,124,42,0.2)', borderRadius: '12px', padding: '16px 18px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.4)', marginBottom: '6px' }}>
                            {selectedMonth ? `In ${monthLabel}, you left` : 'You\'ve left'}
                          </div>
                          <div style={{ fontSize: '36px', fontWeight: '800', color: '#c47c2a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                            ${filteredTotal.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '13px', color: 'rgba(221,221,228,0.35)', marginTop: '6px' }}>
                            on the table across {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                            {!selectedMonth && ' in your history'}
                          </div>
                        </div>

                        {/* Per-transaction breakdown */}
                        {filtered.length > 0 && (
                          <div className="card" style={{ padding: '0 1.125rem' }}>
                            {filtered.slice(0, 15).map((item, i) => (
                              <div key={item.tap.id} data-reveal style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: i < Math.min(filtered.length, 15) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                <CardArt name={item.bestCard.name} style={{ width: '40px', height: '27px', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#dddde4', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.tap.merchant || item.tap.card_name}
                                    {item.tap.amount > 0 && <span style={{ color: 'rgba(221,221,228,0.3)', fontWeight: '400' }}> · ${item.tap.amount.toFixed(2)}</span>}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)' }}>
                                    <span style={{ color: '#d95252' }}>{item.usedCard.name}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}> → </span>
                                    <span style={{ color: '#1db87a' }}>{item.bestCard.name}</span>
                                    {item.tap.category && <span style={{ color: 'rgba(255,255,255,0.25)' }}> · {item.tap.category}</span>}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#c47c2a' }}>+${item.missedTotal.toFixed(2)}</div>
                                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>{(item.missedPerDollar * 100).toFixed(1)}¢/$</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {filtered.length > 15 && (
                          <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '10px' }}>
                            +{filtered.length - 15} more transactions
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* ── Card recommendations ── */}
              {debugRecs.length > 0 && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(221,221,228,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Cards worth adding
                  </div>
                  {debugRecs.map(({ rec, netAnnualGain, improvements }) => (
                    <div key={rec.name} data-reveal style={{ background: 'rgba(91,79,255,0.07)', border: '1px solid rgba(91,79,255,0.2)', borderLeft: '3px solid #5b4fff', borderRadius: '4px', padding: '14px 14px 14px 12px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#dddde4', marginBottom: '2px' }}>{rec.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.35)' }}>
                            {rec.annualFee === 0 ? 'No annual fee' : `$${rec.annualFee}/yr`}
                            {rec.studentFriendly && <span style={{ marginLeft: '6px', color: '#5b8fff' }}>· Student-friendly</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#5b8fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            +${Math.round(netAnnualGain)}/yr
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(221,221,228,0.3)', marginTop: '2px' }}>est. gain</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.45)', lineHeight: '1.5', marginBottom: '8px' }}>{rec.why}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {improvements.slice(0, 4).map(imp => (
                          <span key={imp.category} style={{ fontSize: '11px', fontWeight: '600', color: '#5b8fff', background: 'rgba(91,79,255,0.12)', borderRadius: '4px', padding: '3px 7px' }}>
                            {imp.category} +{(imp.gainPerDollar * 100).toFixed(1)}¢/$
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────── */}

      {emptyGiftCards.length > 0 && emptyGiftCards[emptyGiftCardIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#0f0f13', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <CardArt name={emptyGiftCards[emptyGiftCardIndex].name} style={{ height: '64px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#dddde4', marginBottom: '6px' }}>{emptyGiftCards[emptyGiftCardIndex].name} is empty</div>
            <div style={{ fontSize: '13px', color: 'rgba(221,221,228,0.38)', marginBottom: '1.25rem', lineHeight: '1.6' }}>This gift card has a $0 balance. Would you like to remove it from your wallet?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ background: '#d95252' }} onClick={async () => {
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
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#dddde4', marginBottom: '4px' }}>Known perks found</div>
            <div style={{ fontSize: '13px', color: 'rgba(221,221,228,0.38)', marginBottom: '1.25rem' }}>Select the perks you have on this card. You can edit amounts later.</div>
            {suggestedPerks.map((perk, i) => (
              <div key={i} onClick={() => setSelectedPerkIndices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: selectedPerkIndices.includes(i) ? '2px solid #30c98a' : '1.5px solid rgba(255,255,255,0.2)', background: selectedPerkIndices.includes(i) ? '#1db87a' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#dddde4' }}>{perk.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', marginTop: '2px' }}>{perk.period}{perk.total_amount > 0 ? ` · $${perk.total_amount}` : ''}</div>
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
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#dddde4' }}>Card rankings</div>
                <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.35)', marginTop: '2px' }}>{selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1)} · ${selectedAmt}</div>
              </div>
              <button onClick={() => setShowRankings(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'rgba(221,221,228,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {(() => {
              const ranked = getRankedCards()
              return ranked.map(({ card, reasons, dollarVal, score }, i) => {
                const mult = getMultiplier(card)
                const tiedWithPrev = i > 0 && Math.abs(ranked[i - 1].score - score) <= 0.001
                const tiedWithNext = i < ranked.length - 1 && Math.abs(ranked[i + 1].score - score) <= 0.001
                const isTop = i === 0 || tiedWithPrev
                const accentColor = isTop ? '#c9a227' : 'rgba(255,255,255,0.22)'
                return (
                  <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: accentColor, width: '22px', flexShrink: 0, textAlign: 'center' }}>
                      {tiedWithPrev ? '=' : `#${i + 1}`}
                    </div>
                    <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#dddde4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', marginTop: '2px' }}>
                        {reasons.length > 0 ? reasons.join(' · ') : 'No rewards for this category'}
                        {tiedWithNext && !tiedWithPrev && (card.annual_fee || 0) > 0 && (
                          <span style={{ color: 'rgba(201,162,39,0.55)' }}> · higher fee</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: isTop ? '#c9a227' : 'rgba(221,221,228,0.35)' }}>
                        {mult > 0 ? formatRate(card, mult) : '—'}
                      </div>
                      {dollarVal > 0 && (
                        <div style={{ fontSize: '11px', color: 'rgba(221,221,228,0.3)', marginTop: '1px' }}>{formatValuePerDollar(card, mult)}</div>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
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
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#dddde4' }}>Edit {editingCard.name}</div>
              <button onClick={() => setEditingCard(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'rgba(221,221,228,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <CardArt name={editingCard.name} style={{ height: '56px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '12px', color: 'rgba(221,221,228,0.3)', marginBottom: '10px', lineHeight: '1.5' }}>
              Cash back: enter % (e.g. 1.5). Points/miles: enter multiplier (e.g. 3 for 3x).
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '10px 12px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.38)', flexShrink: 0 }}>Apply to all categories</span>
              <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '5px 8px', fontSize: '13px', flex: 1 }}
                onChange={e => { const val = e.target.value; const filled = {}; CATEGORIES.forEach(cat => { filled[cat] = val }); setEditMultipliers(filled) }} />
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Or per category:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(221,221,228,0.38)', width: '68px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
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

      <InstallPrompt />
    </div>
  )
}

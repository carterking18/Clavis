'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, updateCardBalance, updateCardFee, addMultipliers, updateCardMultipliers, addPerk, updatePerk, deletePerk, submitCardCorrection, getWeeklyDigestPref, setWeeklyDigestPref, getRecurring, saveRecurring } from '../../lib/cards'
import { getCardDesign } from '../../lib/cardImages'
import { getSuggestedMultipliers, searchCardCatalog } from '../../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../../lib/cardPerks'
import { searchMerchants } from '../../lib/merchants'
import { dollarValuePerDollar, formatValuePerDollar, getPointValuation } from '../../lib/pointValues'
import { logTap, getTaps, deleteTap } from '../../lib/taps'
import { generateInsights, analyzeRetroactiveTaps } from '../../lib/insights'
import { generateRecommendations } from '../../lib/recommendations'
import { getAffiliateLink, TIER_STYLES, AFFILIATE_DISCLOSURE } from '../../lib/affiliates'
import { Onboarding, TOUR_SLIDES } from '../onboarding'
import { InstallPrompt } from '../install-prompt'
import { KeySVG, marketingStyles } from '../marketing-sections'

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
        <div style={{ width: '20px', height: '14px', borderRadius: '3px', background: 'rgba(0,0,0,0.06)', border: '0.5px solid rgba(255,255,255,0.25)' }} />
      )}
      {design.network && (
        <div style={{ alignSelf: 'flex-end', fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginTop: 'auto' }}>
          {design.network}
        </div>
      )}
    </div>
  )
}

function InsightSection({ label, summary, isOpen, onToggle, children }) {
  return (
    <div style={{ marginBottom: '14px', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: summary ? '4px' : 0 }}>{label}</div>
          {summary && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</div>}
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-faintest)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {isOpen && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  )
}

function TourOverlay({ slides, step, targetRefs, onNext, onBack, onFinish, onClose }) {
  const [rect, setRect] = useState(null)
  const slide = slides[step]
  const tabKey = slide.tab.toLowerCase()

  useEffect(() => {
    function update() {
      const el = targetRefs.current[tabKey]
      if (el) {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }
    update()
    const id = requestAnimationFrame(update) // catch post-tab-switch layout shifts
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [tabKey, targetRefs])

  if (!rect || typeof window === 'undefined') return null

  const pad = 8
  const spotStyle = {
    position: 'fixed',
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    borderRadius: '8px',
    boxShadow: '0 0 0 9999px rgba(15,15,20,0.6)',
    border: '2px solid var(--gold)',
    pointerEvents: 'none',
    zIndex: 250,
    transition: 'top 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1), width 0.3s cubic-bezier(0.16,1,0.3,1)',
  }

  const tooltipWidth = Math.min(320, window.innerWidth - 24)
  let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
  tooltipLeft = Math.max(12, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 12))
  const tooltipTop = rect.top + rect.height + pad + 16

  const tooltipStyle = {
    position: 'fixed',
    top: tooltipTop,
    left: tooltipLeft,
    width: tooltipWidth,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '18px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
    zIndex: 251,
    textAlign: 'left',
  }

  return (
    <>
      <div style={spotStyle} />
      <div style={tooltipStyle}>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '6px' }}>
          {slide.tab} tab · {step + 1}/{slides.length}
        </div>
        <div style={{ fontFamily: 'var(--font-instrument, Georgia, serif)', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {slide.icon} {slide.title}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
          {slide.text}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button className="btn-secondary" onClick={onBack} style={{ width: 'auto', flexShrink: 0, padding: '9px 14px', fontSize: '13px' }}>
              ← Back
            </button>
          )}
          <button className="btn-primary" onClick={step < slides.length - 1 ? onNext : onFinish} style={{ flex: 1, padding: '9px 14px', fontSize: '13px' }}>
            {step < slides.length - 1 ? 'Next →' : 'Done'}
          </button>
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-faintest)', cursor: 'pointer', padding: '4px', fontFamily: 'inherit' }}>
          Skip tour
        </button>
      </div>
    </>
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
  if (!dateStr) return 'end of period'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return 'end of period'
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
  const [tapError, setTapError] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddPerk, setShowAddPerk] = useState(false)
  const [showRankings, setShowRankings] = useState(false)
  const [merchantQuery, setMerchantQuery] = useState('')
  const [tapNote, setTapNote] = useState('')
  const [merchantSuggestions, setMerchantSuggestions] = useState([])
  const [detectedMerchant, setDetectedMerchant] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [editMultipliers, setEditMultipliers] = useState({})
  const [editAnnualFee, setEditAnnualFee] = useState('')
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [correctionField, setCorrectionField] = useState('Annual fee')
  const [correctionValue, setCorrectionValue] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)
  const [correctionSubmitted, setCorrectionSubmitted] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const [syncingFees, setSyncingFees] = useState(false)
  const [feeSyncDismissed, setFeeSyncDismissed] = useState(false)
  const [suggestedPerks, setSuggestedPerks] = useState(null)
  const [pendingCardId, setPendingCardId] = useState(null)
  const [selectedPerkIndices, setSelectedPerkIndices] = useState([])
  const [emptyGiftCards, setEmptyGiftCards] = useState([])
  const [emptyGiftCardIndex, setEmptyGiftCardIndex] = useState(0)
  const [addingToCardId, setAddingToCardId] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [digestSaving, setDigestSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [taps, setTaps] = useState([])
  const [tapsLoading, setTapsLoading] = useState(false)
  const [expandedRoiId, setExpandedRoiId] = useState(null)
  const [missedInsight, setMissedInsight] = useState(null)
  const [dismissedPortalTip, setDismissedPortalTip] = useState(null)
  const [openInsightSection, setOpenInsightSection] = useState({})
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [tourStep, setTourStep] = useState(null) // null = no tour; 0..N = current spotlighted tab
  const tourTabRefs = useRef({})

  // Switch the active tab to match whatever the tour is currently spotlighting,
  // so the highlighted nav item lines up with real content underneath.
  useEffect(() => {
    if (tourStep !== null) setTab(TOUR_SLIDES[tourStep].tab.toLowerCase())
  }, [tourStep])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [showFormula, setShowFormula] = useState(false)
  const [showRewardsInfo, setShowRewardsInfo] = useState(false)
  const [cardCatalogSuggestions, setCardCatalogSuggestions] = useState([])
  const [recurring, setRecurring] = useState([])
  const [showSaveRecurring, setShowSaveRecurring] = useState(false)
  const [recurringName, setRecurringName] = useState('')
  const [perkUpdates, setPerkUpdates] = useState({})       // { cardId: { newPerks, changedPerks } }
  const [perkUpdateModal, setPerkUpdateModal] = useState(null) // { card, newPerks, changedPerks }
  const [applyingPerkUpdate, setApplyingPerkUpdate] = useState(false)

  // Add-card form state
  const [newCard, setNewCard] = useState({
    name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a',
    balance: '', balance_unit: 'points', annual_fee: '', merchant: '', _feeTouched: false,
    multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' }
  })
  const [giftMerchantSuggestions, setGiftMerchantSuggestions] = useState([])
  const [fetchingCardData, setFetchingCardData] = useState(false)
  const cardFetchTimer = useRef(null)

  const [newPerk, setNewPerk] = useState({
    name: '', total_amount: '', used_amount: '0', period: 'monthly', resets_at: ''
  })

  const loadCards = useCallback(async () => {
    try {
      const data = await getUserCards()
      setCards(data)

      // Auto-reset perks whose period has rolled over (resets_at is in the past)
      const today = new Date().toISOString().split('T')[0]
      for (const card of data) {
        for (const perk of card.perks || []) {
          if (perk.resets_at && perk.resets_at < today && perk.used_amount > 0) {
            const newResetsAt = calculateResetsAt(perk.period)
            await updatePerk(perk.id, { used_amount: 0, resets_at: newResetsAt })
          }
        }
      }

      // Check catalog for perk changes on cards that have perks tracked
      const dismissed = JSON.parse(localStorage.getItem('clavis_dismissed_perk_updates') || '{}')
      const updates = {}
      // Check ALL credit/store cards — including those with zero perks tracked yet
      const cardsWithPerks = data.filter(c => c.type !== 'gift' && c.type !== 'loyalty')
      await Promise.all(cardsWithPerks.map(async card => {
        if (dismissed[card.id]) return
        try {
          const res = await fetch('/api/card-perks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: card.name }),
          })
          const catalogData = await res.json()
          if (!catalogData.perks || catalogData.perks.length === 0) return

          const userPerkNames = (card.perks || []).map(p => p.name.toLowerCase())
          const newPerks = catalogData.perks.filter(cp =>
            cp.total_amount > 0 && !userPerkNames.some(n => n.includes(cp.name.toLowerCase()) || cp.name.toLowerCase().includes(n))
          )
          const changedPerks = catalogData.perks.filter(cp => {
            const match = (card.perks || []).find(up => up.name.toLowerCase().includes(cp.name.toLowerCase()) || cp.name.toLowerCase().includes(up.name.toLowerCase()))
            return match && Math.abs(match.total_amount - cp.total_amount) >= 1
          })

          if (newPerks.length > 0 || changedPerks.length > 0) {
            updates[card.id] = { newPerks, changedPerks, catalogPerks: catalogData.perks }
          }
        } catch { /* silent */ }
      }))
      if (Object.keys(updates).length > 0) setPerkUpdates(updates)
    } catch (e) { console.error(e) }
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
      getWeeklyDigestPref().then(setWeeklyDigest).catch(() => {})
      getRecurring().then(setRecurring).catch(() => {})
      // Auto-launch tour for first-time visitors
      if (!localStorage.getItem('clavis_toured')) {
        setTimeout(() => setTourStep(0), 800)
        localStorage.setItem('clavis_toured', '1')
      }
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

  // Spending breakdown — aggregate logged taps by category and by card
  const spendingBreakdown = useMemo(() => {
    const byCategory = {}
    const byCard = {}
    let totalSpend = 0
    let totalEarned = 0
    for (const t of taps) {
      const amt = t.amount || 0
      totalSpend += amt
      totalEarned += t.estimated_value || 0
      const cat = t.category || 'other'
      if (!byCategory[cat]) byCategory[cat] = { key: cat, spend: 0, earned: 0, count: 0 }
      byCategory[cat].spend += amt
      byCategory[cat].earned += t.estimated_value || 0
      byCategory[cat].count++

      const cardKey = t.card_id || t.card_name
      if (!byCard[cardKey]) byCard[cardKey] = { key: cardKey, name: t.card_name, spend: 0, earned: 0, count: 0 }
      byCard[cardKey].spend += amt
      byCard[cardKey].earned += t.estimated_value || 0
      byCard[cardKey].count++
    }
    const categories = Object.values(byCategory).sort((a, b) => b.spend - a.spend)
    const byCardArr = Object.values(byCard).sort((a, b) => b.spend - a.spend)
    return { categories, byCard: byCardArr, totalSpend, totalEarned }
  }, [taps])

  function pickCategory(cat) {
    setSelectedCat(cat)
    setSelectedCardId(null)
    setDetectedMerchant(null)
    if (typeof window !== 'undefined') localStorage.setItem('clavis_last_cat', cat)
  }

  // Generic words that show up in perk names but aren't merchant identifiers —
  // stripped out before matching a perk name against what the user typed, so
  // e.g. "Resy Dining Credit" reduces to "resy" rather than matching every
  // "dining" search.
  const PERK_GENERIC_WORDS = new Set([
    'credit', 'credits', 'dining', 'travel', 'hotel', 'hotels', 'airline', 'airlines',
    'fee', 'fees', 'digital', 'entertainment', 'property', 'eligible', 'stays', 'stay',
    'global', 'entry', 'tsa', 'precheck', 'in-flight', 'inflight', 'wifi', 'wi-fi',
    'rideshare', 'resort', 'resorts', 'fine', 'dashpass', 'plus', 'membership',
    'annual', 'monthly', 'semi-annual', 'and', 'the', 'amex', 'chase', 'card', 'bonus',
  ])

  // Does this perk look like it's tied to a specific merchant the user is
  // shopping at right now? (e.g. a "Peloton Credit" perk when the user types
  // "Peloton") — these are typically use-it-here-or-lose-it statement credits
  // that only get captured by spending at that exact merchant.
  function perkMatchesMerchant(perkName, merchantStr) {
    if (!merchantStr) return false
    const m = merchantStr.toLowerCase().trim()
    if (m.length < 3) return false
    const words = perkName.toLowerCase().replace(/[^\w\s+'-]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !PERK_GENERIC_WORDS.has(w))
    return words.some(w => m.includes(w) || w.includes(m))
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
    // Dollar value still sitting unused on this card — this is what actually
    // determines how much "weight" a perk should carry against a marginal
    // rewards-rate difference. A flat per-perk bump would let a $5 perk and a
    // $300 perk nudge the score by the same amount, which doesn't reflect
    // what's really at stake for the user.
    const activePerksValue = activePerks.reduce((s, p) => s + Math.max(0, (p.total_amount || 0) - (p.used_amount || 0)), 0)
    const expiringPerksValue = expiringPerks.reduce((s, p) => s + Math.max(0, (p.total_amount || 0) - (p.used_amount || 0)), 0)
    const isGiftWithBalance = card.type === 'gift' && (card.balance || 0) > 0

    // Check if this gift card is linked to the merchant being typed
    const tapMerchant = (detectedMerchant?.name || merchantQuery || '').toLowerCase().trim()
    const giftMerchantLinked = isGiftWithBalance && tapMerchant && (() => {
      const linked = (card.merchant || '').toLowerCase()
      const cardName = card.name.toLowerCase()
      // Match against the explicit merchant field, or infer from card name
      return (linked && (linked.includes(tapMerchant) || tapMerchant.includes(linked))) ||
             cardName.includes(tapMerchant) ||
             tapMerchant.includes(cardName.replace(/\s*(gift\s*card|gc)\s*/gi, '').trim())
    })()

    // A merchant-specific perk you'd otherwise likely never use: a $60
    // Peloton credit only has value if you're shopping at Peloton — the
    // rewards-rate math doesn't matter if this is the one shot you have to
    // capture it. Surface (and prioritize) the card whose unused perk best
    // matches where the user is tapping.
    const merchantPerkMatch = tapMerchant
      ? activePerks
          .filter(p => perkMatchesMerchant(p.name, tapMerchant))
          .sort((a, b) => (b.total_amount - b.used_amount) - (a.total_amount - a.used_amount))[0]
      : null

    let score = dollarVal * 100
    // Small steady nudge for cards carrying unused perk value, plus a
    // sharper urgency nudge — scaled by dollars, not just perk count — for
    // perks about to reset. A $5 credit barely moves the needle; a $200
    // credit expiring this week can (and should) outweigh a modest
    // rewards-rate edge from another card.
    score += activePerks.length * 0.3 + activePerksValue / 50
    score += expiringPerks.length * 1 + expiringPerksValue / 15
    if (isGiftWithBalance) score += 5
    // A merchant-matched perk beats ordinary rewards-rate math — this may be
    // the only purchase all year where this credit is even capturable. It
    // sits just below a linked gift card balance (money you've already spent).
    if (merchantPerkMatch) score = Math.max(score, 500 + (merchantPerkMatch.total_amount - merchantPerkMatch.used_amount))
    if (giftMerchantLinked) score = 9999

    const reasons = []
    if (merchantPerkMatch) {
      const remaining = merchantPerkMatch.total_amount - merchantPerkMatch.used_amount
      reasons.push(`Use here — captures your $${remaining % 1 === 0 ? remaining.toFixed(0) : remaining.toFixed(2)} ${merchantPerkMatch.name.replace(/\s*credit\s*$/i, '')} credit`)
    }
    if (mult > 0) {
      const fvpd = formatValuePerDollar(card, mult)
      reasons.push(isCashBack(card) ? `${mult}% back` : `${mult}x pts${fvpd ? ` (${fvpd})` : ''}`)
    }
    if (expiringPerks.length > 0) reasons.push(`${expiringPerks.length} perk${expiringPerks.length > 1 ? 's' : ''} expiring soon`)
    else if (activePerks.length > 0 && !merchantPerkMatch) reasons.push(`${activePerks.length} active perk${activePerks.length > 1 ? 's' : ''}`)
    if (isGiftWithBalance) reasons.push(`$${card.balance} gift balance`)
    if (giftMerchantLinked) reasons.unshift(`Use here`)

    return { card, score, dollarVal, reasons }
  }

  // Ranking is recomputed often (every render the Tap tab is active, plus
  // whenever the rankings modal opens) — memoize it so we score/sort the
  // wallet once per relevant state change instead of 2-4x per render.
  const rankedCards = useMemo(() => {
    return [...cards]
      .filter(c => !(c.type === 'gift' && (c.balance || 0) <= 0))
      .map(scoreCard)
      .sort((a, b) => {
        const d = b.score - a.score
        if (Math.abs(d) > 0.001) return d
        return (b.card.annual_fee || 0) - (a.card.annual_fee || 0)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, selectedCat, detectedMerchant, merchantQuery])

  function getRankedCards() { return rankedCards }
  function getBestCard() { return rankedCards[0]?.card || null }
  function getActiveCard() {
    if (selectedCardId) return cards.find(c => c.id === selectedCardId) || getBestCard()
    return getBestCard()
  }
  function isBestTied() {
    if (cards.length < 2 || selectedCardId) return false
    return Math.abs(rankedCards[0].score - rankedCards[1].score) <= 0.001 &&
           (rankedCards[0].card.annual_fee || 0) === (rankedCards[1].card.annual_fee || 0)
  }

  function exportHistory(format) {
    const rows = taps.map(t => ({
      Date: t.tapped_at ? new Date(t.tapped_at).toLocaleDateString() : '',
      Merchant: t.merchant || '',
      Card: t.card_name || '',
      Category: t.category || '',
      Amount: t.amount || 0,
      'Rewards Rate': t.rewards_rate || '',
      'Est. Value': t.estimated_value || 0,
      Note: t.Note || '',
    }))

    if (format === 'csv') {
      const headers = Object.keys(rows[0])
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clavis-history.csv'; a.click()
    } else {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'History')
        XLSX.writeFile(wb, 'clavis-history.xlsx')
      })
    }
  }

  async function simulateTap() {
    const card = getActiveCard()
    if (!card) return
    setTapError('')
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

    try {
      await logTap({
        card_id: card.id,
        card_name: card.name,
        merchant: detectedMerchant?.name || merchantQuery || null,
        category: selectedCat,
        amount: selectedAmt,
        rewards_rate: rate || (card.type === 'gift' ? 'gift' : null),
        estimated_value: card.type === 'gift' ? 0 : estimatedValue,
        note: tapNote.trim() || null,
      })
      setTapNote('')
      setSelectedAmt(0)
      loadTaps()
    } catch (e) {
      setTapError(e.message || 'Failed to save tap — please try again.')
      return
    }

    setTapConfirm(confirmMsg)
    setMissedInsight(null)
    // Offer to save as recurring if not already saved
    const merchantName = detectedMerchant?.name || merchantQuery || null
    const alreadySaved = recurring.some(r => r.merchant === merchantName && r.card_id === card.id)
    if (merchantName && !alreadySaved) {
      setRecurringName(merchantName)
      setShowSaveRecurring(true)
      setTimeout(() => setShowSaveRecurring(false), 8000)
    }

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
      setNewCard(prev => {
        const feeAutoFilled = !prev._feeTouched && suggestion.annualFee !== undefined
        return {
          ...prev, name, multipliers: mults, _suggestion: suggestion.note, _aiSuggestion: false,
          _feeAutoFilled: feeAutoFilled,
          annual_fee: feeAutoFilled ? String(suggestion.annualFee) : prev.annual_fee,
        }
      })
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
        merchant: newCard.type === 'gift' && newCard.merchant ? newCard.merchant : null,
      })
      const mults = {}
      CATEGORIES.forEach(cat => { if (newCard.multipliers[cat]) mults[cat] = newCard.multipliers[cat] })
      if (Object.keys(mults).length) await addMultipliers(created.id, mults)
      await loadCards()
      setShowAddCard(false)

      // Perk suggestions: prefer internal DB, fall back to AI perks from the async fetch
      const dbPerks = getSuggestedPerks(newCard.name)
      const perksToSuggest = dbPerks && dbPerks.length > 0 ? dbPerks : (newCard._aiPerks || [])

      setNewCard({ name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a', balance: '', balance_unit: 'points', annual_fee: '', merchant: '', multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' } })
      setGiftMerchantSuggestions([])

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
    setEditMultipliers(mults)
    setEditAnnualFee(card.annual_fee != null ? String(card.annual_fee) : '')
    setShowCorrectionForm(false)
    setCorrectionField('Annual fee')
    setCorrectionValue('')
    setCorrectionNote('')
    setCorrectionSubmitted(false)
    setEditingCard(card)
  }

  async function handleSubmitCorrection() {
    if (!editingCard || !correctionValue.trim()) return
    setCorrectionSubmitting(true)
    try {
      const currentMap = {
        'Annual fee': editingCard.annual_fee,
      }
      await submitCardCorrection({
        cardName: editingCard.name,
        field: correctionField,
        currentValue: currentMap[correctionField],
        suggestedValue: correctionValue.trim(),
        note: correctionNote.trim(),
      })
      setCorrectionSubmitted(true)
      setCorrectionValue('')
      setCorrectionNote('')
    } catch (e) {
      console.error(e)
    } finally {
      setCorrectionSubmitting(false)
    }
  }

  async function handleSaveRecurring() {
    const card = getActiveCard()
    if (!card || !recurringName.trim()) return
    const newEntry = {
      id: Date.now(),
      name: recurringName.trim(),
      merchant: detectedMerchant?.name || merchantQuery || recurringName.trim(),
      category: selectedCat,
      card_id: card.id,
      card_name: card.name,
    }
    const updated = [...recurring, newEntry]
    setRecurring(updated)
    await saveRecurring(updated)
    setShowSaveRecurring(false)
  }

  async function deleteRecurring(id) {
    const updated = recurring.filter(r => r.id !== id)
    setRecurring(updated)
    await saveRecurring(updated)
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return
    setDeletingAccount(true)
    setDeleteAccountError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired — please sign in again.')
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Something went wrong deleting your account.')
      await supabase.auth.signOut()
      router.push('/')
    } catch (e) {
      setDeleteAccountError(e.message)
      setDeletingAccount(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingCard) return
    try {
      await updateCardMultipliers(editingCard.id, editMultipliers)
      const fee = parseFloat(editAnnualFee)
      if (!isNaN(fee) && fee !== (editingCard.annual_fee || 0)) await updateCardFee(editingCard.id, fee)
      await loadCards()
      setEditingCard(null)
    } catch (e) { console.error(e) }
  }

  // Cards whose annual fee no longer matches the latest known rate in our
  // internal rewards database (e.g. an issuer raised the fee since the user
  // added the card) — surfaced as a one-click "sync" opportunity in Wallet.
  const feeUpdates = useMemo(() => {
    return cards
      .map(card => {
        const suggestion = getSuggestedMultipliers(card.name)
        if (!suggestion || suggestion.annualFee === undefined) return null
        const current = card.annual_fee || 0
        if (suggestion.annualFee === current) return null
        return { id: card.id, name: card.name, oldFee: current, newFee: suggestion.annualFee }
      })
      .filter(Boolean)
  }, [cards])

  // ── Notification center: unify urgent perk expirations + fee changes into one feed ──
  const notifications = useMemo(() => {
    const items = []
    for (const insight of perkInsights) {
      if (insight.days <= 14) {
        items.push({
          id: `perk-${insight.id}`,
          urgent: insight.days <= 7,
          icon: '◷',
          color: insight.days <= 7 ? 'var(--red)' : 'var(--orange)',
          title: `${insight.perk.name} expires in ${insight.days}d`,
          detail: `$${insight.remaining.toFixed(0)} unused on your ${insight.card.name}`,
          tab: 'perks',
        })
      }
    }
    for (const u of feeUpdates) {
      items.push({
        id: `fee-${u.id}`,
        urgent: u.newFee > u.oldFee,
        icon: '✦',
        color: u.newFee > u.oldFee ? 'var(--orange)' : 'var(--green)',
        title: `${u.name} annual fee changed`,
        detail: `$${u.oldFee} → $${u.newFee}`,
        tab: 'wallet',
      })
    }
    return items.sort((a, b) => (b.urgent === a.urgent) ? 0 : (b.urgent ? 1 : -1))
  }, [perkInsights, feeUpdates])

  async function syncAllFees() {
    if (!feeUpdates.length) return
    setSyncingFees(true)
    try {
      await Promise.all(feeUpdates.map(u => updateCardFee(u.id, u.newFee)))
      await loadCards()
    } catch (e) { console.error(e) }
    setSyncingFees(false)
  }

  async function syncOneFee(update) {
    setSyncingFees(true)
    try { await updateCardFee(update.id, update.newFee); await loadCards() } catch (e) { console.error(e) }
    setSyncingFees(false)
  }

  async function handleUpdatePerkUsed(perkId, usedAmount) {
    try { await updatePerk(perkId, { used_amount: parseFloat(usedAmount) }); await loadCards() } catch (e) { console.error(e) }
  }

  function dismissPerkUpdate(cardId) {
    const dismissed = JSON.parse(localStorage.getItem('clavis_dismissed_perk_updates') || '{}')
    dismissed[cardId] = true
    localStorage.setItem('clavis_dismissed_perk_updates', JSON.stringify(dismissed))
    setPerkUpdates(prev => { const next = { ...prev }; delete next[cardId]; return next })
    setPerkUpdateModal(null)
  }

  async function applyPerkUpdate(card, newPerks, changedPerks) {
    setApplyingPerkUpdate(true)
    try {
      // Add brand-new perks
      for (const p of newPerks) {
        await addPerk({ name: p.name, total_amount: p.total_amount, used_amount: 0, period: p.period, resets_at: calculateResetsAt(p.period), card_id: card.id })
      }
      // Update total_amount on changed perks (preserve used_amount)
      for (const cp of changedPerks) {
        const userPerk = card.perks.find(up => up.name.toLowerCase().includes(cp.name.toLowerCase()) || cp.name.toLowerCase().includes(up.name.toLowerCase()))
        if (userPerk) await updatePerk(userPerk.id, { total_amount: cp.total_amount, period: cp.period })
      }
      dismissPerkUpdate(card.id)
      await loadCards()
    } catch (e) { console.error(e) }
    setApplyingPerkUpdate(false)
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
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading your wallet...</p>
    </div>
  )

  const sheetStyle = {
    background: 'var(--bg-card)', borderRadius: '8px 8px 0 0', padding: '1.5rem',
    width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
    border: '1px solid var(--border-subtle)', borderBottom: 'none',
  }

  const insightCount = perkInsights.length + retroactiveMissed.length + cardRecs.length
  const urgentNotifCount = notifications.filter(n => n.urgent).length

  return (
    <div className="app" style={{ paddingTop: 0 }}>

      <style>{marketingStyles}</style>

      {/* ── Sticky nav — exact match to about page nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)',
        width: '100vw',
        background: 'rgba(9,9,12,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="dash-nav-inner" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', minHeight: '60px', rowGap: '4px' }}>
          {/* Logo */}
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <KeySVG size={18} id="dashkey"/>
            <span className="dash-logo-text" style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: '#dddde4' }}>CLAVIS</span>
          </a>

          {/* About / Sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0, order: 2 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(v => !v)} aria-label="Notifications"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', display: 'flex', alignItems: 'center', padding: '4px', color: '#dddde4', lineHeight: 1 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px', minWidth: '15px', height: '15px', borderRadius: '50%',
                    background: urgentNotifCount > 0 ? 'var(--red)' : 'var(--gold)', color: '#fff', fontSize: '9px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid rgba(9,9,12,0.85)',
                  }}>
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                  <div onClick={() => setShowNotifications(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: '320px', maxHeight: '420px', overflowY: 'auto',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                    zIndex: 200, padding: '14px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>Notifications</div>
                    {notifications.length === 0 ? (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-faintest)', padding: '12px 2px', lineHeight: '1.5' }}>
                        You're all caught up — no expiring perks or fee changes to flag right now.
                      </div>
                    ) : notifications.map(n => (
                      <button key={n.id} onClick={() => { setTab(n.tab); setShowNotifications(false) }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '9px 4px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: n.color, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{n.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{n.detail}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setTourStep(0)} className="mkt-nav-link dash-about-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Take a tour</button>
            <a href="/about" className="mkt-nav-link dash-about-link">About</a>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowAccountMenu(v => !v)}
                className="pill-dark dash-sign-out" style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Account
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAccountMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showAccountMenu && (
                <>
                  <div onClick={() => setShowAccountMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: '180px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.18)', zIndex: 200, padding: '6px', overflow: 'hidden',
                  }}>
                    {user?.email && (
                      <div style={{ padding: '8px 10px 9px', fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                        {user.email}
                      </div>
                    )}
                    <button onClick={() => { setShowAccountMenu(false); supabase.auth.signOut().then(() => router.push('/auth')) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', padding: '9px 10px', borderRadius: '6px' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      Sign out
                    </button>
                    <button onClick={() => { setShowAccountMenu(false); setShowDeleteAccount(true); setDeleteConfirmText(''); setDeleteAccountError('') }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: 'var(--red)', padding: '9px 10px', borderRadius: '6px' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,82,82,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      Delete account
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center links — dashboard tabs (own row on narrow screens, scrollable) */}
          <div className="dash-nav-tabs" style={{ display: 'flex', alignItems: 'center', gap: '28px', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', minWidth: 0, flex: '1 1 auto', justifyContent: 'center', order: 1 }}>
            {[
              { key: 'tap',      label: 'Tap' },
              { key: 'wallet',   label: 'Wallet' },
              { key: 'perks',    label: 'Perks' },
              { key: 'history',  label: 'History' },
              { key: 'insights', label: 'Insights' },
            ].map(({ key, label }) => (
              <button key={key} ref={el => { tourTabRefs.current[key] = el }} onClick={() => setTab(key)}
                className="mkt-nav-link"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  color: tab === key ? '#dddde4' : (key === 'insights' && insightCount > 0 ? 'var(--gold)' : undefined),
                }}>
                {label}
                {key === 'insights' && insightCount > 0 && tab !== key && (
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', background: '#c9a227', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle', marginBottom: '2px' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ height: '1.5rem' }} />

      {/* ── SMART TAP ─────────────────────────────────── */}
      {tab === 'tap' && (
        <div>

          {/* 0 ── Recurring quick-taps */}
          {recurring.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faintest)', marginBottom: '10px' }}>Recurring</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recurring.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 14px' }}>
                    <button onClick={() => {
                      setMerchantQuery(r.merchant)
                      const m = searchMerchants(r.merchant)[0]
                      if (m) { setDetectedMerchant(m); pickCategory(m.category) }
                      else if (r.category) pickCategory(r.category)
                      if (r.card_id) setSelectedCardId(r.card_id)
                    }} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{r.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.card_name}{r.category ? ` · ${r.category}` : ''}</div>
                    </button>
                    <button onClick={() => deleteRecurring(r.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faintest)', fontSize: '14px', padding: '2px 4px', lineHeight: 1 }}
                      title="Remove">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1 ── Merchant search */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{
              background: 'transparent',
              borderRadius: '4px',
              padding: '14px 18px',
              border: detectedMerchant
                ? '1px solid rgba(29,184,122,0.4)'
                : '1px solid var(--border)',
              transition: 'border-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', color: 'var(--text-faintest)', flexShrink: 0, textTransform: 'uppercase' }}>
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
                  style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              {merchantQuery && (
                <button
                  onClick={() => { setMerchantQuery(''); setDetectedMerchant(null); setMerchantSuggestions([]); setSelectedCardId(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', flexShrink: 0, lineHeight: 1, padding: '0 2px' }}>
                  ×
                </button>
              )}
            </div>
            {merchantSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 200, overflow: 'hidden', maxHeight: '260px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                {merchantSuggestions.map(m => (
                  <div key={m.name}
                    onClick={() => { pickCategory(m.category); setMerchantQuery(m.name); setDetectedMerchant(m); setMerchantSuggestions([]) }}
                    style={{ padding: '11px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: '9999px' }}>{CAT_META[m.category]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1b ── Note */}
          <div style={{ marginBottom: '20px' }}>
            <textarea
              className="input"
              rows={1}
              placeholder="Add a note (optional)"
              value={tapNote}
              maxLength={150}
              onChange={e => setTapNote(e.target.value)}
              style={{ resize: 'none', lineHeight: '1.5', fontSize: '13px', paddingTop: '9px', paddingBottom: '9px', overflow: 'hidden' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            />
            {tapNote.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: '11px', color: tapNote.length >= 140 ? 'var(--red)' : 'var(--text-faintest)', marginTop: '4px' }}>
                {tapNote.length}/150
              </div>
            )}
          </div>

          {/* 2 ── Category selector */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => pickCategory(cat)}
                style={{
                  flexShrink: 0, padding: '8px 17px',
                  borderRadius: '9999px',
                  border: selectedCat === cat ? '1px solid rgba(201,162,39,0.5)' : '1px solid var(--border-subtle)',
                  background: selectedCat === cat ? 'rgba(201,162,39,0.1)' : 'transparent',
                  color: selectedCat === cat ? '#c9a227' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                {CAT_META[cat].label}
              </button>
            ))}
          </div>

          {/* 3 ── Hero card */}
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
              No cards yet — add one in Wallet.
            </div>
          ) : (() => {
            const mult = getMultiplier(activeCard)
            const dollarVal = activeCard ? dollarValuePerDollar(activeCard, mult) : 0
            const valuePer = activeCard ? formatValuePerDollar(activeCard, mult) : null
            const estimatedOnAmt = selectedAmt > 0 && dollarVal > 0 ? dollarVal * selectedAmt : 0
            const isGift = activeCard?.type === 'gift'
            const isDebit = activeCard?.type === 'debit'
            const label = selectedCardId ? 'Selected' : isBestTied() ? 'Tied' : 'Recommended'
            const portalTip = activeCard && !isCashBack(activeCard) && mult > 0
              && (selectedCat === 'travel' || selectedCat === 'hotel')
              && (detectedMerchant || merchantQuery)
              ? getPointValuation(activeCard.name).tip
              : null

            return (
              <div style={{ border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden' }}>
                {/* Card header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <CardArt name={activeCard?.name || ''} style={{ width: '60px', height: '40px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCard?.name || '—'}
                    </div>
                    {activeCard?.last_four && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
                        •••• {activeCard.last_four}
                      </div>
                    )}
                  </div>
                  {selectedCardId && (
                    <button onClick={() => setSelectedCardId(null)}
                      style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '9999px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Auto
                    </button>
                  )}
                </div>
                {/* Rate row */}
                <div style={{ padding: '20px 20px 22px', background: 'var(--bg-elevated)' }}>
                  {isGift ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                      <span style={{ fontSize: '46px', fontWeight: '700', color: 'var(--green)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        ${(activeCard.balance || 0).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>remaining</span>
                    </div>
                  ) : isDebit ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-muted)' }}>No rewards</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-faintest)' }}>Debit cards don't earn points or cash back</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                          <span style={{ fontSize: '46px', fontWeight: '700', color: '#c9a227', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                            {mult > 0 ? formatRate(activeCard, mult) : isCashBack(activeCard) ? '1%' : '1×'}
                          </span>
                          {valuePer && mult > 0 && (
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>{valuePer}</span>
                          )}
                        </div>
                        {estimatedOnAmt > 0 && (
                          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                            +${estimatedOnAmt.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {portalTip && dismissedPortalTip !== portalTip && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '6px', padding: '8px 12px', lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ flex: 1 }}>💡 {portalTip}</span>
                          <button onClick={() => setDismissedPortalTip(portalTip)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faintest)', fontSize: '13px', padding: 0, lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>✕</button>
                        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '13px 16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500', flexShrink: 0 }}>Amount</span>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>$</span>
            <input type="number" min="0" placeholder="0.00" value={selectedAmt || ''}
              onChange={e => setSelectedAmt(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '17px', fontWeight: '600', fontFamily: 'inherit', outline: 'none' }} />
            {selectedAmt > 0 && (
              <button onClick={() => setSelectedAmt(0)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>✕</button>
            )}
          </div>

          {/* 6 ── See all cards */}
          {cards.length > 1 && (
            <button onClick={() => setShowRankings(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faintest)', cursor: 'pointer', padding: '8px', transition: 'color 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faintest)'}>
              View all {cards.length} cards →
            </button>
          )}

          {tapConfirm && (
            <div className="success" style={{ marginTop: '10px', textAlign: 'center' }}>{tapConfirm}</div>
          )}
          {tapError && (
            <div className="error" style={{ marginTop: '10px', textAlign: 'center' }}>{tapError}</div>
          )}

          {showSaveRecurring && (
            <div style={{ marginTop: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1, minWidth: '120px' }}>Save <strong style={{ color: 'var(--text-primary)' }}>{recurringName}</strong> as a recurring purchase?</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleSaveRecurring}
                  style={{ fontSize: '11.5px', fontWeight: '700', padding: '6px 14px', background: 'var(--text-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Save
                </button>
                <button onClick={() => setShowSaveRecurring(false)}
                  style={{ fontSize: '11.5px', fontWeight: '600', padding: '6px 12px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  No thanks
                </button>
              </div>
            </div>
          )}

          {missedInsight && (
            <div style={{ marginTop: '8px', background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.28)', borderRadius: '4px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>💡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--orange)', marginBottom: '2px' }}>
                  {missedInsight.missedOnAmt
                    ? `$${missedInsight.missedOnAmt.toFixed(2)} more with ${missedInsight.cardName}`
                    : `${missedInsight.missedPerDollar}¢/$ more with ${missedInsight.cardName}`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {missedInsight.cardName} earns {missedInsight.rate} here
                  {missedInsight.missedOnAmt ? ` · ${missedInsight.missedPerDollar}¢ more per dollar` : ''}
                </div>
              </div>
              <button onClick={() => setMissedInsight(null)} style={{ background: 'none', border: 'none', color: 'var(--text-faintest)', cursor: 'pointer', fontSize: '14px', padding: '0', flexShrink: 0 }}>✕</button>
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
                  { label: 'Cards', value: cards.length, color: 'var(--text-primary)' },
                  { label: 'Annual fees', value: totalFees > 0 ? `$${totalFees.toFixed(0)}` : '$0', color: totalFees > 0 ? 'var(--red)' : 'var(--text-faintest)' },
                  { label: 'Net value', value: `${netValue >= 0 ? '+' : ''}$${netValue.toFixed(0)}`, color: netValue >= 0 ? 'var(--green)' : 'var(--red)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '18px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: m.color, marginBottom: '5px' }}>{m.value}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {feeUpdates.length > 0 && !feeSyncDismissed && (
            <div style={{ marginBottom: '1.25rem', border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.05)', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  ✦ {feeUpdates.length === 1 ? 'An annual fee has' : `${feeUpdates.length} annual fees have`} changed since you added {feeUpdates.length === 1 ? 'this card' : 'these cards'}
                </div>
                <button onClick={() => setFeeSyncDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-faintest)', cursor: 'pointer', fontSize: '14px', padding: 0, flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ marginBottom: '12px' }}>
                {feeUpdates.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                    <span>{u.name} — ${u.oldFee}/yr → <strong style={{ color: 'var(--text-primary)' }}>${u.newFee}/yr</strong></span>
                    <button onClick={() => syncOneFee(u)} disabled={syncingFees}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: 'var(--blue)', padding: '2px 6px', flexShrink: 0 }}>
                      Update
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={syncAllFees} disabled={syncingFees} style={{ width: 'auto', padding: '9px 16px', fontSize: '13px' }}>
                {syncingFees ? 'Syncing…' : `Update all ${feeUpdates.length === 1 ? '' : feeUpdates.length}`.trim()}
              </button>
            </div>
          )}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '1rem' }}>No cards yet. Add your first one below.</div>
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
                  <div key={card.id} data-reveal style={{ marginBottom: '8px', borderRadius: '4px', border: isPaidOff ? '1.5px solid rgba(29,184,122,0.3)' : '1px solid var(--border-subtle)', background: isPaidOff ? 'rgba(15,155,101,0.04)' : 'var(--bg-card)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '17px 16px', cursor: fee > 0 ? 'pointer' : 'default' }}
                      onClick={() => fee > 0 && setExpandedRoiId(isExpanded ? null : card.id)}>
                      <CardArt name={card.name} style={{ width: '54px', height: '36px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {card.type}{fee > 0 ? ` · $${fee}/yr fee` : ''}
                        </div>
                      </div>
                      {fee > 0 ? (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {isPaidOff ? (
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--green)', background: 'rgba(29,184,122,0.15)', borderRadius: '9999px', padding: '4px 11px' }}>✓ Paid off</div>
                          ) : (
                            <>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#c9a227', letterSpacing: '-0.02em' }}>{roiPct.toFixed(0)}%</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>${remaining.toFixed(0)} to go</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-faintest)', padding: '0 4px' }}>no fee</div>
                      )}
                    </div>

                    {fee > 0 && (
                      <div style={{ padding: '0 14px', marginBottom: isExpanded ? '0' : '12px' }}>
                        <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '4px', borderRadius: '3px', width: roiPct + '%', background: isPaidOff ? 'var(--green)' : roiPct > 60 ? 'var(--gold)' : 'rgba(201,162,39,0.45)', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                        {!isExpanded && breakEvenLabel && (
                          <div style={{ fontSize: '10px', color: 'var(--text-faintest)', marginTop: '5px', marginBottom: '2px' }}>{breakEvenLabel}</div>
                        )}
                      </div>
                    )}

                    {fee > 0 && isExpanded && (
                      <div style={{ margin: '0 14px 14px', background: 'var(--bg-elevated)', borderRadius: '4px', padding: '12px', border: '1px solid var(--border-subtle)' }}>
                        {[
                          { label: 'Perks captured', value: perksValue, color: 'var(--blue)' },
                          { label: 'Tap rewards', value: tapValue, color: 'var(--green)' },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: row.value > 0 ? row.color : 'var(--text-faintest)' }}>
                              {row.value > 0 ? `+$${row.value.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        ))}
                        <div style={{ height: '1px', background: 'var(--bg-elevated)', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakEvenLabel ? '8px' : '0' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Annual fee</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--red)' }}>−${fee.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakEvenLabel ? '8px' : '0' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Net value</span>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: totalValue >= fee ? 'var(--green)' : 'var(--gold)', letterSpacing: '-0.02em' }}>
                            {totalValue >= fee ? '+' : ''}${(totalValue - fee).toFixed(2)}
                          </span>
                        </div>
                        {breakEvenLabel && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '4px', fontSize: '11px', color: '#c9a227', fontWeight: '500' }}>
                            — {breakEvenLabel}
                          </div>
                        )}
                        {isPaidOff && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(15,155,101,0.08)', border: '1px solid rgba(15,155,101,0.25)', borderRadius: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: '600' }}>
                            ✓ This card has fully paid for its annual fee
                          </div>
                        )}
                        {!isPaidOff && tapValue === 0 && perksValue === 0 && (
                          <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(217,82,82,0.08)', border: '1px solid rgba(217,82,82,0.2)', borderRadius: '4px', fontSize: '11px', color: 'var(--red)', fontWeight: '500' }}>
                            No value captured yet — use Smart Tap or mark perks used
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '5px', padding: '0 14px 14px' }}>
                      <button onClick={() => { setAddingToCardId(card.id); setShowAddPerk(true) }}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '600', transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                        + perk
                      </button>
                      <button onClick={() => openEditCard(card)}
                        style={{ padding: '6px 9px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '600', transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                        edit
                      </button>
                      <button onClick={() => deleteCard(card.id).then(loadCards)}
                        style={{ padding: '6px 9px', fontSize: '11px', border: '1px solid rgba(217,82,82,0.3)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontWeight: '600', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
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
            <div data-reveal style={{ marginTop: '14px', background: 'var(--bg-card)', borderRadius: '4px', padding: '1.25rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.125rem' }}>Add a card</div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Card name</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" placeholder="e.g. Amex Gold" value={newCard.name}
                    onChange={e => {
                      handleNewCardNameChange(e.target.value)
                      setCardCatalogSuggestions(searchCardCatalog(e.target.value))
                    }}
                    onFocus={() => setCardCatalogSuggestions(searchCardCatalog(newCard.name))}
                    onBlur={() => setTimeout(() => setCardCatalogSuggestions([]), 150)}
                  />
                  {fetchingCardData && (
                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Looking up...
                    </div>
                  )}
                  {cardCatalogSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faintest)', padding: '8px 12px 4px' }}>From card database</div>
                      {cardCatalogSuggestions.map((c, i) => (
                        <div key={i}
                          onMouseDown={() => {
                            handleNewCardNameChange(c.name)
                            setCardCatalogSuggestions([])
                          }}
                          style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</span>
                          {c.annualFee > 0
                            ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${c.annualFee}/yr</span>
                            : <span style={{ fontSize: '11px', color: 'var(--green)' }}>No annual fee</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">Type</label>
                <select className="input" value={newCard.type} onChange={e => setNewCard({ ...newCard, type: e.target.value })}>
                  <option value="credit">Credit card</option>
                  <option value="debit">Debit card</option>
                  <option value="loyalty">Loyalty card</option>
                  <option value="gift">Gift card</option>
                  <option value="store">Store credit card</option>
                </select>
              </div>

              {newCard.name && <div style={{ marginBottom: '12px' }}><CardArt name={newCard.name} style={{ height: '64px' }} /></div>}

              {newCard.type === 'gift' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="label">Remaining balance ($)</label>
                    <input className="input" type="number" placeholder="0.00" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value, balance_unit: 'dollars' })} />
                  </div>
                  <div style={{ marginBottom: '12px', position: 'relative' }}>
                    <label className="label">Linked merchant (optional)</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Target, Starbucks, Amazon…"
                      value={newCard.merchant}
                      onChange={e => {
                        const q = e.target.value
                        setNewCard({ ...newCard, merchant: q })
                        setGiftMerchantSuggestions(q.length >= 2 ? searchMerchants(q) : [])
                      }}
                    />
                    {giftMerchantSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 200, overflow: 'hidden', maxHeight: '260px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                        {giftMerchantSuggestions.map(m => (
                          <div key={m.name}
                            onClick={() => { setNewCard(prev => ({ ...prev, merchant: m.name })); setGiftMerchantSuggestions([]) }}
                            style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{m.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>When you type this merchant at checkout, the gift card will always be picked first.</p>
                  </div>
                </>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <label className="label" style={{ margin: 0 }}>Rewards unit</label>
                        <button onClick={() => setShowRewardsInfo(v => !v)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '9999px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', padding: 0, fontFamily: 'inherit', flexShrink: 0 }}>
                          ?
                        </button>
                      </div>
                      <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                        <option value="cash back">Cash back (%)</option>
                        <option value="points">Points</option>
                        <option value="miles">Miles</option>
                      </select>
                    </div>
                  </div>

                  {showRewardsInfo && (
                    <div style={{ marginBottom: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>What's the difference?</div>
                      {[
                        { label: 'Cash back', color: 'var(--green)', desc: 'A percentage of your purchase returned as real money. Simple and always worth the same — 1.5% back on a $100 purchase = $1.50. Examples: Chase Freedom Unlimited, Citi Double Cash.' },
                        { label: 'Points', color: 'var(--purple)', desc: 'A currency issued by your bank (Chase Ultimate Rewards, Amex Membership Rewards, etc.). Worth 1¢ each if redeemed for cash, but can be worth 1.5–2¢+ when transferred to airlines or hotels. Examples: Chase Sapphire, Amex Gold.' },
                        { label: 'Miles', color: 'var(--blue)', desc: 'Similar to points but typically tied to a specific airline or travel program. Value depends on how you redeem — flights usually beat cash. Examples: Delta SkyMiles, United MileagePlus, Capital One Venture.' },
                      ].map(({ label, color, desc }) => (
                        <div key={label} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color, minWidth: '60px', paddingTop: '1px' }}>{label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{desc}</div>
                        </div>
                      ))}
                      <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Not sure?</strong> Check your card's rewards page or the back of your statement — it'll say "% cash back" or "X points per dollar."
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <label className="label">Annual fee ($) — optional</label>
                    <input className="input" type="number" placeholder="0" value={newCard.annual_fee} onChange={e => setNewCard({ ...newCard, annual_fee: e.target.value, _feeTouched: true })} />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Rewards rate</label>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.5' }}>
                      Cash back: enter % (e.g. 1.5). Points: enter multiplier (e.g. 3 for 3x).
                    </div>
                    {newCard._suggestion && (
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: newCard._aiSuggestion ? 'var(--gold)' : 'var(--blue)', background: newCard._aiSuggestion ? 'rgba(201,162,39,0.08)' : 'rgba(37,99,235,0.06)', border: `1px solid ${newCard._aiSuggestion ? 'rgba(201,162,39,0.2)' : 'rgba(37,99,235,0.15)'}`, borderRadius: '4px', padding: '8px 12px' }}>
                        {newCard._aiSuggestion ? '✦ AI-populated' : `✦ Rates${newCard._feeAutoFilled ? ' and annual fee' : ''} auto-filled`} — {newCard._suggestion}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>Apply to all categories</span>
                      <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '5px 8px', fontSize: '13px', flex: 1 }}
                        onChange={e => { const val = e.target.value; const filled = {}; CATEGORIES.forEach(cat => { filled[cat] = val }); setNewCard({ ...newCard, multipliers: filled }) }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-faintest)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Or per category:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CATEGORIES.map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '68px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
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
            <div data-reveal style={{ marginTop: '14px', background: 'var(--bg-card)', borderRadius: '4px', padding: '1.25rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Add a perk</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.125rem' }}>
                <CardArt name={cards.find(c => c.id === addingToCardId)?.name || ''} style={{ width: '28px', height: '20px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{cards.find(c => c.id === addingToCardId)?.name}</span>
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
            <div data-reveal style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.3)', borderRadius: '4px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: 'var(--orange)', fontWeight: '500' }}>
              — {expiringPerks.length} credit{expiringPerks.length > 1 ? 's' : ''} expiring within 14 days — use them now.
            </div>
          )}

          {/* Total remaining perks value */}
          {allPerks.length > 0 && (() => {
            const totalRemaining = allPerks.reduce((s, p) => s + Math.max(p.total_amount - (p.used_amount || 0), 0), 0)
            const totalAll = allPerks.reduce((s, p) => s + p.total_amount, 0)
            const usedPct = totalAll > 0 ? Math.round(((totalAll - totalRemaining) / totalAll) * 100) : 0
            return totalRemaining > 0 ? (
              <div data-reveal style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '18px 20px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' }}>Uncaptured value</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--green)', letterSpacing: '-0.03em' }}>${totalRemaining.toFixed(0)}</div>
                  <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', marginTop: '9px' }}>
                    <div style={{ height: '4px', borderRadius: '2px', width: usedPct + '%', background: 'var(--green)', transition: 'width 0.5s' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '-0.02em' }}>{usedPct}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-faintest)', marginTop: '2px' }}>used</div>
                </div>
              </div>
            ) : null
          })()}

          <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
            <button className="btn-primary" onClick={sendEmail} disabled={emailSending}>
              {emailSending ? 'Sending...' : 'Email me my perk summary'}
            </button>
            <button
              onClick={async () => {
                const next = !weeklyDigest
                setWeeklyDigest(next); setDigestSaving(true)
                try { await setWeeklyDigestPref(next) } catch (e) { console.error(e); setWeeklyDigest(!next) }
                setDigestSaving(false)
              }}
              disabled={digestSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0', opacity: digestSaving ? 0.6 : 1 }}
            >
              <span style={{
                position: 'relative', width: '34px', height: '20px', borderRadius: '10px', flexShrink: 0,
                background: weeklyDigest ? 'var(--green)' : 'var(--border)', transition: 'background 0.15s',
              }}>
                <span style={{
                  position: 'absolute', top: '2px', left: weeklyDigest ? '16px' : '2px', width: '16px', height: '16px',
                  borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }} />
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Weekly summary emails {weeklyDigest ? 'on' : 'off'}
              </span>
            </button>
          </div>
          {emailMsg && <div className="success">{emailMsg}</div>}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '14px' }}>No cards yet. Add cards in Wallet to track perks.</div>
          ) : cards.map(card => {
            const cardPerks = card.perks || []
            const update = perkUpdates[card.id]
            // Hide cards with no perks AND no available catalog perks
            if (cardPerks.length === 0 && !update) return null
            const activeCardPerks = cardPerks.filter(p => (p.total_amount - p.used_amount) > 0)
            const usedCardPerks = cardPerks.filter(p => (p.total_amount - p.used_amount) <= 0)
            return (
              <div key={card.id} data-reveal style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CardArt name={card.name} style={{ width: '38px', height: '26px', flexShrink: 0 }} />
                  {card.name}
                </div>

                {/* Perk update nudge */}
                {update && (
                  <div style={{ background: 'rgba(29,184,122,0.08)', border: '1px solid rgba(15,155,101,0.25)', borderRadius: '6px', padding: '10px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: '600', lineHeight: '1.4' }}>
                      {cardPerks.length === 0
                        ? `${update.newPerks.length} perk${update.newPerks.length > 1 ? 's' : ''} available for this card`
                        : <>
                            {update.newPerks.length > 0 && `${update.newPerks.length} new perk${update.newPerks.length > 1 ? 's' : ''} found`}
                            {update.newPerks.length > 0 && update.changedPerks.length > 0 && ' · '}
                            {update.changedPerks.length > 0 && `${update.changedPerks.length} perk${update.changedPerks.length > 1 ? 's' : ''} updated`}
                          </>
                      }
                      <span style={{ color: 'rgba(29,184,122,0.6)', fontWeight: '400' }}> · from latest card data</span>
                    </div>
                    <button
                      onClick={() => setPerkUpdateModal({ card, ...update })}
                      style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(29,184,122,0.15)', border: '1px solid rgba(15,155,101,0.35)', borderRadius: '9999px', cursor: 'pointer', color: 'var(--green)', fontWeight: '700', fontFamily: 'inherit', flexShrink: 0 }}>
                      Review
                    </button>
                  </div>
                )}

                {cardPerks.length > 0 && <div className="card" style={{ padding: '0 1.125rem' }}>
                  {activeCardPerks.length === 0 && usedCardPerks.length > 0 && (
                    <div style={{ padding: '13px 0', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>All perks used this cycle ✓</div>
                  )}
                  {activeCardPerks.map((perk, pi) => {
                    const remaining = perk.total_amount - perk.used_amount
                    const pct = Math.min((perk.used_amount / perk.total_amount) * 100, 100)
                    const daysLeft = perk.resets_at ? Math.ceil((new Date(perk.resets_at) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    const isExpiring = daysLeft !== null && daysLeft <= 14 && daysLeft > 0
                    const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft > 0
                    const accent = isUrgent ? 'var(--red)' : isExpiring ? 'var(--orange)' : 'var(--green)'
                    return (
                      <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 0', borderBottom: pi < activeCardPerks.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{perk.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '9px' }}>
                            {perk.period}
                            {daysLeft !== null ? ` · ${isUrgent ? `${daysLeft}d left` : isExpiring ? `${daysLeft}d left` : `resets in ${daysLeft}d`}` : ''}
                          </div>
                          <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px' }}>
                            <div style={{ height: '4px', borderRadius: '2px', width: pct + '%', background: accent, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: accent, marginBottom: '6px' }}>
                            {`$${remaining.toFixed(0)} left`}
                          </div>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleUpdatePerkUsed(perk.id, perk.total_amount)}
                              style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '600', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                              mark used
                            </button>
                            <button onClick={() => deletePerk(perk.id).then(loadCards)}
                              style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid rgba(217,82,82,0.3)', borderRadius: '9999px', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontWeight: '600', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(217,82,82,0.6)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(217,82,82,0.3)'}>
                              remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {usedCardPerks.length > 0 && activeCardPerks.length > 0 && (
                    <div style={{ padding: '8px 0', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                      {usedCardPerks.length} perk{usedCardPerks.length > 1 ? 's' : ''} used this cycle ✓
                    </div>
                  )}
                </div>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {taps.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '1rem' }}>
              <button onClick={() => exportHistory('csv')}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                Export CSV
              </button>
              <button onClick={() => exportHistory('xlsx')}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                Export XLSX
              </button>
            </div>
          )}
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '7px' }}>This month</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--green)', letterSpacing: '-0.03em' }}>${thisMonthEarned.toFixed(2)}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{thisMonthTaps.length} tap{thisMonthTaps.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '7px' }}>All time</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#c9a227', letterSpacing: '-0.03em' }}>${totalEarned.toFixed(2)}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{taps.length} tap{taps.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {tapsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
          ) : taps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '14px' }}>
              No taps yet. Use Smart Tap to start tracking your rewards.
            </div>
          ) : (
            <div className="card" style={{ padding: '0 1.125rem' }}>
              {taps.map((tap, i) => (
                <div key={tap.id} data-reveal style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 0', borderBottom: i < taps.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <CardArt name={tap.card_name} style={{ width: '46px', height: '31px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tap.merchant || tap.card_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {tap.card_name}{tap.category ? ` · ${tap.category}` : ''}
                      {' · '}<TimeAgo dateStr={tap.tapped_at} />
                    </div>
                    {tap.Note && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{tap.Note}"
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {tap.amount > 0 && (
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>${tap.amount.toFixed(2)}</div>
                    )}
                    {tap.estimated_value > 0 ? (
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--green)' }}>+${tap.estimated_value.toFixed(2)}</div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-faintest)' }}>{tap.rewards_rate || '—'}</div>
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
          {(() => {
            const hasExpiring = perkInsights.length > 0
            const hasMissed = retroactiveMissed.length > 0
            const hasRecsSection = cardRecs.length > 0 || cards.length > 0

            if (!hasExpiring && !hasMissed && !hasRecsSection) {
              return (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>No insights yet</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-faintest)', lineHeight: '1.6' }}>
                    Add cards with perks and use Smart Tap to start seeing personalized optimization tips.
                  </div>
                </div>
              )
            }

            // ── Score sections by urgency/usefulness so the most relevant one leads ──
            const urgentExpiring = perkInsights.filter(i => i.days <= 7).length
            const soonExpiring = perkInsights.filter(i => i.days <= 14).length
            const expiringScore = urgentExpiring > 0 ? 3 : soonExpiring > 0 ? 2 : hasExpiring ? 1 : -1
            const missedScore = hasMissed ? (totalMissed >= 50 ? 3 : totalMissed >= 10 ? 2 : 1) : -1
            const recsScore = cardRecs.length > 0 ? 1 : (hasRecsSection ? 0 : -1)

            const expiringSummary = hasExpiring
              ? `${perkInsights.length} perk${perkInsights.length !== 1 ? 's' : ''} to use${urgentExpiring > 0 ? ` · ${urgentExpiring} expiring within a week` : ''}`
              : null
            const missedSummary = hasMissed
              ? `$${totalMissed.toFixed(0)} left on the table across ${retroactiveMissed.length} purchase${retroactiveMissed.length !== 1 ? 's' : ''}`
              : null
            const recsSummary = cardRecs.length > 0
              ? `${cardRecs.length} card${cardRecs.length !== 1 ? 's' : ''} could earn you more`
              : (cards.length > 0 ? 'Your wallet looks well-optimized' : null)

            // ── Section bodies ──
            const renderExpiring = () => perkInsights.map(insight => {
              const urgentColor = insight.days <= 7 ? 'var(--red)' : insight.days <= 14 ? 'var(--orange)' : 'var(--green)'
              const urgentBg = insight.days <= 7 ? 'rgba(217,82,82,0.08)' : insight.days <= 14 ? 'rgba(196,124,42,0.08)' : 'rgba(29,184,122,0.06)'
              const urgentBorder = insight.days <= 7 ? 'rgba(217,82,82,0.25)' : insight.days <= 14 ? 'rgba(196,124,42,0.25)' : 'rgba(29,184,122,0.2)'
              return (
                <div key={insight.id} style={{ background: urgentBg, border: `1px solid ${urgentBorder}`, borderLeft: `3px solid ${urgentColor}`, borderRadius: '4px', padding: '16px 16px 16px 14px', marginBottom: '9px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <CardArt name={insight.card.name} style={{ width: '46px', height: '31px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insight.card.name}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insight.perk.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '25px', fontWeight: '700', color: urgentColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
                        ${insight.remaining.toFixed(0)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{insight.days}d left</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                    {'You have '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>${insight.remaining.toFixed(0)}</span>
                    {' in '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{insight.perk.name}</span>
                    {' until '}
                    <span style={{ color: urgentColor, fontWeight: '600' }}>{formatResetDate(insight.resetDate)}</span>
                    {insight.suggestion && (
                      <> — based on your history, <span style={{ color: '#c9a227', fontWeight: '600' }}>{insight.suggestion}</span> would use this optimally</>
                    )}
                    {!insight.suggestion && '.'}
                  </div>
                </div>
              )
            })

            const renderMissed = () => (
              <>
                {missedByMonth.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '2px' }}>
                    <button
                      onClick={() => setSelectedMonth(null)}
                      style={{ flexShrink: 0, padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-geist)', background: selectedMonth === null ? 'var(--text-primary)' : 'transparent', borderColor: selectedMonth === null ? 'var(--text-primary)' : 'var(--border)', color: selectedMonth === null ? '#fff' : 'var(--text-muted)' }}
                    >
                      All time
                    </button>
                    {missedByMonth.map(m => {
                      const [yr, mo] = m.key.split('-')
                      const label = new Date(+yr, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
                      const active = selectedMonth === m.key
                      return (
                        <button key={m.key} onClick={() => setSelectedMonth(m.key)}
                          style={{ flexShrink: 0, padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-geist)', background: active ? 'var(--text-primary)' : 'transparent', borderColor: active ? 'var(--text-primary)' : 'var(--border)', color: active ? '#fff' : 'var(--text-muted)' }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}

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
                      <div style={{ background: 'rgba(196,124,42,0.08)', border: '1px solid rgba(180,83,9,0.2)', borderRadius: '12px', padding: '20px 22px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '7px' }}>
                          {selectedMonth ? `In ${monthLabel}, you left` : 'You\'ve left'}
                        </div>
                        <div style={{ fontSize: '40px', fontWeight: '800', color: 'var(--orange)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                          ${filteredTotal.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '7px' }}>
                          on the table across {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                          {!selectedMonth && ' in your history'}
                        </div>
                      </div>

                      {filtered.length > 0 && (
                        <div className="card" style={{ padding: '0 1.125rem' }}>
                          {filtered.slice(0, 15).map((item, i) => (
                            <div key={item.tap.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 0', borderBottom: i < Math.min(filtered.length, 15) - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                              <CardArt name={item.bestCard.name} style={{ width: '46px', height: '31px', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.tap.merchant || item.tap.card_name}
                                  {item.tap.amount > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> · ${item.tap.amount.toFixed(2)}</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  <span style={{ color: 'var(--red)' }}>{item.usedCard.name}</span>
                                  <span style={{ color: 'var(--text-faintest)' }}> → </span>
                                  <span style={{ color: 'var(--green)' }}>{item.bestCard.name}</span>
                                  {item.tap.category && <span style={{ color: 'var(--text-faintest)' }}> · {item.tap.category}</span>}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--orange)' }}>+${item.missedTotal.toFixed(2)}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-faintest)', marginTop: '2px' }}>{(item.missedPerDollar * 100).toFixed(1)}¢/$</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {filtered.length > 15 && (
                        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-faintest)', marginTop: '10px' }}>
                          +{filtered.length - 15} more transactions
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )

            const renderRecs = () => (
              <>
                <div style={{ fontSize: '11px', color: 'var(--text-faintest)', marginBottom: '12px', lineHeight: '1.5' }}>
                  Based on your last {taps.length} purchase{taps.length !== 1 ? 's' : ''} · {taps.length < 10
                    ? <span style={{ color: '#c9a227' }}>track more purchases to sharpen these picks</span>
                    : 'personalized to your spending'}
                </div>

                {taps.length < 5 && cards.length > 0 && (
                  <div style={{ background: 'rgba(201,162,39,0.07)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '6px', padding: '12px 14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#c9a227', marginBottom: '4px' }}>Log purchases to unlock personalized picks</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                      Clavis learns from every tap you log. The more you track, the more accurately it can find cards that match your real spending — not just guesses. Head to the Tap tab and start logging.
                    </div>
                  </div>
                )}

                {cardRecs.length === 0 ? (
                  <div style={{ background: 'rgba(15,155,101,0.06)', border: '1px solid rgba(15,155,101,0.15)', borderLeft: '3px solid var(--green)', borderRadius: '4px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--green)', marginBottom: '4px' }}>Your wallet is well-optimized</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Based on your spending, no card on the market meaningfully outperforms what you already have. Nice setup.
                    </div>
                  </div>
                ) : cardRecs.map(({ rec, netAnnualGain, improvements }) => {
                  const affiliate = getAffiliateLink(rec.name)
                  const tierStyle = TIER_STYLES[rec.tier] || TIER_STYLES['no-fee']
                  return (
                    <div key={rec.name} style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.16)', borderRadius: '6px', padding: '14px', marginBottom: '10px' }}>

                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{rec.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: tierStyle.color, background: tierStyle.bg, padding: '2px 7px', borderRadius: '9999px' }}>
                              {tierStyle.label}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {rec.annualFee === 0 ? 'No annual fee' : `$${rec.annualFee}/yr`}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--blue)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            +${Math.round(netAnnualGain)}/yr
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>est. from your spend</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '10px' }}>{rec.why}</div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                        {improvements.slice(0, 4).map(imp => (
                          <span key={imp.category} style={{ fontSize: '11px', fontWeight: '600', color: 'var(--blue)', background: 'rgba(37,99,235,0.1)', borderRadius: '4px', padding: '3px 7px' }}>
                            {imp.category} +{(imp.gainPerDollar * 100).toFixed(1)}¢/$
                            {imp.annualCatGain >= 10 && <span style={{ opacity: 0.6 }}> (${Math.round(imp.annualCatGain)}/yr)</span>}
                          </span>
                        ))}
                      </div>

                      {affiliate ? (
                        <a
                          href={affiliate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', textAlign: 'center', padding: '11px', background: 'var(--blue)', borderRadius: '6px', fontSize: '13px', fontWeight: '700', color: '#fff', textDecoration: 'none', letterSpacing: '0.02em', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          {affiliate.cta} →
                        </a>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '11px', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          Search "{rec.name}" to apply
                        </div>
                      )}
                    </div>
                  )
                })}

                {cardRecs.length > 0 && (
                  <div style={{ fontSize: '10px', color: 'var(--text-faintest)', lineHeight: '1.55', marginTop: '8px', padding: '0 2px' }}>
                    {AFFILIATE_DISCLOSURE}
                  </div>
                )}
              </>
            )

            const hasSpending = spendingBreakdown.totalSpend > 0
            const spendingScore = hasSpending ? 0.5 : -1
            const spendingSummary = hasSpending
              ? `$${spendingBreakdown.totalSpend.toFixed(0)} tracked across ${spendingBreakdown.categories.length} categor${spendingBreakdown.categories.length !== 1 ? 'ies' : 'y'}`
              : null

            const renderSpending = () => {
              const { categories, byCard, totalSpend, totalEarned } = spendingBreakdown
              const CATEGORY_COLORS = ['var(--blue)', 'var(--gold)', 'var(--green)', 'var(--orange)', 'var(--red)', '#8B5CF6', '#06B6D4', '#EC4899']
              const Bar = ({ label, sub, value, max, color }) => (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{label}</div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>${value.toFixed(0)}</span>
                      {sub && <span style={{ fontSize: '11px', color: 'var(--text-faintest)', marginLeft: '6px' }}>{sub}</span>}
                    </div>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${max > 0 ? Math.max(3, (value / max) * 100) : 0}%`, borderRadius: '3px', background: color, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )

              const maxCatSpend = Math.max(...categories.map(c => c.spend), 1)
              const maxCardSpend = Math.max(...byCard.map(c => c.spend), 1)

              return (
                <>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.16)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total spend tracked</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue)', letterSpacing: '-0.03em', lineHeight: 1 }}>${totalSpend.toFixed(0)}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(15,155,101,0.06)', border: '1px solid rgba(15,155,101,0.15)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Rewards earned</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--green)', letterSpacing: '-0.03em', lineHeight: 1 }}>${totalEarned.toFixed(0)}</div>
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>By category</div>
                      {categories.slice(0, 8).map((c, i) => (
                        <Bar key={c.key} label={c.key} sub={`${c.count} purchase${c.count !== 1 ? 's' : ''}`} value={c.spend} max={maxCatSpend} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </>
                  )}

                  {byCard.length > 0 && (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', margin: '18px 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>By card</div>
                      {byCard.slice(0, 8).map((c, i) => (
                        <Bar key={c.key} label={c.name} sub={`${c.count} tap${c.count !== 1 ? 's' : ''} · $${c.earned.toFixed(0)} earned`} value={c.spend} max={maxCardSpend} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </>
                  )}

                  <div style={{ fontSize: '11px', color: 'var(--text-faintest)', marginTop: '4px', lineHeight: '1.5' }}>
                    Based on {taps.length} logged purchase{taps.length !== 1 ? 's' : ''}. Log more taps to sharpen this picture.
                  </div>
                </>
              )
            }

            const sections = [
              hasExpiring    && { key: 'expiring', score: expiringScore, label: 'Use before they expire', summary: expiringSummary, render: renderExpiring },
              hasMissed      && { key: 'missed',   score: missedScore,   label: 'Left on the table',     summary: missedSummary,   render: renderMissed },
              hasRecsSection && { key: 'recs',     score: recsScore,     label: 'Cards worth adding',    summary: recsSummary,     render: renderRecs },
              hasSpending    && { key: 'spending', score: spendingScore, label: 'Spending breakdown',    summary: spendingSummary, render: renderSpending },
            ].filter(Boolean).sort((a, b) => b.score - a.score)

            const topKey = sections[0]?.key

            return sections.map(s => {
              const isOpen = openInsightSection[s.key] !== undefined ? openInsightSection[s.key] : s.key === topKey
              return (
                <InsightSection
                  key={s.key}
                  label={s.label}
                  summary={s.summary}
                  isOpen={isOpen}
                  onToggle={() => setOpenInsightSection(prev => ({ ...prev, [s.key]: !isOpen }))}
                >
                  {s.render()}
                </InsightSection>
              )
            })
          })()}
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────── */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {[
            { href: '/faq',     label: 'FAQ' },
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms',   label: 'Terms' },
            { href: '/about',   label: 'About' },
          ].map(l => (
            <a key={l.href} href={l.href} style={{ fontSize: '12px', color: 'var(--text-faintest)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faintest)'}>
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user && (() => {
            const refCode = user.id.slice(0, 8)
            const refUrl = `https://clavis-duvm.vercel.app/?ref=${refCode}`
            return (
              <button onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Clavis', text: 'Use Clavis to get more out of your credit cards — it tells you the best card to use everywhere you shop.', url: refUrl })
                } else {
                  navigator.clipboard.writeText(refUrl)
                  alert('Referral link copied!')
                }
              }} style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share Clavis
              </button>
            )
          })()}
          <span style={{ fontSize: '11px', color: 'var(--text-faintest)' }}>
            © {new Date().getFullYear()} Clavis · Your data is never sold or shared
          </span>
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────── */}

      {showDeleteAccount && (
        <div onClick={() => !deletingAccount && setShowDeleteAccount(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '420px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--red)', marginBottom: '8px' }}>Delete your account?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
              This permanently deletes your Clavis account and everything tied to it — cards, perks, purchase history, and email preferences. <strong style={{ color: 'var(--text-primary)' }}>This cannot be undone.</strong>
            </div>
            <label className="label">Type DELETE to confirm</label>
            <input className="input" type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE" disabled={deletingAccount}
              style={{ marginBottom: '12px', textTransform: 'uppercase' }} />
            {deleteAccountError && <div style={{ fontSize: '12.5px', color: 'var(--red)', marginBottom: '12px' }}>{deleteAccountError}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ background: 'var(--red)' }}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || deletingAccount}
                onClick={handleDeleteAccount}>
                {deletingAccount ? 'Deleting…' : 'Permanently delete my account'}
              </button>
              <button className="btn-secondary" disabled={deletingAccount} onClick={() => setShowDeleteAccount(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {emptyGiftCards.length > 0 && emptyGiftCards[emptyGiftCardIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <CardArt name={emptyGiftCards[emptyGiftCardIndex].name} style={{ height: '64px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>{emptyGiftCards[emptyGiftCardIndex].name} is empty</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.6' }}>This gift card has a $0 balance. Would you like to remove it from your wallet?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={async () => {
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={sheetStyle}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Known perks found</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Select the perks you have on this card. You can edit amounts later.</div>
            {suggestedPerks.map((perk, i) => (
              <div key={i} onClick={() => setSelectedPerkIndices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: selectedPerkIndices.includes(i) ? '2px solid var(--green)' : '1.5px solid var(--border)', background: selectedPerkIndices.includes(i) ? 'var(--green)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{perk.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{perk.period}{perk.total_amount > 0 ? ` · $${perk.total_amount}` : ''}</div>
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
        <div onClick={() => setShowRankings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '70vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Card rankings</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1)} · ${selectedAmt}</div>
              </div>
              <button onClick={() => setShowRankings(false)} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-faintest)', marginBottom: '0.5rem' }}>
              Tap a card to use it for this transaction instead — Clavis will remember your choice until you switch back to Auto.
            </div>
            {(() => {
              const ranked = getRankedCards()
              return ranked.map(({ card, reasons, dollarVal, score }, i) => {
                const mult = getMultiplier(card)
                const tiedWithPrev = i > 0 && Math.abs(ranked[i - 1].score - score) <= 0.001
                const tiedWithNext = i < ranked.length - 1 && Math.abs(ranked[i + 1].score - score) <= 0.001
                const isTop = i === 0 || tiedWithPrev
                const accentColor = isTop ? 'var(--gold)' : 'var(--border)'
                const isSelected = selectedCardId === card.id
                return (
                  <button key={card.id}
                    onClick={() => { setSelectedCardId(isSelected ? null : card.id); setShowRankings(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 8px', margin: '0 -8px',
                      borderBottom: '1px solid var(--border-subtle)', width: 'calc(100% + 16px)',
                      background: isSelected ? 'rgba(37,99,235,0.06)' : 'none', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: accentColor, width: '22px', flexShrink: 0, textAlign: 'center' }}>
                      {tiedWithPrev ? '=' : `#${i + 1}`}
                    </div>
                    <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {card.name}
                        {isSelected && <span style={{ fontSize: '9.5px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)', background: 'rgba(37,99,235,0.1)', borderRadius: '9999px', padding: '2px 7px', flexShrink: 0 }}>Selected</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {reasons.length > 0 ? reasons.join(' · ') : 'No rewards for this category'}
                        {tiedWithNext && !tiedWithPrev && (card.annual_fee || 0) > 0 && (
                          <span style={{ color: 'rgba(201,162,39,0.55)' }}> · higher fee</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: isTop ? '#c9a227' : 'var(--text-muted)' }}>
                        {mult > 0 ? formatRate(card, mult) : '—'}
                      </div>
                      {dollarVal > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{formatValuePerDollar(card, mult)}</div>
                      )}
                    </div>
                  </button>
                )
              })
            })()}

            {/* How we rank — collapsible formula */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <button
                onClick={() => setShowFormula(f => !f)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>How we rank cards</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: showFormula ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </button>

              {showFormula && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Every card gets a <strong style={{ color: 'var(--text-secondary)' }}>score</strong> for the current category and amount. The highest score wins.
                  </div>

                  {[
                    {
                      label: 'Rewards value',
                      formula: 'multiplier × cents-per-point × 100',
                      detail: 'The base score. A 3x card at 1.8¢/pt scores 5.4. A 2% cash-back card scores 2.0. This is the dominant factor — everything else is a small nudge.',
                      color: '#c9a227',
                    },
                    {
                      label: 'Unused perks',
                      formula: '+0.3/perk + (unused $ ÷ 50)',
                      detail: 'Cards with perk value still on the table get a steady bump — sized by how much is actually unused, so a $200 credit counts for more than a $10 one, not just "a perk is a perk."',
                      color: 'var(--text-secondary)',
                    },
                    {
                      label: 'Expiring perks',
                      formula: '+1/perk + (expiring $ ÷ 15) — within 14 days',
                      detail: 'A perk about to reset gets real urgency weight, scaled to its dollar value — large enough that a credit worth real money expiring this week can outrank a card with a slightly better rewards rate.',
                      color: 'var(--text-secondary)',
                    },
                    {
                      label: 'Gift card balance',
                      formula: '+5 if gift card has remaining balance',
                      detail: 'A gift card with money on it should be used before any rewards card — you\'ve already paid for it.',
                      color: 'var(--text-secondary)',
                    },
                    {
                      label: 'Merchant-matched perk',
                      formula: 'Score → 500 + unused $ (overrides rewards math)',
                      detail: 'If what you typed matches an unused perk\'s name (e.g. typing "Peloton" when a card has a Peloton credit), that card jumps to the top — these are use-it-here-or-lose-it credits where the rewards rate stops mattering.',
                      color: 'var(--text-secondary)',
                    },
                    {
                      label: 'Linked merchant override',
                      formula: 'Score → 9999 (always #1)',
                      detail: 'If you typed a merchant and a gift card is linked to that store, it locks to the top. No credit card rewards beat a gift card that only works here.',
                      color: 'var(--text-secondary)',
                    },
                    {
                      label: 'Tie-breaker',
                      formula: 'Higher annual fee ranks lower',
                      detail: 'When two cards score identically, the one charging you less per year wins. Why pay more for the same result?',
                      color: 'var(--text-secondary)',
                    },
                  ].map(row => (
                    <div key={row.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: row.color }}>{row.label}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', fontFamily: 'monospace', color: 'var(--text-muted)', flexShrink: 0 }}>{row.formula}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.55' }}>{row.detail}</p>
                    </div>
                  ))}

                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: '1.5' }}>
                    Point valuations (cents per point) come from our internal table based on typical redemption rates — e.g. Chase UR at 1.8¢, Amex MR at 1.8¢, Capital One at 1.85¢.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── PERK UPDATE REVIEW MODAL ───────────────────── */}
      {perkUpdateModal && (
        <div onClick={() => setPerkUpdateModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ ...sheetStyle, maxHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Perk changes found</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{perkUpdateModal.card.name}</div>
              </div>
              <button onClick={() => setPerkUpdateModal(null)} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Clavis found updated perk data for this card. Review and apply what looks right — your usage tracking won't be affected.
            </div>

            {perkUpdateModal.newPerks.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '8px' }}>New perks</div>
                {perkUpdateModal.newPerks.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(29,184,122,0.06)', border: '1px solid rgba(15,155,101,0.15)', borderRadius: '6px', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.period}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--green)' }}>${p.total_amount}</div>
                  </div>
                ))}
              </div>
            )}

            {perkUpdateModal.changedPerks.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#c9a227', marginBottom: '8px' }}>Updated amounts</div>
                {perkUpdateModal.changedPerks.map((cp, i) => {
                  const userPerk = perkUpdateModal.card.perks.find(up => up.name.toLowerCase().includes(cp.name.toLowerCase()) || cp.name.toLowerCase().includes(up.name.toLowerCase()))
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(201,162,39,0.06)', border: '1px solid rgba(201,162,39,0.15)', borderRadius: '6px', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{cp.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{cp.period}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#c9a227' }}>${cp.total_amount}</div>
                        {userPerk && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>${userPerk.total_amount}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => dismissPerkUpdate(perkUpdateModal.card.id)}
                style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                Dismiss
              </button>
              <button
                onClick={() => applyPerkUpdate(perkUpdateModal.card, perkUpdateModal.newPerks, perkUpdateModal.changedPerks)}
                disabled={applyingPerkUpdate}
                style={{ padding: '12px', background: 'var(--green)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#0a0a0f', fontFamily: 'inherit', opacity: applyingPerkUpdate ? 0.6 : 1 }}>
                {applyingPerkUpdate ? 'Applying…' : 'Apply updates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <Onboarding onComplete={() => {
          setShowOnboarding(false)
          loadCards()
        }} />
      )}

      {tourStep !== null && (
        <TourOverlay
          slides={TOUR_SLIDES}
          step={tourStep}
          targetRefs={tourTabRefs}
          onNext={() => setTourStep(s => s + 1)}
          onBack={() => setTourStep(s => s - 1)}
          onFinish={() => setTourStep(null)}
          onClose={() => setTourStep(null)}
        />
      )}

      {editingCard && (
        <div onClick={() => setEditingCard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={sheetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Edit {editingCard.name}</div>
              <button onClick={() => setEditingCard(null)} style={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <CardArt name={editingCard.name} style={{ height: '56px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.5' }}>
              Cash back: enter % (e.g. 1.5). Points/miles: enter multiplier (e.g. 3 for 3x).
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>Apply to all categories</span>
              <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '5px 8px', fontSize: '13px', flex: 1 }}
                onChange={e => { const val = e.target.value; const filled = {}; CATEGORIES.forEach(cat => { filled[cat] = val }); setEditMultipliers(filled) }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faintest)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Or per category:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '68px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 8px', fontSize: '13px' }}
                    value={editMultipliers[cat] || ''} onChange={e => setEditMultipliers({ ...editMultipliers, [cat]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label">Annual fee ($)</label>
              <input className="input" type="number" placeholder="0" value={editAnnualFee} onChange={e => setEditAnnualFee(e.target.value)} />
              {(() => {
                const known = getSuggestedMultipliers(editingCard.name)
                if (known?.annualFee === undefined) return null
                if (String(known.annualFee) === editAnnualFee) return null
                return (
                  <button onClick={() => setEditAnnualFee(String(known.annualFee))}
                    style={{ marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: 'var(--blue)', padding: 0 }}>
                    ↻ Use latest known fee — ${known.annualFee}
                  </button>
                )
              })()}
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginBottom: '1.25rem' }}>
              {!showCorrectionForm ? (
                <button onClick={() => setShowCorrectionForm(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: 'var(--text-muted)', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  Something look outdated? Suggest a correction
                </button>
              ) : correctionSubmitted ? (
                <div style={{ fontSize: '12.5px', color: 'var(--green)', fontWeight: '600' }}>
                  ✓ Thanks — we'll review your suggestion and update our card data.
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>Suggest a correction for {editingCard.name}</div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select className="input" value={correctionField} onChange={e => setCorrectionField(e.target.value)} style={{ flex: 1, fontSize: '13px', padding: '7px 8px' }}>
                      <option>Annual fee</option>
                      <option>Reward rate / multiplier</option>
                      <option>Perk details</option>
                      <option>Card name / details</option>
                      <option>Other</option>
                    </select>
                    <input className="input" placeholder="Suggested value" value={correctionValue} onChange={e => setCorrectionValue(e.target.value)} style={{ flex: 1, fontSize: '13px', padding: '7px 8px' }} />
                  </div>
                  <textarea className="input" placeholder="Add a note or source (optional)" value={correctionNote} onChange={e => setCorrectionNote(e.target.value)}
                    style={{ width: '100%', minHeight: '54px', fontSize: '13px', padding: '7px 8px', marginBottom: '8px', fontFamily: 'inherit', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" disabled={!correctionValue.trim() || correctionSubmitting} onClick={handleSubmitCorrection}
                      style={{ fontSize: '12px', padding: '7px 14px', opacity: (!correctionValue.trim() || correctionSubmitting) ? 0.5 : 1 }}>
                      {correctionSubmitting ? 'Submitting…' : 'Submit suggestion'}
                    </button>
                    <button onClick={() => setShowCorrectionForm(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: 'var(--text-faintest)', padding: '7px 4px' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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

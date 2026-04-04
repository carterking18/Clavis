'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, addMultipliers, updateCardMultipliers, addPerk, updatePerk, deletePerk } from '../../lib/cards'
import { getCardDesign } from '../../lib/cardImages'
import { getSuggestedMultipliers } from '../../lib/cardRewards'
import { getSuggestedPerks, calculateResetsAt } from '../../lib/cardPerks'
import { searchMerchants, getMerchantCategory } from '../../lib/merchants'

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
        <div style={{ alignSelf: 'flex-end', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.05em', marginTop: 'auto' }}>
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

  function simulateTap() {
    const card = getActiveCard()
    if (!card) return
    const mult = getMultiplier(card)
    setTapConfirm(`Tapped as ${card.name} · ${mult > 0 ? mult + 'x pts on $' + selectedAmt : 'card charged'} · Transaction complete`)
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#888', fontSize: '14px' }}>Loading your wallet...</p>
    </div>
  )

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.02em' }}>
          Cla<span style={{ color: '#c8a84b' }}>vis</span>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
          style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['tap', 'wallet', 'perks'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '0.5px solid', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', borderColor: tab === t ? '#1a1a1a' : '#d0d0cc', background: tab === t ? '#1a1a1a' : 'transparent', color: tab === t ? '#fff' : '#666' }}>
            {t === 'tap' ? 'Smart tap' : t === 'wallet' ? 'My wallet' : 'Perks tracker'}
          </button>
        ))}
      </div>

      {tab === 'tap' && (
        <div>
          <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.25rem', minHeight: '180px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '11px', color: '#555', letterSpacing: '0.08em' }}>CLAVIS</div>
            <div style={{ width: '34px', height: '26px', borderRadius: '4px', background: '#c8a84b', marginBottom: '1.25rem' }}></div>
            <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em', marginBottom: '3px' }}>ACTIVE CARD</div>
            <div style={{ fontSize: '19px', fontWeight: '600', color: '#f0f0f0', marginBottom: '3px' }}>
              {activeCard ? activeCard.name : 'Add a card to get started'}
            </div>
            <div style={{ fontSize: '12px', color: '#777', marginBottom: '1.25rem' }}>
              {activeCard ? `${selectedCat} · ${selectedCardId ? 'Manually selected' : 'Auto-selected'}` : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>EARNING THIS PURCHASE</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#c8a84b' }}>
                  {activeCard ? (getMultiplier(activeCard) > 0 ? formatRate(activeCard, getMultiplier(activeCard)) + ' / $1' : (isCashBack(activeCard) ? '1% / $1' : '1x pts / $1')) : '—'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#555', letterSpacing: '0.14em' }}>
                {activeCard?.last_four ? `**** ${activeCard.last_four}` : ''}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={simulateTap} disabled={!activeCard} style={{ marginBottom: '0.5rem' }}>
            Hold to tap Clavis
          </button>
          {cards.length > 1 && (
            <button onClick={() => setShowRankings(true)}
              style={{ width: '100%', background: 'none', border: 'none', fontSize: '12px', color: '#aaa', cursor: 'pointer', marginBottom: '1.25rem', padding: '4px' }}>
              See card rankings
            </button>
          )}

          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '0.875rem', border: detectedMerchant ? '1px solid #1D9E75' : '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', letterSpacing: '0.08em' }}>WHERE ARE YOU SHOPPING?</div>
              <input
                type="text"
                placeholder="e.g. Starbucks, Target, Shell..."
                value={merchantQuery}
                onChange={e => {
                  const q = e.target.value
                  setMerchantQuery(q)
                  setMerchantSuggestions(searchMerchants(q))
                  if (!q) { setDetectedMerchant(null) }
                }}
                style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: '600', color: '#1a1a1a', fontFamily: 'inherit', outline: 'none' }}
              />
              {detectedMerchant && (
                <div style={{ fontSize: '11px', color: '#1D9E75', marginTop: '4px' }}>
                  → {detectedMerchant.category.charAt(0).toUpperCase() + detectedMerchant.category.slice(1)} category auto-selected
                </div>
              )}
            </div>
            {merchantSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: '10px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {merchantSuggestions.map(m => (
                  <div key={m.name} onClick={() => {
                    setMerchantQuery(m.name)
                    setDetectedMerchant(m)
                    setSelectedCat(m.category)
                    setSelectedCardId(null)
                    setMerchantSuggestions([])
                  }} style={{ padding: '10px 14px', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #f5f5f3' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f3'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <span style={{ fontWeight: '500' }}>{m.name}</span>
                    <span style={{ fontSize: '11px', color: '#999', background: '#f0f0ec', padding: '2px 7px', borderRadius: '5px' }}>{m.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '0.875rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', letterSpacing: '0.08em' }}>CATEGORY</div>
              <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedCardId(null); setDetectedMerchant(null) }}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '0.875rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', letterSpacing: '0.08em' }}>AMOUNT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>$</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={selectedAmt || ''}
                  onChange={e => setSelectedAmt(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: '14px' }}>
              No cards yet. Go to My Wallet to add your first card.
            </div>
          ) : (
            getRankedCards().map(({ card, score }, i) => {
              const mult = getMultiplier(card)
              const isGift = card.type === 'gift'
              const hasGiftBalance = isGift && (card.balance || 0) > 0
              const isBest = i === 0 && (mult > 0 || hasGiftBalance)
              const isSelected = selectedCardId === card.id
              return (
                <div key={card.id} onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  style={{ borderRadius: '12px', border: isSelected ? '2px solid #378ADD' : isBest ? '2px solid #1D9E75' : '0.5px solid #e8e8e4', background: '#fff', padding: '1rem 1.125rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isBest && <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: '#e1f5ee', color: '#0F6E56', display: 'inline-block', marginBottom: '4px', fontWeight: '500' }}>Best choice</div>}
                    {isSelected && !isBest && <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: '#e6f1fb', color: '#185FA5', display: 'inline-block', marginBottom: '4px', fontWeight: '500' }}>Your pick</div>}
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{card.type}{isGift ? '' : ` · ${card.balance_unit}`}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isGift ? (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: hasGiftBalance ? '#1D9E75' : '#aaa' }}>${(card.balance || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{hasGiftBalance ? 'balance remaining' : 'no balance'}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75' }}>{mult > 0 ? formatRate(card, mult) : '—'}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{mult > 0 ? `≈ $${(selectedAmt * mult * 0.01).toFixed(2)} back` : 'n/a'}</div>
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

      {tab === 'wallet' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px', marginBottom: '1.25rem' }}>
            {[
              { label: 'Cards linked', value: cards.length },
              { label: 'Gift card value', value: '$' + cards.filter(c => c.type === 'gift').reduce((s, c) => s + (c.balance || 0), 0).toFixed(0) },
              { label: 'Perks available', value: allPerks.filter(p => p.used_amount < p.total_amount).length }
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: '10px', padding: '0.875rem', border: '0.5px solid #e8e8e4', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '2px' }}>{m.value}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: '14px', marginBottom: '1rem' }}>
              No cards yet. Add your first one below.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px', marginBottom: '1.25rem' }}>
              {cards.map(card => (
                <div key={card.id} className="card">
                  <CardArt name={card.name} style={{ height: '56px', marginBottom: '8px' }} />
                  <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '3px', letterSpacing: '0.08em' }}>{card.type.toUpperCase()}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                    {card.balance} {card.balance_unit}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setAddingToCardId(card.id); setShowAddPerk(true) }}
                      style={{ flex: 1, padding: '5px', fontSize: '11px', border: '0.5px solid #d0d0cc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#666' }}>
                      + perk
                    </button>
                    <button onClick={() => openEditCard(card)}
                      style={{ padding: '5px 8px', fontSize: '11px', border: '0.5px solid #d0d0cc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#666' }}>
                      edit
                    </button>
                    <button onClick={() => deleteCard(card.id).then(loadCards)}
                      style={{ padding: '5px 8px', fontSize: '11px', border: '0.5px solid #F09595', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#A32D2D' }}>
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn-primary" onClick={() => setShowAddCard(true)}>
            + Add card
          </button>

          {showAddCard && (
            <div style={{ marginTop: '1.25rem', background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '1rem' }}>Add a card</div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">CARD NAME</label>
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
                <label className="label">TYPE</label>
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
                  <label className="label">REMAINING BALANCE ($)</label>
                  <input className="input" type="number" placeholder="0.00" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value, balance_unit: 'dollars' })} />
                </div>
              )}

              {newCard.type === 'loyalty' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label className="label">POINTS / MILES BALANCE</label>
                      <input className="input" type="number" placeholder="0" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">UNIT</label>
                      <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                        <option value="points">Points</option>
                        <option value="miles">Miles</option>
                        <option value="stars">Stars</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {(newCard.type === 'credit' || newCard.type === 'store') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label className="label">LAST 4 DIGITS</label>
                      <input className="input" placeholder="4821" maxLength={4} value={newCard.last_four} onChange={e => setNewCard({ ...newCard, last_four: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">REWARDS UNIT</label>
                      <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                        <option value="cash back">Cash back (%)</option>
                        <option value="points">Points</option>
                        <option value="miles">Miles</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">REWARDS RATE</label>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                      For cash back cards, enter the percentage (e.g. 1.5 for 1.5%). For points cards, enter the multiplier (e.g. 3 for 3x).
                    </div>
                    {newCard._suggestion && (
                      <div style={{ marginBottom: '8px', fontSize: '11px', color: '#185FA5', background: '#e6f1fb', border: '0.5px solid #a8c8f0', borderRadius: '6px', padding: '6px 10px' }}>
                        ✦ Rates auto-filled — {newCard._suggestion}. Edit below if your card is different.
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: '#f5f5f3', borderRadius: '8px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '12px', color: '#666', flexShrink: 0 }}>Apply to all categories</span>
                      <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '6px 10px', fontSize: '13px', flex: 1 }}
                        onChange={e => {
                          const val = e.target.value
                          const filled = {}
                          CATEGORIES.forEach(cat => { filled[cat] = val })
                          setNewCard({ ...newCard, multipliers: filled })
                        }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>Or set per category:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CATEGORIES.map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#888', width: '70px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                          <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 10px', fontSize: '13px' }}
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
            <div style={{ marginTop: '1.25rem', background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Add a perk</div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CardArt name={cards.find(c => c.id === addingToCardId)?.name || ''} style={{ width: '28px', height: '20px', flexShrink: 0 }} />
                {cards.find(c => c.id === addingToCardId)?.name}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">PERK NAME</label>
                <input className="input" placeholder="e.g. Saks Fifth Avenue credit" value={newPerk.name} onChange={e => setNewPerk({ ...newPerk, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">TOTAL AMOUNT ($)</label>
                  <input className="input" type="number" placeholder="50" value={newPerk.total_amount} onChange={e => setNewPerk({ ...newPerk, total_amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">ALREADY USED ($)</label>
                  <input className="input" type="number" placeholder="0" value={newPerk.used_amount} onChange={e => setNewPerk({ ...newPerk, used_amount: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">RESET PERIOD</label>
                  <select className="input" value={newPerk.period} onChange={e => setNewPerk({ ...newPerk, period: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="label">EXPIRY / RESET DATE</label>
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

      {tab === 'perks' && (
        <div>
          {expiringPerks.length > 0 && (
            <div style={{ background: '#faeeda', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1rem', fontSize: '13px', color: '#633806', border: '0.5px solid #FAC775', fontWeight: '500' }}>
              {expiringPerks.length} credit{expiringPerks.length > 1 ? 's' : ''} expiring within 14 days — use them now.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <button className="btn-primary" onClick={sendEmail} disabled={emailSending} style={{ fontSize: '13px', padding: '10px' }}>
              {emailSending ? 'Sending...' : 'Email me my perk summary'}
            </button>
          </div>
          {emailMsg && <div className="success" style={{ marginBottom: '1rem' }}>{emailMsg}</div>}

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: '14px' }}>
              No cards yet. Add cards in My Wallet to track perks.
            </div>
          ) : cards.map(card => {
            const cardPerks = card.perks || []
            if (cardPerks.length === 0) return null
            return (
              <div key={card.id} style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CardArt name={card.name} style={{ width: '32px', height: '22px', flexShrink: 0 }} />
                  {card.name}
                </div>
                <div className="card" style={{ padding: '0.5rem 1.125rem' }}>
                  {cardPerks.map(perk => {
                    const remaining = perk.total_amount - perk.used_amount
                    const pct = Math.min((perk.used_amount / perk.total_amount) * 100, 100)
                    const daysLeft = perk.resets_at ? Math.ceil((new Date(perk.resets_at) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    const isExpiring = daysLeft !== null && daysLeft <= 14 && daysLeft > 0
                    const isUsed = remaining <= 0
                    return (
                      <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #f0f0ec' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{perk.name}</div>
                          <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>
                            {perk.period} {daysLeft !== null ? `· ${isExpiring ? `⚠ ${daysLeft}d left` : `resets in ${daysLeft}d`}` : ''}
                          </div>
                          <div style={{ height: '3px', background: '#f0f0ec', borderRadius: '2px', width: '100%' }}>
                            <div style={{ height: '3px', borderRadius: '2px', width: pct + '%', background: isUsed ? '#A32D2D' : isExpiring ? '#854F0B' : '#1D9E75' }}></div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: isUsed ? '#A32D2D' : isExpiring ? '#854F0B' : '#1D9E75' }}>
                            {isUsed ? 'Used' : `$${remaining.toFixed(0)} left`}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                            {!isUsed && (
                              <button onClick={() => handleUpdatePerkUsed(perk.id, perk.total_amount)}
                                style={{ fontSize: '11px', padding: '3px 7px', border: '0.5px solid #d0d0cc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#666' }}>
                                mark used
                              </button>
                            )}
                            <button onClick={() => deletePerk(perk.id).then(loadCards)}
                              style={{ fontSize: '11px', padding: '3px 7px', border: '0.5px solid #F09595', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#A32D2D' }}>
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

      {suggestedPerks && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Known perks found</div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '1.25rem' }}>Select the perks you have on this card. You can edit amounts later.</div>
            {suggestedPerks.map((perk, i) => (
              <div key={i} onClick={() => setSelectedPerkIndices(prev =>
                prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
              )} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #f0f0ec', cursor: 'pointer' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: selectedPerkIndices.includes(i) ? '2px solid #1D9E75' : '1.5px solid #d0d0cc', background: selectedPerkIndices.includes(i) ? '#1D9E75' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedPerkIndices.includes(i) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{perk.name}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{perk.period} {perk.total_amount > 0 ? `· $${perk.total_amount}` : ''}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
              <button className="btn-primary" onClick={handleAddSuggestedPerks}>
                Add {selectedPerkIndices.length} perk{selectedPerkIndices.length !== 1 ? 's' : ''}
              </button>
              <button className="btn-secondary" onClick={() => { setSuggestedPerks(null); setPendingCardId(null); setSelectedPerkIndices([]) }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {showRankings && (
        <div onClick={() => setShowRankings(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>Card rankings</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1)} · ${selectedAmt}</div>
              </div>
              <button onClick={() => setShowRankings(false)}
                style={{ background: '#f0f0ec', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', color: '#666' }}>✕</button>
            </div>
            {getRankedCards().map(({ card, score, reasons }, i) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #f0f0ec' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#1D9E75' : '#ccc', width: '20px', flexShrink: 0 }}>#{i + 1}</div>
                <CardArt name={card.name} style={{ width: '44px', height: '30px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                    {reasons.length > 0 ? reasons.join(' · ') : 'No rewards for this category'}
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', flexShrink: 0 }}>
                  {score > 0 ? score.toFixed(1) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingCard && (
        <div onClick={() => setEditingCard(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>Edit {editingCard.name}</div>
              <button onClick={() => setEditingCard(null)}
                style={{ background: '#f0f0ec', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', color: '#666' }}>✕</button>
            </div>
            <CardArt name={editingCard.name} style={{ height: '56px', marginBottom: '1rem' }} />
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
              For cash back cards, enter the percentage (e.g. 1.5 for 1.5%). For points cards, enter the multiplier (e.g. 3 for 3x).
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: '#f5f5f3', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '12px', color: '#666', flexShrink: 0 }}>Apply to all categories</span>
              <input className="input" type="number" placeholder="e.g. 1.5" min="0" max="20" style={{ padding: '6px 10px', fontSize: '13px', flex: 1 }}
                onChange={e => {
                  const val = e.target.value
                  const filled = {}
                  CATEGORIES.forEach(cat => { filled[cat] = val })
                  setEditMultipliers(filled)
                }} />
            </div>
            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>Or set per category:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888', width: '70px', flexShrink: 0 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <input className="input" type="number" placeholder="0" min="0" max="20" style={{ padding: '6px 10px', fontSize: '13px' }}
                    value={editMultipliers[cat] || ''}
                    onChange={e => setEditMultipliers({ ...editMultipliers, [cat]: e.target.value })} />
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
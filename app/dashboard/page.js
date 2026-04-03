'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getUserCards, addCard, deleteCard, addMultipliers, addPerk, updatePerk, deletePerk } from '../../lib/cards'

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']
const CARD_COLORS = ['#534AB7', '#185FA5', '#1D9E75', '#D85A30', '#444441', '#BA7517', '#993556', '#1a1a1a']

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [tab, setTab] = useState('tap')
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('dining')
  const [selectedAmt, setSelectedAmt] = useState(50)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [tapConfirm, setTapConfirm] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddPerk, setShowAddPerk] = useState(false)
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

  function getBestCard() {
    if (!cards.length) return null
    return [...cards].sort((a, b) => {
      const am = a.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
      const bm = b.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
      return bm - am
    })[0]
  }

  function getActiveCard() {
    if (selectedCardId) return cards.find(c => c.id === selectedCardId) || getBestCard()
    return getBestCard()
  }

  function getMultiplier(card) {
    if (!card) return 0
    return card.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
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
      setNewCard({ name: '', type: 'credit', network: '', last_four: '', color: '#1a1a1a', balance: '', balance_unit: 'points', multipliers: { dining: '', travel: '', hotel: '', grocery: '', gas: '', streaming: '', retail: '', other: '' } })
    } catch (e) { console.error(e) }
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
                  {activeCard ? (getMultiplier(activeCard) > 0 ? getMultiplier(activeCard) + 'x pts / $1' : '1x pts / $1') : '—'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#555', letterSpacing: '0.14em' }}>
                {activeCard?.last_four ? `**** ${activeCard.last_four}` : ''}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={simulateTap} disabled={!activeCard} style={{ marginBottom: '1.5rem' }}>
            Hold to tap Clavis
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '0.875rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', letterSpacing: '0.08em' }}>CATEGORY</div>
              <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedCardId(null) }}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '0.875rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', letterSpacing: '0.08em' }}>AMOUNT</div>
              <select value={selectedAmt} onChange={e => setSelectedAmt(parseInt(e.target.value))}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                {[25, 50, 100, 250, 500].map(a => <option key={a} value={a}>${a}</option>)}
              </select>
            </div>
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: '14px' }}>
              No cards yet. Go to My Wallet to add your first card.
            </div>
          ) : (
            [...cards].sort((a, b) => {
              const am = a.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
              const bm = b.multipliers?.find(m => m.category === selectedCat)?.multiplier || 0
              return bm - am
            }).map((card, i) => {
              const mult = getMultiplier(card)
              const isBest = i === 0 && mult > 0
              const isSelected = selectedCardId === card.id
              return (
                <div key={card.id} onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  style={{ borderRadius: '12px', border: isSelected ? '2px solid #378ADD' : isBest ? '2px solid #1D9E75' : '0.5px solid #e8e8e4', background: '#fff', padding: '1rem 1.125rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: card.color, flexShrink: 0 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isBest && <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: '#e1f5ee', color: '#0F6E56', display: 'inline-block', marginBottom: '4px', fontWeight: '500' }}>Best choice</div>}
                    {isSelected && !isBest && <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: '#e6f1fb', color: '#185FA5', display: 'inline-block', marginBottom: '4px', fontWeight: '500' }}>Your pick</div>}
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{card.type} · {card.balance_unit}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75' }}>{mult > 0 ? mult + 'x' : '—'}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{mult > 0 ? `≈ $${(selectedAmt * mult * 0.01).toFixed(2)} value` : 'n/a'}</div>
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
                  <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '5px', letterSpacing: '0.08em' }}>{card.type.toUpperCase()}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.color, display: 'inline-block', flexShrink: 0 }}></span>
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
                <input className="input" placeholder="e.g. Amex Platinum" value={newCard.name} onChange={e => setNewCard({ ...newCard, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">TYPE</label>
                  <select className="input" value={newCard.type} onChange={e => setNewCard({ ...newCard, type: e.target.value })}>
                    <option value="credit">Credit card</option>
                    <option value="loyalty">Loyalty card</option>
                    <option value="gift">Gift card</option>
                    <option value="store">Store credit card</option>
                  </select>
                </div>
                <div>
                  <label className="label">LAST 4 DIGITS</label>
                  <input className="input" placeholder="4821" maxLength={4} value={newCard.last_four} onChange={e => setNewCard({ ...newCard, last_four: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="label">CURRENT BALANCE</label>
                  <input className="input" type="number" placeholder="0" value={newCard.balance} onChange={e => setNewCard({ ...newCard, balance: e.target.value })} />
                </div>
                <div>
                  <label className="label">UNIT</label>
                  <select className="input" value={newCard.balance_unit} onChange={e => setNewCard({ ...newCard, balance_unit: e.target.value })}>
                    <option value="points">Points</option>
                    <option value="miles">Miles</option>
                    <option value="stars">Stars</option>
                    <option value="dollars">Dollars ($)</option>
                    <option value="cash back">Cash back ($)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="label">CARD COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CARD_COLORS.map(c => (
                    <div key={c} onClick={() => setNewCard({ ...newCard, color: c })}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: newCard.color === c ? '3px solid #c8a84b' : '2px solid transparent' }}>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label">REWARDS MULTIPLIERS (x pts per $1)</label>
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={handleAddCard}>Save card</button>
                <button className="btn-secondary" onClick={() => setShowAddCard(false)}>Cancel</button>
              </div>
            </div>
          )}

          {showAddPerk && (
            <div style={{ marginTop: '1.25rem', background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '0.5px solid #e8e8e4' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '1rem' }}>Add a perk</div>

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
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.color, display: 'inline-block' }}></span>
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
    </div>
  )
}
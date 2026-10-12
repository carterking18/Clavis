// Is each card paying for itself this year?
// For every card with an annual fee:
//   rewards    rewards logged on that card this calendar year
//   credits    credits used this year: closed periods (perk_periods history)
//              plus what's used in each credit's current period
//   available  credit still usable before Dec 31: the rest of the current
//              period plus every period that starts before year end
//   lost       credit that reset unused this year (from history)

import { calculateResetsAt } from './cardPerks.js'

const day = s => String(s).slice(0, 10)

function addDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d + 1)
}

// Credit still usable this year for one perk
function availableThisYear(perk, card, yearEnd) {
  let total = Math.max(0, (perk.total_amount || 0) - (perk.used_amount || 0))
  if (!perk.resets_at) return total
  let end = day(perk.resets_at)
  // Each later period that starts on or before Dec 31 adds a full credit
  for (let guard = 0; guard < 24; guard++) {
    const nextStart = addDay(end)
    if (nextStart > yearEnd) break
    total += perk.total_amount || 0
    end = calculateResetsAt(perk.period, nextStart, { basis: perk.resets_on, openedOn: card.opened_on })
  }
  return total
}

export function cardValueThisYear(cards, taps, periods, now = new Date()) {
  const year = now.getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = new Date(year, 11, 31)

  const rows = cards
    .filter(c => (c.annual_fee || 0) > 0)
    .map(card => {
      const id = String(card.id)
      const rewards = taps
        .filter(t => String(t.card_id) === id && t.tapped_at && day(t.tapped_at) >= yearStart)
        .reduce((s, t) => s + (t.estimated_value || 0), 0)
      const history = periods.filter(p => p.card_id === id && day(p.period_end) >= yearStart)
      const perks = card.perks || []
      const credits = history.reduce((s, p) => s + Number(p.used_amount || 0), 0)
        + perks.reduce((s, p) => s + (p.used_amount || 0), 0)
      const lost = history.reduce((s, p) => s + Math.max(0, Number(p.total_amount || 0) - Number(p.used_amount || 0)), 0)
      const available = perks.reduce((s, p) => s + availableThisYear(p, card, yearEnd), 0)
      // The single biggest credit to use next
      const next = perks
        .map(p => ({ perk: p, left: Math.max(0, (p.total_amount || 0) - (p.used_amount || 0)) }))
        .filter(x => x.left > 0)
        .sort((a, b) => b.left - a.left)[0] || null
      return { card, fee: card.annual_fee, rewards, credits, captured: rewards + credits, available, lost, next }
    })
    .sort((a, b) => b.fee - a.fee)

  const totals = rows.reduce((t, r) => ({
    fees: t.fees + r.fee, captured: t.captured + r.captured, available: t.available + r.available, lost: t.lost + r.lost,
  }), { fees: 0, captured: 0, available: 0, lost: 0 })

  return { rows, totals, hasHistory: periods.length > 0 }
}

// What choosing the best card per purchase is worth, over time.
// Compares, purchase by purchase:
//   best   - the best card in the wallet for each purchase (what Clavis recommends)
//   single - the one card that would have earned the most if every purchase went on it
// Both use the same multipliers and point values as the rest of the app.

import { dollarValuePerDollar } from './pointValues.js'

function earnedWith(card, tap) {
  const mult = card.multipliers?.find(m => m.category === tap.category)?.multiplier || 1
  return dollarValuePerDollar(card, mult) * (tap.amount || 0)
}

// taps: [{ amount, category, tapped_at }]; cards: wallet cards with multipliers
export function valueOverTime(taps, cards) {
  const usable = cards.filter(c => c.type !== 'gift' && c.type !== 'debit')
  const purchases = taps
    .filter(t => t.amount > 0 && t.category && t.tapped_at)
    .sort((a, b) => new Date(a.tapped_at) - new Date(b.tapped_at))
  if (purchases.length < 2 || usable.length < 2) return null

  // The best single card: highest total if it had been used for everything
  let singleCard = null
  let singleTotal = -1
  for (const card of usable) {
    const total = purchases.reduce((s, t) => s + earnedWith(card, t), 0)
    if (total > singleTotal) { singleTotal = total; singleCard = card }
  }

  let best = 0
  let single = 0
  const points = purchases.map(t => {
    best += Math.max(...usable.map(c => earnedWith(c, t)))
    single += earnedWith(singleCard, t)
    return { date: new Date(t.tapped_at), best, single }
  })

  return { points, singleCard, best, single, gain: best - single, count: purchases.length }
}

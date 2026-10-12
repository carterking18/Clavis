// What choosing the best card per purchase is worth, over time.
// Compares, purchase by purchase:
//   best   - the best card in the wallet for each purchase (what Clavis recommends)
//   single - a flat 2% cash back card on everything: the usual yardstick for a
//            "one card" wallet (pass { baseline: 'bestSingle' } to compare with
//            the wallet's best single card instead)
// Both use the same multipliers and point values as the rest of the app.

import { dollarValuePerDollar } from './pointValues.js'

function earnedWith(card, tap) {
  const mult = card.multipliers?.find(m => m.category === tap.category)?.multiplier || 1
  return dollarValuePerDollar(card, mult) * (tap.amount || 0)
}

// taps: [{ amount, category, tapped_at }]; cards: wallet cards with multipliers
const FLAT_RATE = 0.02
const FLAT_CARD = { name: '2% cash back card', balance_unit: 'cash back' }

export function valueOverTime(taps, cards, { baseline = 'flat' } = {}) {
  const usable = cards.filter(c => c.type !== 'gift' && c.type !== 'debit')
  const purchases = taps
    .filter(t => t.amount > 0 && t.category && t.tapped_at)
    .sort((a, b) => new Date(a.tapped_at) - new Date(b.tapped_at))
  if (purchases.length < 2 || usable.length < 2) return null

  let singleCard = FLAT_CARD
  let singleEarned = t => (t.amount || 0) * FLAT_RATE
  if (baseline === 'bestSingle') {
    // The best single card: highest total if it had been used for everything
    let singleTotal = -1
    for (const card of usable) {
      const total = purchases.reduce((s, t) => s + earnedWith(card, t), 0)
      if (total > singleTotal) { singleTotal = total; singleCard = card }
    }
    singleEarned = t => earnedWith(singleCard, t)
  }

  let best = 0
  let single = 0
  const points = purchases.map(t => {
    best += Math.max(...usable.map(c => earnedWith(c, t)))
    single += singleEarned(t)
    return { date: new Date(t.tapped_at), best, single }
  })

  return { points, singleCard, best, single, gain: best - single, count: purchases.length }
}

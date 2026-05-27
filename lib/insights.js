import { dollarValuePerDollar } from './pointValues'

// Maps perk name keywords → category and/or specific merchants to suggest based on purchase history
const PERK_HINTS = [
  { keywords: ['dining credit', 'restaurant credit', 'resy credit', 'dining statement'], category: 'dining' },
  { keywords: ['uber cash', 'uber eats'], merchants: ['Uber', 'Uber Eats'], category: 'dining' },
  { keywords: ['doordash', 'dashpass'], merchants: ['DoorDash'], category: 'dining' },
  { keywords: ['grubhub'], merchants: ['Grubhub'], category: 'dining' },
  { keywords: ['instacart'], merchants: ['Instacart'], category: 'grocery' },
  { keywords: ['lyft', 'rideshare credit'], merchants: ['Lyft', 'Uber'], category: 'travel' },
  { keywords: ['airline fee credit', 'airline credit', 'in-flight'], category: 'travel', merchants: ['Delta', 'American Airlines', 'United Airlines', 'Southwest Airlines', 'JetBlue'] },
  { keywords: ['capital one travel credit', 'travel credit'], category: 'travel' },
  { keywords: ['hotel credit', 'resort credit', 'property credit'], category: 'hotel' },
  { keywords: ['disney bundle', 'disney+'], merchants: ['Disney+'] },
  { keywords: ['digital entertainment', 'streaming credit'], category: 'streaming' },
  { keywords: ['walmart+ credit', 'walmart'], merchants: ['Walmart'], category: 'grocery' },
  { keywords: ['grocery credit', 'supermarket credit'], category: 'grocery' },
  { keywords: ['gas credit', 'fuel credit', 'ev charging'], category: 'gas' },
  { keywords: ['saks fifth avenue', 'saks credit'], merchants: ['Saks Fifth Avenue'] },
  { keywords: ['clear plus credit', 'clear credit'], merchants: ['CLEAR'] },
  { keywords: ['global entry', 'tsa precheck'], merchants: ['Global Entry', 'TSA PreCheck'] },
  { keywords: ["dunkin'", 'dunkin credit'], merchants: ['Dunkin'] },
  { keywords: ['equinox credit', 'peloton credit', 'gym credit', 'fitness credit'], category: 'other' },
  { keywords: ['lounge buddy', 'airport lounge'], category: 'travel' },
  { keywords: ['southwest travel credit'], merchants: ['Southwest Airlines'], category: 'travel' },
  { keywords: ['united travelbank'], merchants: ['United Airlines'], category: 'travel' },
]

function matchPerkHint(perkName) {
  const lower = perkName.toLowerCase()
  return PERK_HINTS.find(h => h.keywords.some(k => lower.includes(k))) || null
}

function getMostFrequentMerchantMatch(taps, hint) {
  const freq = {}
  for (const tap of taps) {
    if (!tap.merchant) continue
    const inCategory = hint.category ? tap.category === hint.category : true
    const inMerchants = hint.merchants
      ? hint.merchants.some(m => tap.merchant.toLowerCase().includes(m.toLowerCase()))
      : true
    if (inCategory && inMerchants) {
      freq[tap.merchant] = (freq[tap.merchant] || 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

/**
 * Generates proactive perk expiration recommendations matched to purchase history.
 * Returns up to 8 insights sorted by priority (urgency × remaining value).
 */
export function generateInsights(cards, taps) {
  if (!cards.length) return []

  const insights = []
  const now = new Date()

  for (const card of cards) {
    for (const perk of (card.perks || [])) {
      const remaining = perk.total_amount - (perk.used_amount || 0)
      if (remaining <= 0) continue
      if (!perk.resets_at) continue

      const days = Math.ceil((new Date(perk.resets_at) - now) / (1000 * 60 * 60 * 24))
      if (days <= 0 || days > 45) continue

      const hint = matchPerkHint(perk.name)
      let suggestion = null

      if (hint) {
        // Prefer a merchant from user's actual history, fall back to a known merchant, then category
        suggestion = getMostFrequentMerchantMatch(taps, hint)
          || hint.merchants?.[0]
          || (hint.category ? hint.category + ' purchases' : null)
      }

      // Urgency multiplier: 3× for ≤7d, 2× for ≤14d, 1× for ≤45d
      const urgency = days <= 7 ? 3 : days <= 14 ? 2 : 1
      const priority = remaining * urgency

      insights.push({
        id: `perk-${perk.id}`,
        priority,
        card,
        perk,
        remaining,
        days,
        suggestion,
        resetDate: perk.resets_at,
      })
    }
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 8)
}

/**
 * For each tap in history, computes which card would have earned the most and
 * returns the items where a better card existed.
 * Results sorted by total missed value descending.
 */
export function analyzeRetroactiveTaps(taps, cards) {
  if (!taps.length || !cards.length) return []

  const creditCards = cards.filter(c => c.type !== 'gift')
  const missed = []

  for (const tap of taps) {
    if (!tap.amount || tap.amount < 1 || !tap.category || !tap.card_id) continue

    const scored = creditCards
      .map(c => {
        const mult = c.multipliers?.find(m => m.category === tap.category)?.multiplier || 0
        return { card: c, val: dollarValuePerDollar(c, mult) }
      })
      .sort((a, b) => b.val - a.val)

    if (scored.length < 2) continue

    const best = scored[0]
    const used = scored.find(s => s.card.id === tap.card_id)
    if (!used || best.card.id === used.card.id) continue

    const missedPerDollar = best.val - used.val
    if (missedPerDollar < 0.001) continue  // <0.1¢/$ — not worth surfacing

    missed.push({
      tap,
      bestCard: best.card,
      usedCard: used.card,
      missedTotal: missedPerDollar * tap.amount,
      missedPerDollar,
      bestEarned: best.val * tap.amount,
      actualEarned: used.val * tap.amount,
    })
  }

  return missed.sort((a, b) => b.missedTotal - a.missedTotal)
}

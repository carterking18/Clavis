import { getCentsPerPoint } from './pointValues'

function recDollarValue(rec, category) {
  const mult = rec.multipliers[category]
  if (mult <= 0) return 0
  const isCash = rec.balanceUnit === 'cash back'
  return isCash ? mult / 100 : (mult * rec.centsPerPoint) / 100
}

function dollarValuePerDollar(card, mult) {
  if (!card || mult <= 0) return 0
  const isCash = card.balance_unit === 'cash back' || card.balance_unit === 'dollars'
  if (isCash) return mult / 100
  return (mult * getCentsPerPoint(card.name)) / 100
}

// Curated list of beginner-friendly cards worth recommending to college students
// Ordered by approachability (no-fee first, then premium)
const RECOMMENDABLE_CARDS = [
  {
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    annualFee: 0,
    keywords: ['freedom unlimited'],
    multipliers: { dining: 3, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '1.5% everywhere + 3% dining — great starter card with no fee',
    studentFriendly: true,
  },
  {
    name: 'Capital One SavorOne',
    issuer: 'Capital One',
    annualFee: 0,
    keywords: ['savor one', 'savorone'],
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '3% on dining, groceries & streaming with no annual fee',
    studentFriendly: true,
  },
  {
    name: 'Discover it Student',
    issuer: 'Discover',
    annualFee: 0,
    keywords: ['discover it student', 'discover student'],
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: 'Easy approval for students, 5% rotating categories, cash-back match first year',
    studentFriendly: true,
  },
  {
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    annualFee: 95,
    keywords: ['sapphire preferred'],
    multipliers: { dining: 3, travel: 2, hotel: 2, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.8,
    balanceUnit: 'points',
    why: '3x dining & groceries, transferable points — the classic starter travel card',
    studentFriendly: false,
  },
  {
    name: 'Amex Gold Card',
    issuer: 'American Express',
    annualFee: 250,
    keywords: ['amex gold', 'gold card'],
    multipliers: { dining: 4, travel: 3, hotel: 1, grocery: 4, gas: 1, streaming: 1, retail: 1, other: 1 },
    centsPerPoint: 1.8,
    balanceUnit: 'points',
    why: '4x dining & groceries — best-in-class for food spend',
    studentFriendly: false,
  },
  {
    name: 'Capital One Venture X',
    issuer: 'Capital One',
    annualFee: 395,
    keywords: ['venture x'],
    multipliers: { dining: 2, travel: 5, hotel: 10, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    centsPerPoint: 1.85,
    balanceUnit: 'points',
    why: '2x everywhere + lounge access — premium travel card with offset-able fee',
    studentFriendly: false,
  },
  {
    name: 'Citi Double Cash',
    issuer: 'Citi',
    annualFee: 0,
    keywords: ['double cash'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '2% everywhere — the best flat-rate catch-all with no fee',
    studentFriendly: true,
  },
  {
    name: 'Wells Fargo Autograph',
    issuer: 'Wells Fargo',
    annualFee: 0,
    keywords: ['autograph'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 3, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '3x dining, travel, gas & streaming with no annual fee',
    studentFriendly: true,
  },
]

const CATEGORIES = ['dining', 'travel', 'hotel', 'grocery', 'gas', 'streaming', 'retail', 'other']

function userBestRateForCategory(cards, category) {
  let best = 0
  let bestCard = null
  for (const card of cards) {
    if (card.type === 'gift') continue
    const mult = card.multipliers?.find(m => m.category === category)?.multiplier || 0
    const val = dollarValuePerDollar(card, mult)
    if (val > best) { best = val; bestCard = card }
  }
  return { rate: best, card: bestCard }
}

function userAlreadyHas(cards, rec) {
  return cards.some(c => rec.keywords.some(k => c.name.toLowerCase().includes(k)))
}

/**
 * Analyzes tap history + current wallet to recommend cards the user doesn't have.
 * Returns up to 3 recommendations sorted by projected annual gain.
 */
export function generateRecommendations(cards, taps) {
  if (!taps.length) return []

  // Compute spend per category over all history
  const spendByCategory = {}
  for (const tap of taps) {
    if (!tap.category || !tap.amount || tap.amount < 1) continue
    spendByCategory[tap.category] = (spendByCategory[tap.category] || 0) + tap.amount
  }

  // Annualize: find date range of taps
  const dates = taps.map(t => new Date(t.tapped_at)).filter(Boolean)
  const spanDays = dates.length >= 2
    ? (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)
    : 30
  const annualizeFactor = spanDays < 14 ? 12 : (365 / Math.max(spanDays, 1))

  const creditCards = cards.filter(c => c.type !== 'gift')

  // For each recommendable card, compute projected annual gain vs current wallet
  const scored = RECOMMENDABLE_CARDS
    .filter(rec => !userAlreadyHas(cards, rec))
    .map(rec => {
      let annualGain = 0
      const improvements = []

      for (const cat of CATEGORIES) {
        const spend = spendByCategory[cat] || 0
        if (spend < 5) continue

        const recVal = recDollarValue(rec, cat)
        const { rate: userRate, card: userCard } = userBestRateForCategory(creditCards, cat)

        const gainPerDollar = recVal - userRate
        if (gainPerDollar < 0.002) continue  // less than 0.2¢/$ improvement — skip

        const annualCatGain = gainPerDollar * spend * annualizeFactor
        if (annualCatGain < 2) continue

        annualGain += annualCatGain
        improvements.push({ category: cat, gainPerDollar, annualCatGain, spend, userCard })
      }

      // Subtract annual fee
      const netAnnualGain = annualGain - rec.annualFee

      return { rec, annualGain, netAnnualGain, improvements }
    })
    .filter(r => r.improvements.length > 0 && r.netAnnualGain > 5)
    .sort((a, b) => b.netAnnualGain - a.netAnnualGain)
    .slice(0, 3)

  return scored
}

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

// Curated list of cards worth recommending — student/starter first, then no-fee, then mid/premium.
// Order within a tier matters: better spending-match cards should come first.
const RECOMMENDABLE_CARDS = [
  // ── Student & Starter (no credit history needed) ───────────────────────
  {
    name: 'Discover it Student',
    issuer: 'Discover',
    annualFee: 0,
    keywords: ['discover it student', 'discover student'],
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 1, gas: 2, streaming: 1, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: 'Built for students with no credit history. 5% rotating categories (gas, restaurants, Amazon), cash-back match your entire first year, and no annual fee.',
    studentFriendly: true,
    tier: 'student',
  },
  {
    name: 'Capital One SavorOne Student',
    issuer: 'Capital One',
    annualFee: 0,
    keywords: ['savor one student', 'savorone student', 'capital one savor student'],
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '3% on dining, groceries, streaming & entertainment — the best student card for food and going out. No annual fee, no foreign transaction fees.',
    studentFriendly: true,
    tier: 'student',
  },
  {
    name: 'Capital One Quicksilver Student',
    issuer: 'Capital One',
    annualFee: 0,
    keywords: ['quicksilver student', 'capital one quicksilver student'],
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '1.5% cash back on everything — simple, no categories to track. Good first card if your spending is spread across many categories.',
    studentFriendly: true,
    tier: 'student',
  },
  {
    name: 'Petal 2 Visa',
    issuer: 'Petal',
    annualFee: 0,
    keywords: ['petal 2'],
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: 'No fees ever. No SSN required for some applicants. Earn up to 1.5% cash back as you build your credit score with on-time payments.',
    studentFriendly: true,
    tier: 'student',
  },
  {
    name: 'Deserve EDU Mastercard',
    issuer: 'Deserve',
    annualFee: 0,
    keywords: ['deserve edu', 'deserve edu mastercard'],
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: 'Designed for international students — no SSN required, no co-signer needed. 3% on streaming services, 1% everywhere else. Amazon Prime Student included free for a year.',
    studentFriendly: true,
    tier: 'student',
  },

  // ── No-fee Everyday ───────────────────────────────────────────────────
  {
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    annualFee: 0,
    keywords: ['freedom unlimited'],
    multipliers: { dining: 3, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '1.5% on everything + 3% dining — excellent catch-all with no annual fee. Points can upgrade to Chase Sapphire later.',
    studentFriendly: true,
    tier: 'no-fee',
  },
  {
    name: 'Capital One SavorOne',
    issuer: 'Capital One',
    annualFee: 0,
    keywords: ['savor one', 'savorone'],
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '3% on dining, groceries & streaming with no annual fee. Best no-fee card for food-heavy spenders.',
    studentFriendly: true,
    tier: 'no-fee',
  },
  {
    name: 'Citi Double Cash',
    issuer: 'Citi',
    annualFee: 0,
    keywords: ['double cash'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '2% on absolutely everything — the best flat-rate card. If you hate thinking about categories, this is the card.',
    studentFriendly: true,
    tier: 'no-fee',
  },
  {
    name: 'Wells Fargo Autograph',
    issuer: 'Wells Fargo',
    annualFee: 0,
    keywords: ['autograph'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 3, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.0,
    balanceUnit: 'cash back',
    why: '3x dining, travel, gas & streaming with no annual fee. Rare to find this many 3x categories for free.',
    studentFriendly: true,
    tier: 'no-fee',
  },
  {
    name: 'Bilt Mastercard',
    issuer: 'Bilt',
    annualFee: 0,
    keywords: ['bilt'],
    multipliers: { dining: 3, travel: 2, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    centsPerPoint: 1.8,
    balanceUnit: 'points',
    why: '3x dining, 2x travel, and earn points on rent payments with no processing fee. Points transfer to airlines & hotels.',
    studentFriendly: false,
    tier: 'no-fee',
  },

  // ── Mid-tier ──────────────────────────────────────────────────────────
  {
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    annualFee: 95,
    keywords: ['sapphire preferred'],
    multipliers: { dining: 3, travel: 2, hotel: 2, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    centsPerPoint: 1.8,
    balanceUnit: 'points',
    why: '3x dining & groceries, transferable points worth 1.8¢+ each — the classic first travel rewards card.',
    studentFriendly: false,
    tier: 'mid',
  },
  {
    name: 'Amex Gold Card',
    issuer: 'American Express',
    annualFee: 250,
    keywords: ['amex gold', 'gold card'],
    multipliers: { dining: 4, travel: 3, hotel: 1, grocery: 4, gas: 1, streaming: 1, retail: 1, other: 1 },
    centsPerPoint: 1.8,
    balanceUnit: 'points',
    why: '4x dining & US supermarkets — best-in-class for food spend. $120/yr in dining credits offsets the fee.',
    studentFriendly: false,
    tier: 'mid',
  },
  {
    name: 'Capital One Venture',
    issuer: 'Capital One',
    annualFee: 95,
    keywords: ['capital one venture', 'venture rewards'],
    multipliers: { dining: 2, travel: 5, hotel: 5, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    centsPerPoint: 1.85,
    balanceUnit: 'points',
    why: '2x on everything, 5x on hotels & rental cars. Simple earning, flexible redemption — great mid-tier travel card.',
    studentFriendly: false,
    tier: 'mid',
  },

  // ── Premium ───────────────────────────────────────────────────────────
  {
    name: 'Capital One Venture X',
    issuer: 'Capital One',
    annualFee: 395,
    keywords: ['venture x'],
    multipliers: { dining: 2, travel: 5, hotel: 10, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    centsPerPoint: 1.85,
    balanceUnit: 'points',
    why: '2x everywhere, lounge access, $300 travel credit that nearly offsets the fee. Best value premium card on the market.',
    studentFriendly: false,
    tier: 'premium',
  },
  {
    name: 'Chase Sapphire Reserve',
    issuer: 'Chase',
    annualFee: 550,
    keywords: ['sapphire reserve'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    centsPerPoint: 1.8,
    balanceUnit: 'points',
    why: '3x dining & travel, Priority Pass lounge access, $300 travel credit. The benchmark premium travel card.',
    studentFriendly: false,
    tier: 'premium',
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
 * Falls back to category-gap analysis when tap amounts are unavailable.
 * Returns up to 3 recommendations sorted by projected annual gain.
 */
export function generateRecommendations(cards, taps) {
  if (!cards.length) return []

  const creditCards = cards.filter(c => c.type !== 'gift')

  // Compute spend per category from taps that have amounts
  const spendByCategory = {}
  const tapsByCategory = {}
  for (const tap of taps) {
    if (!tap.category) continue
    tapsByCategory[tap.category] = (tapsByCategory[tap.category] || 0) + 1
    if (tap.amount && tap.amount >= 1) {
      spendByCategory[tap.category] = (spendByCategory[tap.category] || 0) + tap.amount
    }
  }

  // If no amounts recorded, assume $20/tap as a rough proxy
  for (const cat of CATEGORIES) {
    if (!spendByCategory[cat] && tapsByCategory[cat]) {
      spendByCategory[cat] = tapsByCategory[cat] * 20
    }
  }

  // Annualize actual spend
  const dates = taps.map(t => new Date(t.tapped_at)).filter(d => !isNaN(d))
  const spanDays = dates.length >= 2
    ? (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)
    : 30
  const annualizeFactor = spanDays < 14 ? 12 : (365 / Math.max(spanDays, 1))

  // Convert actual spend to annual
  const annualSpend = {}
  for (const cat of CATEGORIES) {
    annualSpend[cat] = (spendByCategory[cat] || 0) * annualizeFactor
  }

  // Fill missing categories with annual defaults (monthly × 12)
  const MONTHLY_DEFAULTS = { dining: 200, grocery: 150, streaming: 40, gas: 60, retail: 100, travel: 50, hotel: 30, other: 50 }
  for (const cat of CATEGORIES) {
    if (!annualSpend[cat]) annualSpend[cat] = MONTHLY_DEFAULTS[cat] * 12
  }

  const scored = RECOMMENDABLE_CARDS
    .filter(rec => !userAlreadyHas(cards, rec))
    .map(rec => {
      let annualGain = 0
      const improvements = []

      for (const cat of CATEGORIES) {
        const spend = annualSpend[cat] || 0
        if (spend < 1) continue

        const recVal = recDollarValue(rec, cat)
        const { rate: userRate, card: userCard } = userBestRateForCategory(creditCards, cat)

        const gainPerDollar = recVal - userRate
        if (gainPerDollar < 0.001) continue

        const annualCatGain = gainPerDollar * spend
        if (annualCatGain < 1) continue

        annualGain += annualCatGain
        improvements.push({ category: cat, gainPerDollar, annualCatGain, spend, userCard })
      }

      const netAnnualGain = annualGain - rec.annualFee

      return { rec, annualGain, netAnnualGain, improvements }
    })
    .filter(r => r.improvements.length > 0 && r.netAnnualGain > 1)
    .sort((a, b) => b.netAnnualGain - a.netAnnualGain)
    .slice(0, 3)

  return scored
}

function debugRecommendations(cards, taps) {
  if (!cards.length) return 'no cards'
  const creditCards = cards.filter(c => c.type !== 'gift')

  const spendByCategory = {}
  const tapsByCategory = {}
  for (const tap of taps) {
    if (!tap.category) continue
    tapsByCategory[tap.category] = (tapsByCategory[tap.category] || 0) + 1
    if (tap.amount && tap.amount >= 1) {
      spendByCategory[tap.category] = (spendByCategory[tap.category] || 0) + tap.amount
    }
  }
  for (const cat of CATEGORIES) {
    if (!spendByCategory[cat] && tapsByCategory[cat]) spendByCategory[cat] = tapsByCategory[cat] * 20
  }

  const dates = taps.map(t => new Date(t.tapped_at)).filter(d => !isNaN(d))
  const spanDays = dates.length >= 2 ? (Math.max(...dates) - Math.min(...dates)) / 86400000 : 30
  const annualizeFactor = spanDays < 14 ? 12 : (365 / Math.max(spanDays, 1))

  const annualSpend = {}
  for (const cat of CATEGORIES) annualSpend[cat] = (spendByCategory[cat] || 0) * annualizeFactor
  const MONTHLY_DEFAULTS = { dining: 200, grocery: 150, streaming: 40, gas: 60, retail: 100, travel: 50, hotel: 30, other: 50 }
  for (const cat of CATEGORIES) if (!annualSpend[cat]) annualSpend[cat] = MONTHLY_DEFAULTS[cat] * 12

  const lines = [`span=${Math.round(spanDays)}d af=${annualizeFactor.toFixed(1)}`]
  lines.push(`spend: ` + CATEGORIES.map(c => `${c}=$${Math.round(annualSpend[c])}`).join(' '))
  lines.push(`baseline: ` + CATEGORIES.map(c => {
    const { rate, card } = userBestRateForCategory(creditCards, c)
    return `${c}=${(rate*100).toFixed(2)}c(${card?.name?.split(' ').slice(-1)[0] || '?'})`
  }).join(' '))

  for (const rec of RECOMMENDABLE_CARDS) {
    const has = userAlreadyHas(cards, rec)
    if (has) { lines.push(`${rec.name}: OWNED`); continue }
    let annualGain = 0
    const imps = []
    for (const cat of CATEGORIES) {
      const spend = annualSpend[cat] || 0
      if (spend < 1) continue
      const recVal = recDollarValue(rec, cat)
      const { rate: userRate } = userBestRateForCategory(creditCards, cat)
      const gain = recVal - userRate
      if (gain >= 0.001) imps.push(`${cat}:+${(gain*100).toFixed(2)}c=$${(gain*spend).toFixed(0)}`)
      annualGain += gain > 0 ? gain * spend : 0
    }
    const net = annualGain - rec.annualFee
    lines.push(`${rec.name}: net=$${net.toFixed(0)} imps=${imps.length} [${imps.slice(0,3).join(',')}]`)
  }
  return lines.join('\n')
}

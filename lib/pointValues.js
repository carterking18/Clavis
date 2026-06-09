// Conservative (base) redemption value in cents per point/mile.
// These reflect typical cash-equivalent or low-effort redemptions —
// NOT best-case sweet spots. We never want to overstate value.
// Where a better redemption exists (e.g. Chase portal, transfer partners),
// we surface a tip to the user instead of inflating the base number.

const VALUATIONS = [
  // ── Chase Ultimate Rewards ────────────────────────────
  // Base: ~1.0¢ cash back equivalent; portal bumps Preferred→1.25¢, Reserve→1.5¢
  { keywords: ['sapphire reserve'],                            centsPerPoint: 1.5,  tip: 'Book through Chase Travel portal for up to 1.5¢/pt — 50% more value.' },
  { keywords: ['sapphire preferred'],                          centsPerPoint: 1.25, tip: 'Book through Chase Travel portal for 1.25¢/pt, or transfer to airline/hotel partners for more.' },
  { keywords: ['ink business preferred', 'ink preferred'],     centsPerPoint: 1.25, tip: 'Transfer to travel partners or book via Chase portal for 1.25¢/pt+.' },
  { keywords: ['ink business cash', 'ink cash'],               centsPerPoint: 1.0,  tip: null },
  { keywords: ['freedom unlimited', 'freedom flex'],           centsPerPoint: 1.0,  tip: null },

  // ── Amex Membership Rewards ───────────────────────────
  // Base: ~0.6¢ as statement credit; transfer partners regularly yield 1.5¢+
  { keywords: ['amex platinum', 'american express platinum'],  centsPerPoint: 1.0,  tip: 'Transfer to airline partners (e.g. Air France, ANA) for 1.5¢/pt or more.' },
  { keywords: ['amex gold', 'american express gold', 'gold card'], centsPerPoint: 1.0, tip: 'Transfer to airline partners for 1.5¢/pt or more.' },
  { keywords: ['amex green', 'american express green'],        centsPerPoint: 1.0,  tip: 'Transfer to airline or hotel partners for higher value.' },
  { keywords: ['blue cash preferred', 'blue cash everyday'],   centsPerPoint: 1.0,  tip: null },

  // ── Capital One Miles ─────────────────────────────────
  { keywords: ['venture x'],   centsPerPoint: 1.0, tip: 'Transfer to airline/hotel partners or book via Capital One Travel for up to 1.85¢/pt.' },
  { keywords: ['venture'],     centsPerPoint: 1.0, tip: 'Transfer to airline/hotel partners or book via Capital One Travel for more value.' },
  { keywords: ['savor'],       centsPerPoint: 1.0, tip: null },

  // ── Citi ThankYou Points ──────────────────────────────
  { keywords: ['citi premier', 'citi strata premier'], centsPerPoint: 1.0, tip: 'Transfer to airline partners (e.g. Turkish Airlines, Avianca) for 1.5¢/pt+.' },
  { keywords: ['citi prestige'],                       centsPerPoint: 1.0, tip: 'Transfer to airline partners for higher value.' },
  { keywords: ['citi double cash', 'citi custom cash'], centsPerPoint: 1.0, tip: null },

  // ── Airline Miles ─────────────────────────────────────
  { keywords: ['delta skymiles reserve', 'delta reserve'],    centsPerPoint: 1.1, tip: 'Book Delta flights during SkyMiles sales for the best value.' },
  { keywords: ['delta skymiles platinum', 'delta platinum'],  centsPerPoint: 1.1, tip: null },
  { keywords: ['delta skymiles gold', 'delta gold'],          centsPerPoint: 1.1, tip: null },
  { keywords: ['united explorer', 'united club infinite', 'united quest'], centsPerPoint: 1.2, tip: 'Book United Saver awards for best value.' },
  { keywords: ['southwest rapid rewards priority', 'southwest priority', 'southwest plus', 'southwest premier'], centsPerPoint: 1.4, tip: 'Redeem for Wanna Get Away fares for best value.' },
  { keywords: ['alaska airlines'],   centsPerPoint: 1.4, tip: 'Use Alaska Mileage Plan partner awards for best value.' },
  { keywords: ['jetblue plus', 'jetblue'], centsPerPoint: 1.2, tip: null },
  { keywords: ['american airlines', 'citi aadvantage', 'barclays aadvantage'], centsPerPoint: 1.2, tip: 'Book AAnytime or partner awards for best value.' },

  // ── Hotel Points ──────────────────────────────────────
  { keywords: ['world of hyatt', 'hyatt'],   centsPerPoint: 1.5, tip: 'Book Category 1–4 properties for best value.' },
  { keywords: ['marriott bonvoy brilliant', 'marriott bonvoy boundless', 'marriott bonvoy'], centsPerPoint: 0.7, tip: 'Book off-peak nights for best value.' },
  { keywords: ['hilton honors aspire', 'hilton honors surpass', 'hilton honors'], centsPerPoint: 0.5, tip: 'Book premium properties to maximize point value.' },
  { keywords: ['ihg one rewards premier', 'ihg premier', 'ihg'], centsPerPoint: 0.5, tip: null },
  { keywords: ['wyndham rewards'], centsPerPoint: 0.8, tip: null },

  // ── Wells Fargo ───────────────────────────────────────
  { keywords: ['autograph journey', 'autograph'], centsPerPoint: 1.0, tip: null },

  // ── Amazon / Store ────────────────────────────────────
  { keywords: ['amazon prime rewards', 'amazon prime visa'], centsPerPoint: 1.0, tip: null },
]

/**
 * Returns { centsPerPoint, tip } for a card name.
 * tip is a string suggestion for getting more value, or null if not applicable.
 */
export function getPointValuation(cardName) {
  if (!cardName) return { centsPerPoint: 1.0, tip: null }
  const lower = cardName.toLowerCase()
  for (const entry of VALUATIONS) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return { centsPerPoint: entry.centsPerPoint, tip: entry.tip || null }
    }
  }
  return { centsPerPoint: 1.0, tip: null }
}

// Backwards-compatible alias used in some places
export function getCentsPerPoint(cardName) {
  return getPointValuation(cardName).centsPerPoint
}

/**
 * Returns estimated dollar value earned per dollar spent.
 * e.g. 4x pts on Amex Gold (1.0¢ conservative) → $0.04 per dollar
 *      1.5% cash back → $0.015 per dollar
 * Returns 0 if no multiplier is set — we never invent value.
 */
export function dollarValuePerDollar(card, multiplier) {
  if (!card || multiplier <= 0) return 0
  if (card.type === 'debit') return 0
  const isCash = card.balance_unit === 'cash back' || card.balance_unit === 'dollars'
  if (isCash) return multiplier / 100
  return (multiplier * getPointValuation(card.name).centsPerPoint) / 100
}

/**
 * Formats the value as a short human-readable string.
 * e.g. "4.0¢ / $1" or "1.5¢ / $1"
 */
export function formatValuePerDollar(card, multiplier) {
  const val = dollarValuePerDollar(card, multiplier)
  if (val <= 0) return null
  const cents = val * 100
  return `${cents % 1 === 0 ? cents.toFixed(0) : cents.toFixed(1)}¢ / $1`
}

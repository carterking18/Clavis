// Estimated redemption value in cents per point/mile
// Based on typical sweet-spot redemptions (travel, hotels, transfers)
// Cash back cards are always 1¢ per "point" (they are dollars)

const VALUATIONS = [
  // ── Chase Ultimate Rewards ────────────────────────────
  { keywords: ['sapphire reserve'], centsPerPoint: 2.0 },
  { keywords: ['sapphire preferred'], centsPerPoint: 1.8 },
  { keywords: ['ink business preferred', 'ink preferred'], centsPerPoint: 1.8 },
  { keywords: ['ink business cash', 'ink cash'], centsPerPoint: 1.0 },
  { keywords: ['freedom unlimited', 'freedom flex'], centsPerPoint: 1.0 },

  // ── Amex Membership Rewards ───────────────────────────
  { keywords: ['amex platinum', 'american express platinum'], centsPerPoint: 2.0 },
  { keywords: ['amex gold', 'american express gold', 'gold card'], centsPerPoint: 1.8 },
  { keywords: ['amex green', 'american express green'], centsPerPoint: 1.8 },
  { keywords: ['blue cash preferred', 'blue cash everyday'], centsPerPoint: 1.0 },

  // ── Capital One Miles ─────────────────────────────────
  { keywords: ['venture x'], centsPerPoint: 1.85 },
  { keywords: ['venture'], centsPerPoint: 1.7 },
  { keywords: ['savor'], centsPerPoint: 1.0 },

  // ── Citi ThankYou Points ──────────────────────────────
  { keywords: ['citi premier', 'citi strata premier'], centsPerPoint: 1.7 },
  { keywords: ['citi prestige'], centsPerPoint: 1.7 },
  { keywords: ['citi double cash', 'citi custom cash'], centsPerPoint: 1.0 },

  // ── Airline Miles ─────────────────────────────────────
  { keywords: ['delta skymiles reserve', 'delta reserve'], centsPerPoint: 1.2 },
  { keywords: ['delta skymiles platinum', 'delta platinum'], centsPerPoint: 1.2 },
  { keywords: ['delta skymiles gold', 'delta gold'], centsPerPoint: 1.2 },
  { keywords: ['united explorer', 'united club infinite', 'united quest'], centsPerPoint: 1.35 },
  { keywords: ['southwest rapid rewards priority', 'southwest priority', 'southwest plus', 'southwest premier'], centsPerPoint: 1.5 },
  { keywords: ['alaska airlines'], centsPerPoint: 1.8 },
  { keywords: ['jetblue plus', 'jetblue'], centsPerPoint: 1.3 },
  { keywords: ['american airlines', 'citi aadvantage', 'barclays aadvantage'], centsPerPoint: 1.4 },

  // ── Hotel Points ──────────────────────────────────────
  { keywords: ['world of hyatt', 'hyatt'], centsPerPoint: 1.7 },
  { keywords: ['marriott bonvoy brilliant', 'marriott bonvoy boundless', 'marriott bonvoy'], centsPerPoint: 0.8 },
  { keywords: ['hilton honors aspire', 'hilton honors surpass', 'hilton honors'], centsPerPoint: 0.6 },
  { keywords: ['ihg one rewards premier', 'ihg premier', 'ihg'], centsPerPoint: 0.5 },
  { keywords: ['wyndham rewards'], centsPerPoint: 0.9 },

  // ── Wells Fargo ───────────────────────────────────────
  { keywords: ['autograph journey', 'autograph'], centsPerPoint: 1.0 },

  // ── Amazon / Store ────────────────────────────────────
  { keywords: ['amazon prime rewards', 'amazon prime visa'], centsPerPoint: 1.0 },
]

/**
 * Returns estimated cents-per-point for a card name.
 * Cash back cards always return 1.0 (handled separately by isCashBack).
 */
export function getCentsPerPoint(cardName) {
  if (!cardName) return 1.0
  const lower = cardName.toLowerCase()
  for (const entry of VALUATIONS) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.centsPerPoint
    }
  }
  return 1.0 // default: assume 1¢/pt (cash or unknown)
}

/**
 * Returns estimated dollar value earned per dollar spent.
 * e.g. 4x pts on Amex Gold (1.8¢/pt) → 0.072 → 7.2¢ per dollar
 *      1.5% cash back → 0.015 → 1.5¢ per dollar
 */
export function dollarValuePerDollar(card, multiplier) {
  if (!card || multiplier <= 0) return 0
  const isCash = card.balance_unit === 'cash back' || card.balance_unit === 'dollars'
  if (isCash) return multiplier / 100
  return (multiplier * getCentsPerPoint(card.name)) / 100
}

/**
 * Formats the value as a short human-readable string.
 * e.g. "7.2¢ / $1" or "1.5¢ / $1"
 */
export function formatValuePerDollar(card, multiplier) {
  const val = dollarValuePerDollar(card, multiplier)
  if (val <= 0) return null
  const cents = val * 100
  return `${cents % 1 === 0 ? cents.toFixed(0) : cents.toFixed(1)}¢ / $1`
}

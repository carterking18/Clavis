// Card recommendation logic. Used by the Tap screen and the landing-page demo,
// so the public demo ranks cards exactly the way the product does.

import { dollarValuePerDollar, formatValuePerDollar } from './pointValues'
import { daysUntilReset } from './cardPerks'
import { money, moneyWhole } from './format'

// Generic words that show up in perk names but aren't merchant identifiers —
// stripped out before matching a perk name against what the user typed, so
// e.g. "Resy Dining Credit" reduces to "resy" rather than matching every
// "dining" search.
const PERK_GENERIC_WORDS = new Set([
  'credit', 'credits', 'dining', 'travel', 'hotel', 'hotels', 'airline', 'airlines',
  'fee', 'fees', 'digital', 'entertainment', 'property', 'eligible', 'stays', 'stay',
  'global', 'entry', 'tsa', 'precheck', 'in-flight', 'inflight', 'wifi', 'wi-fi',
  'rideshare', 'resort', 'resorts', 'fine', 'dashpass', 'plus', 'membership',
  'annual', 'monthly', 'semi-annual', 'and', 'the', 'amex', 'chase', 'card', 'bonus',
])

// Does this perk look like it's tied to a specific merchant the user is
// shopping at right now? (e.g. a "Peloton Credit" perk when the user types
// "Peloton") — these are typically use-it-here-or-lose-it statement credits
// that only get captured by spending at that exact merchant.
export function perkMatchesMerchant(perkName, merchantStr) {
  if (!merchantStr) return false
  const m = merchantStr.toLowerCase().trim()
  if (m.length < 3) return false
  const words = perkName.toLowerCase().replace(/[^\w\s+'-]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !PERK_GENERIC_WORDS.has(w))
  return words.some(w => m.includes(w) || w.includes(m))
}

export function isCashBack(card) { return card?.balance_unit === 'cash back' || card?.balance_unit === 'dollars' }

export function multiplierFor(card, category) {
  if (!card) return 0
  return card.multipliers?.find(m => m.category === category)?.multiplier || 0
}

export function scoreCard(card, { category, merchant = '' } = {}) {
  const mult = multiplierFor(card, category)
  const dollarVal = isCashBack(card) ? mult / 100 : dollarValuePerDollar(card, mult)

  const perks = card.perks || []
  const activePerks = perks.filter(p => p.used_amount < p.total_amount)
  const expiringPerks = activePerks.filter(p => {
    const days = daysUntilReset(p.resets_at)
    return days !== null && days <= 14
  })
  // Dollar value still sitting unused on this card — this is what actually
  // determines how much "weight" a perk should carry against a marginal
  // rewards-rate difference. A flat per-perk bump would let a $5 perk and a
  // $300 perk nudge the score by the same amount, which doesn't reflect
  // what's really at stake for the user.
  const activePerksValue = activePerks.reduce((s, p) => s + Math.max(0, (p.total_amount || 0) - (p.used_amount || 0)), 0)
  const expiringPerksValue = expiringPerks.reduce((s, p) => s + Math.max(0, (p.total_amount || 0) - (p.used_amount || 0)), 0)
  const isGiftWithBalance = card.type === 'gift' && (card.balance || 0) > 0

  // Check if this gift card is linked to the merchant being typed
  const tapMerchant = (merchant || '').toLowerCase().trim()
  const giftMerchantLinked = isGiftWithBalance && tapMerchant && (() => {
    const linked = (card.merchant || '').toLowerCase()
    const cardName = card.name.toLowerCase()
    // Match against the explicit merchant field, or infer from card name
    return (linked && (linked.includes(tapMerchant) || tapMerchant.includes(linked))) ||
           cardName.includes(tapMerchant) ||
           tapMerchant.includes(cardName.replace(/\s*(gift\s*card|gc)\s*/gi, '').trim())
  })()

  // A merchant-specific perk you'd otherwise likely never use: a $60
  // Peloton credit only has value if you're shopping at Peloton — the
  // rewards-rate math doesn't matter if this is the one shot you have to
  // capture it. Surface (and prioritize) the card whose unused perk best
  // matches where the user is tapping.
  const merchantPerkMatch = tapMerchant
    ? activePerks
        .filter(p => perkMatchesMerchant(p.name, tapMerchant))
        .sort((a, b) => (b.total_amount - b.used_amount) - (a.total_amount - a.used_amount))[0]
    : null

  let score = dollarVal * 100
  // Small steady nudge for cards carrying unused perk value, plus a
  // sharper urgency nudge — scaled by dollars, not just perk count — for
  // perks about to reset. A $5 credit barely moves the needle; a $200
  // credit expiring this week can (and should) outweigh a modest
  // rewards-rate edge from another card.
  score += activePerks.length * 0.3 + activePerksValue / 50
  score += expiringPerks.length * 1 + expiringPerksValue / 15
  if (isGiftWithBalance) score += 5
  // A merchant-matched perk beats ordinary rewards-rate math — this may be
  // the only purchase all year where this credit is even capturable. It
  // sits just below a linked gift card balance (money you've already spent).
  if (merchantPerkMatch) score = Math.max(score, 500 + (merchantPerkMatch.total_amount - merchantPerkMatch.used_amount))
  if (giftMerchantLinked) score = 9999

  const reasons = []
  if (merchantPerkMatch) {
    const remaining = merchantPerkMatch.total_amount - merchantPerkMatch.used_amount
    reasons.push(`Use here — captures your ${remaining % 1 === 0 ? moneyWhole(remaining) : money(remaining)} ${merchantPerkMatch.name.replace(/\s*credit\s*$/i, '')} credit`)
  }
  if (mult > 0) {
    const fvpd = formatValuePerDollar(card, mult)
    reasons.push(isCashBack(card) ? `${mult}% back` : `${mult}x pts${fvpd ? ` (${fvpd})` : ''}`)
  }
  if (expiringPerks.length > 0) reasons.push(`${expiringPerks.length} perk${expiringPerks.length > 1 ? 's' : ''} expiring soon`)
  else if (activePerks.length > 0 && !merchantPerkMatch) reasons.push(`${activePerks.length} active perk${activePerks.length > 1 ? 's' : ''}`)
  if (isGiftWithBalance) reasons.push(`${money(card.balance)} gift balance`)
  if (giftMerchantLinked) reasons.unshift(`Use here`)

  return { card, score, dollarVal, mult, reasons, merchantPerk: merchantPerkMatch || null }
}

// Best card first. Ties on score go to the card with the higher annual fee
// (the one the user is paying more to hold).
export function rankCards(cards, context) {
  return [...cards]
    .filter(c => !(c.type === 'gift' && (c.balance || 0) <= 0))
    .map(c => scoreCard(c, context))
    .sort((a, b) => {
      const d = b.score - a.score
      if (Math.abs(d) > 0.001) return d
      return (b.card.annual_fee || 0) - (a.card.annual_fee || 0)
    })
}

// Travel rates that only apply when you book a certain way. Clavis ranks with
// the card's stored rate; these rules say how to book to actually get it.
// Checked against each issuer's card page on 2026-10-12. Update `checked`
// when re-verifying, and add cards only after reading the issuer's terms.

export const BOOKING_RATES_CHECKED = '2026-10-12'

const RULES = [
  {
    keywords: ['venture x'],
    base: 2,
    rates: [
      { categories: ['hotel', 'travel'], rate: 10, how: 'Book hotels and rental cars through Capital One Travel' },
      { categories: ['travel'], rate: 5, how: 'Book flights and vacation rentals through Capital One Travel' },
    ],
  },
  {
    keywords: ['venture'],
    base: 2,
    rates: [
      { categories: ['hotel', 'travel'], rate: 5, how: 'Book hotels, vacation rentals and rental cars through Capital One Travel' },
    ],
  },
  {
    keywords: ['sapphire reserve'],
    base: 1,
    rates: [
      { categories: ['hotel', 'travel'], rate: 8, how: 'Book through Chase Travel' },
      { categories: ['hotel', 'travel'], rate: 4, how: 'Book flights and hotels directly with the airline or hotel' },
    ],
  },
  {
    keywords: ['sapphire preferred'],
    base: 2,
    rates: [
      { categories: ['hotel', 'travel'], rate: 5, how: 'Book through Chase Travel' },
    ],
  },
  {
    keywords: ['freedom unlimited'],
    base: 1.5,
    rates: [
      { categories: ['hotel', 'travel'], rate: 5, how: 'Book through Chase Travel' },
    ],
  },
  {
    keywords: ['freedom flex'],
    base: 1,
    rates: [
      { categories: ['hotel', 'travel'], rate: 5, how: 'Book through Chase Travel' },
    ],
  },
  {
    keywords: ['amex platinum', 'american express platinum'],
    base: 1,
    rates: [
      { categories: ['travel'], rate: 5, how: 'Book flights directly with the airline or through Amex Travel' },
      { categories: ['hotel'], rate: 5, how: 'Book prepaid hotels through Amex Travel' },
    ],
  },
  {
    keywords: ['amex gold', 'american express gold', 'gold card'],
    base: 1,
    rates: [
      { categories: ['travel'], rate: 3, how: 'Book flights directly with the airline or through Amex Travel' },
    ],
  },
]

function ruleFor(cardName) {
  const lower = (cardName || '').toLowerCase()
  // VentureOne is a different card with different rates
  if (lower.includes('ventureone') || lower.includes('venture one')) return null
  // Rules are ordered most specific first ('venture x' before 'venture')
  return RULES.find(r => r.keywords.some(k => lower.includes(k))) || null
}

// How to book to earn `multiplier` in `category` with this card, or null if
// the rate doesn't depend on how you book.
// Returns { how, base } e.g. { how: 'Book through Chase Travel', base: 1 }
export function bookingRequirement(cardName, category, multiplier) {
  const rule = ruleFor(cardName)
  if (!rule || !(multiplier > rule.base)) return null
  const match = rule.rates.find(r => r.categories.includes(category) && r.rate === multiplier)
  if (match) return { how: match.how, base: rule.base }
  // A bonus rate in a travel category that we have no rule for: still warn
  if (category === 'travel' || category === 'hotel') {
    return { how: "This rate may depend on booking through the card's travel site. Check your card's terms", base: rule.base }
  }
  return null
}

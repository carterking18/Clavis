// Suggested rewards rates per category for popular cards.
// Values represent % cash back OR points multiplier per $1 spent.
// Source: card issuer published rates as of 2025.

const CARD_REWARDS = [
  // ── Chase ──────────────────────────────────────────────────────────────
  {
    keywords: ['sapphire reserve'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Portal bookings earn 10x hotels/cars, 5x flights'
  },
  {
    keywords: ['sapphire preferred'],
    multipliers: { dining: 3, travel: 2, hotel: 2, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: 'Portal bookings earn 5x travel; 3x online grocery'
  },
  {
    keywords: ['freedom unlimited'],
    multipliers: { dining: 3, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '5x via Chase Travel portal'
  },
  {
    keywords: ['freedom flex', 'freedom'],
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5x rotating quarterly categories; 5x via Chase Travel portal'
  },
  {
    keywords: ['ink business preferred', 'ink preferred'],
    multipliers: { dining: 1, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: '3x shipping, internet/cable/phone, ads (up to $150k/yr)'
  },
  {
    keywords: ['ink business unlimited', 'ink unlimited'],
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere'
  },
  {
    keywords: ['ink business cash', 'ink cash'],
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 1, gas: 2, streaming: 5, retail: 1, other: 1 },
    note: '5% office supplies, internet/cable/phone (up to $25k/yr)'
  },

  // ── Amex ───────────────────────────────────────────────────────────────
  {
    keywords: ['amex platinum', 'american express platinum'],
    multipliers: { dining: 1, travel: 5, hotel: 5, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5x on flights booked direct or via Amex Travel; 5x prepaid hotels via Amex Travel'
  },
  {
    keywords: ['amex gold', 'american express gold', 'gold card'],
    multipliers: { dining: 4, travel: 3, hotel: 1, grocery: 4, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '4x US supermarkets (up to $25k/yr); 3x flights direct/Amex Travel'
  },
  {
    keywords: ['amex green', 'american express green'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x transit and travel'
  },
  {
    keywords: ['blue cash preferred'],
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 6, gas: 3, streaming: 6, retail: 1, other: 1 },
    note: '6x US supermarkets (up to $6k/yr); 6x US streaming; 3x US gas & transit'
  },
  {
    keywords: ['blue cash everyday'],
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 3, gas: 2, streaming: 1, retail: 3, other: 1 },
    note: '3x US supermarkets (up to $6k/yr); 3x US online retail; 2x US gas'
  },

  // ── Capital One ────────────────────────────────────────────────────────
  {
    keywords: ['venture x'],
    multipliers: { dining: 2, travel: 5, hotel: 10, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '10x hotels/rental cars via portal; 5x flights via portal; 2x everywhere else'
  },
  {
    keywords: ['capital one venture', 'venture rewards'],
    multipliers: { dining: 2, travel: 2, hotel: 5, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '5x hotels/rental cars via portal; 2x everywhere else'
  },
  {
    keywords: ['savor one', 'savorone'],
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: '3x dining, entertainment, streaming, grocery stores'
  },
  {
    keywords: ['capital one savor'],
    multipliers: { dining: 4, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 4, retail: 1, other: 1 },
    note: '4x dining, entertainment, streaming; 3x grocery stores'
  },
  {
    keywords: ['quicksilver'],
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere'
  },

  // ── Citi ───────────────────────────────────────────────────────────────
  {
    keywords: ['citi double cash', 'double cash'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '2% everywhere (1% on purchase + 1% on payment)'
  },
  {
    keywords: ['citi premier', 'citi strata premier'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 3, gas: 3, streaming: 1, retail: 1, other: 1 },
    note: '3x restaurants, supermarkets, gas, air travel & hotels'
  },
  {
    keywords: ['citi custom cash', 'custom cash'],
    multipliers: { dining: 5, travel: 1, hotel: 1, grocery: 5, gas: 5, streaming: 5, retail: 5, other: 1 },
    note: '5% on your top eligible spend category each billing cycle (up to $500); edit to match your top category'
  },

  // ── Discover ───────────────────────────────────────────────────────────
  {
    keywords: ['discover it', 'discover'],
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5% rotating quarterly categories (gas, groceries, restaurants, etc.); edit when you know the active quarter'
  },

  // ── Wells Fargo ────────────────────────────────────────────────────────
  {
    keywords: ['wells fargo active cash', 'active cash'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '2% everywhere'
  },
  {
    keywords: ['wells fargo autograph'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 3, streaming: 3, retail: 1, other: 1 },
    note: '3x restaurants, travel, gas, streaming, transit, phone plans'
  },

  // ── Bank of America ────────────────────────────────────────────────────
  {
    keywords: ['customized cash rewards', 'bank of america customized'],
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 2, gas: 3, streaming: 1, retail: 1, other: 1 },
    note: '3% in chosen category (default: gas/dining); 2% grocery/wholesale; edit to match your chosen category'
  },
  {
    keywords: ['unlimited cash rewards', 'bank of america unlimited'],
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere (Preferred Rewards members earn more)'
  },

  // ── US Bank ────────────────────────────────────────────────────────────
  {
    keywords: ['us bank cash+', 'cash+'],
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 2, gas: 1, streaming: 5, retail: 5, other: 1 },
    note: '5% on two chosen categories; 2% on one everyday category; edit to match your chosen categories'
  },
  {
    keywords: ['us bank altitude go'],
    multipliers: { dining: 4, travel: 1, hotel: 1, grocery: 2, gas: 2, streaming: 4, retail: 1, other: 1 },
    note: '4x dining and streaming; 2x grocery, gas, EV charging'
  },
  {
    keywords: ['us bank altitude connect'],
    multipliers: { dining: 2, travel: 4, hotel: 4, grocery: 2, gas: 4, streaming: 2, retail: 1, other: 1 },
    note: '4x travel, gas, EV charging; 2x grocery, dining, streaming'
  },

  // ── Travel Co-branded ──────────────────────────────────────────────────
  {
    keywords: ['marriott bonvoy boundless'],
    multipliers: { dining: 3, travel: 2, hotel: 6, grocery: 3, gas: 3, streaming: 2, retail: 2, other: 2 },
    note: '6x Marriott hotels; 3x gas, dining, groceries; 2x everywhere else'
  },
  {
    keywords: ['marriott bonvoy bold'],
    multipliers: { dining: 2, travel: 2, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Marriott hotels; 2x travel'
  },
  {
    keywords: ['hilton honors surpass'],
    multipliers: { dining: 6, travel: 3, hotel: 12, grocery: 6, gas: 6, streaming: 3, retail: 3, other: 3 },
    note: '12x Hilton hotels; 6x restaurants, groceries, gas; 3x everywhere else'
  },
  {
    keywords: ['hilton honors aspire'],
    multipliers: { dining: 7, travel: 7, hotel: 14, grocery: 7, gas: 7, streaming: 7, retail: 3, other: 3 },
    note: '14x Hilton hotels; 7x select travel & purchases; 3x everywhere else'
  },
  {
    keywords: ['hilton honors'],
    multipliers: { dining: 5, travel: 3, hotel: 7, grocery: 5, gas: 5, streaming: 3, retail: 3, other: 3 },
    note: '7x Hilton hotels; 5x restaurants, groceries, gas; 3x everywhere else'
  },
  {
    keywords: ['delta skymiles reserve'],
    multipliers: { dining: 3, travel: 3, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Delta; 3x dining; 1x everywhere else'
  },
  {
    keywords: ['delta skymiles platinum'],
    multipliers: { dining: 3, travel: 3, hotel: 1, grocery: 3, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Delta; 3x restaurants & groceries; 1x everywhere else'
  },
  {
    keywords: ['delta skymiles gold'],
    multipliers: { dining: 2, travel: 2, hotel: 1, grocery: 2, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x Delta, restaurants & groceries; 1x everywhere else'
  },
  {
    keywords: ['united club infinite'],
    multipliers: { dining: 2, travel: 4, hotel: 2, grocery: 2, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '4x United; 2x dining, hotel, grocery'
  },
  {
    keywords: ['united explorer', 'united quest'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x United, dining & hotels; 1x everywhere else'
  },
  {
    keywords: ['southwest rapid rewards priority', 'southwest priority'],
    multipliers: { dining: 2, travel: 3, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Southwest; 2x hotel & car partners, local transit & rideshare'
  },
  {
    keywords: ['southwest rapid rewards plus', 'southwest plus', 'southwest premier', 'southwest'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x Southwest & partner purchases'
  },
  {
    keywords: ['world of hyatt', 'hyatt'],
    multipliers: { dining: 2, travel: 2, hotel: 9, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '9x Hyatt hotels; 2x dining, airlines, gyms, transit'
  },
  {
    keywords: ['ihg one rewards premier', 'ihg premier'],
    multipliers: { dining: 3, travel: 3, hotel: 26, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 3 },
    note: '26x IHG hotels; 5x on other travel; 3x dining & everything else'
  },

  // ── Tech / Retail ──────────────────────────────────────────────────────
  {
    keywords: ['amazon prime rewards', 'amazon prime visa'],
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 5, gas: 2, streaming: 1, retail: 5, other: 1 },
    note: '5% Amazon & Whole Foods; 2% restaurants, gas, drugstores'
  },
  {
    keywords: ['apple card'],
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 1 },
    note: '3% Apple purchases & select merchants; 2% Apple Pay; 1% physical card'
  },
  {
    keywords: ['costco anywhere'],
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 2, gas: 4, streaming: 1, retail: 2, other: 1 },
    note: '4% gas (up to $7k/yr); 3% restaurants & travel; 2% Costco; 1% elsewhere'
  },
]

export function getSuggestedMultipliers(name) {
  if (!name || name.length < 3) return null
  const lower = name.toLowerCase()
  for (const card of CARD_REWARDS) {
    if (card.keywords.some(k => lower.includes(k))) {
      return { multipliers: card.multipliers, note: card.note }
    }
  }
  return null
}

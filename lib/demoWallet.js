// The demo wallet: four common cards, used by the landing-page demo and by
// scripts/seed-demo.mjs, so the public demo and the demo account match.
//
// Earning rates come from the app's catalog (lib/cardRewards.js) for everyday
// categories only. Travel and hotel are left out because those rates depend
// on where you book. Credits are listed explicitly from the issuers' pages.
// Re-check everything below and bump RATES_VERIFIED when it changes.

import { getSuggestedMultipliers } from './cardRewards.js'
import { calculateResetsAt } from './cardPerks.js'

export const RATES_VERIFIED = '2026-10-11'
export const RATES_VERIFIED_LABEL = 'October 11, 2026'

export const DEMO_CATEGORIES = ['dining', 'grocery', 'gas', 'streaming', 'retail', 'other']

export const SOURCES = [
  { card: 'Amex Gold', issuer: 'American Express', url: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/' },
  { card: 'Chase Sapphire Reserve', issuer: 'Chase', url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve' },
  { card: 'Chase Freedom Unlimited', issuer: 'Chase', url: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited' },
  { card: 'Capital One Venture X', issuer: 'Capital One', url: 'https://www.capitalone.com/credit-cards/venture-x/' },
]

const CARDS = [
  {
    id: 'demo-gold', name: 'Amex Gold', last_four: '1007', balance_unit: 'points',
    perks: [
      { name: 'Uber Cash', total_amount: 10, used_amount: 10, period: 'monthly' },
      { name: 'Dining Credit (Grubhub, Five Guys, Cheesecake Factory)', total_amount: 10, used_amount: 10, period: 'monthly' },
      { name: "Dunkin' Credit", total_amount: 7, used_amount: 0, period: 'monthly' },
      // americanexpress.com: up to $50 Jan-Jun and up to $50 Jul-Dec
      { name: 'Resy Credit', total_amount: 50, used_amount: 50, period: 'semi-annual' },
    ],
  },
  {
    id: 'demo-csr', name: 'Chase Sapphire Reserve', last_four: '4421', balance_unit: 'points', opened_on: '2024-03-01',
    perks: [
      { name: 'DoorDash Restaurant Promo', total_amount: 15, used_amount: 0, period: 'monthly' },
      { name: 'Lyft Credit', total_amount: 10, used_amount: 10, period: 'monthly' },
      // chase.com: up to $300 each account anniversary year
      { name: 'Travel Credit', total_amount: 300, used_amount: 300, period: 'annual', resets_on: 'anniversary' },
    ],
  },
  { id: 'demo-cfu', name: 'Chase Freedom Unlimited', last_four: '3390', balance_unit: 'cash back', perks: [] },
  {
    id: 'demo-vx', name: 'Capital One Venture X', last_four: '8812', balance_unit: 'points', opened_on: '2023-06-01',
    perks: [
      // capitalone.com: $300 Capital One Travel credit, expires on the account anniversary
      { name: 'Capital One Travel Credit', total_amount: 300, used_amount: 0, period: 'annual', resets_on: 'anniversary' },
    ],
  },
]

// Cards in the same shape the app loads from the database
export function buildDemoWallet(now = new Date()) {
  return CARDS.map(c => {
    const s = getSuggestedMultipliers(c.name)
    return {
      ...c,
      type: 'credit',
      balance: 0,
      annual_fee: s?.annualFee || 0,
      multipliers: DEMO_CATEGORIES.map(category => ({ category, multiplier: s.multipliers[category] || 1 })),
      opened_on: c.opened_on || null,
      perks: c.perks.map((p, i) => ({ ...p, id: `${c.id}-perk-${i}`, resets_at: calculateResetsAt(p.period, now, { basis: p.resets_on, openedOn: c.opened_on }) })),
    }
  })
}

// Merchants the demo suggests. DoorDash is the non-obvious one: Sapphire
// Reserve earns less there than Amex Gold (3x vs 4x) but wins because its
// $15 monthly DoorDash promo is still unused.
export const DEMO_MERCHANTS = [
  { name: 'Chipotle', category: 'dining' },
  { name: 'DoorDash', category: 'dining' },
  { name: 'Whole Foods', category: 'grocery' },
  { name: 'Target', category: 'retail' },
  { name: 'Shell', category: 'gas' },
]

// Purchases for the seeded demo account and the landing-page insights
// [merchant, category, amount, card id, days ago]
export const DEMO_PURCHASES = [
  ['Chipotle',          'dining',     18.45, 'demo-gold', 2],
  ['Whole Foods',       'grocery',    86.12, 'demo-gold', 3],
  ['Shell',             'gas',        41.30, 'demo-vx',   5],
  ['Verizon',           'other',      85.00, 'demo-cfu',  6],
  ['Sweetgreen',        'dining',     16.95, 'demo-cfu',  9],
  ['Kroger',            'grocery',    94.60, 'demo-gold', 10],
  ['Target',            'retail',     64.88, 'demo-vx',  12],
  ['Spotify',           'streaming',  11.99, 'demo-gold', 13],
  ['Trader Joe\u2019s', 'grocery',    58.40, 'demo-cfu', 15],
  ['Exxon',             'gas',        38.75, 'demo-gold', 16],
  ['Netflix',           'streaming',  15.49, 'demo-vx',  18],
  ['Amazon',            'retail',    126.43, 'demo-cfu', 19],
  ['Blue Bottle',       'dining',      7.25, 'demo-gold', 21],
  ['Home Depot',        'retail',    132.07, 'demo-vx',  24],
  ['PG&E',              'other',     142.18, 'demo-csr', 26],
  ['Safeway',           'grocery',    72.15, 'demo-gold', 31],
  ['Shell',             'gas',        44.10, 'demo-csr', 33],
  ['Equinox',           'other',      60.00, 'demo-cfu', 35],
  ['Shake Shack',       'dining',     24.10, 'demo-csr', 39],
  ['Walgreens',         'retail',     27.80, 'demo-gold', 41],
  ['Costco Gas',        'gas',        48.66, 'demo-cfu', 44],
  ['Kroger',            'grocery',   101.34, 'demo-vx',  46],
  ['CVS',               'retail',     19.32, 'demo-csr', 48],
  ['Verizon',           'other',      85.00, 'demo-cfu', 50],
]

// A plausible year of credit use for the demo wallet: closed periods from
// January up to now. Illustrative only, and labeled as demo data on the page.
const DEMO_USE = {
  'Uber Cash': m => 1,                       // every month
  'Dining Credit': m => (m === 1 || m === 5 ? 0 : 1),
  "Dunkin' Credit": m => (m % 2 === 0 ? 1 : 0),
  'DoorDash Restaurant Promo': m => (m % 2 === 1 ? 1 : 0),
  'Lyft Credit': m => (m < 6 ? 1 : 0),
  'Resy Credit': () => 1,
}

export function demoPerkPeriods(wallet, now = new Date()) {
  const year = now.getFullYear()
  const rows = []
  for (const card of wallet) {
    for (const perk of card.perks) {
      const key = Object.keys(DEMO_USE).find(k => perk.name.startsWith(k))
      if (!key) continue
      const ends = []
      if (perk.period === 'monthly') for (let m = 0; m < now.getMonth(); m++) ends.push([new Date(year, m + 1, 0), m])
      if (perk.period === 'semi-annual' && now.getMonth() >= 6) ends.push([new Date(year, 6, 0), 0])
      for (const [end, m] of ends) {
        const used = DEMO_USE[key](m) ? perk.total_amount : 0
        rows.push({ card_id: card.id, perk_id: perk.id, period_end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`, total_amount: perk.total_amount, used_amount: used })
      }
    }
  }
  return rows
}

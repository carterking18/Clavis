// Seeds a demo account with realistic cards, credits and purchases for
// screenshots and the public demo. Runs as the demo user (same row-level
// security as the app), so it can only ever touch that account.
//
//   DEMO_EMAIL=demo@... DEMO_PASSWORD=... node --env-file=.env.local scripts/seed-demo.mjs [--reset]
//
// --reset deletes the demo account's existing cards, perks and taps first.
// Refuses to run unless the email contains "demo".

import { createClient } from '@supabase/supabase-js'
import { getSuggestedMultipliers } from '../lib/cardRewards.js'
import { getSuggestedPerks, calculateResetsAt } from '../lib/cardPerks.js'
import { dollarValuePerDollar } from '../lib/pointValues.js'

const { DEMO_EMAIL, DEMO_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = process.env
const reset = process.argv.includes('--reset')

if (!DEMO_EMAIL || !DEMO_PASSWORD) throw new Error('Set DEMO_EMAIL and DEMO_PASSWORD')
if (!DEMO_EMAIL.toLowerCase().includes('demo')) throw new Error(`Refusing to seed ${DEMO_EMAIL}: the email must contain "demo"`)

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
if (authError) throw authError
const userId = auth.user.id

const must = async (query) => {
  const { data, error } = await query
  if (error) throw error
  return data
}

const existing = await must(supabase.from('cards').select('id'))
if (existing.length && !reset) throw new Error(`Demo account already has ${existing.length} cards. Re-run with --reset to replace them.`)
if (reset) {
  await must(supabase.from('taps').delete().eq('user_id', userId))
  await must(supabase.from('perks').delete().eq('user_id', userId))
  for (const { id } of existing) await must(supabase.from('multipliers').delete().eq('card_id', id))
  await must(supabase.from('cards').delete().eq('user_id', userId))
}

// Four common cards. Rates and credits come from the app's own catalog.
// used: dollars already used of each credit, keyed by credit name prefix.
const CARDS = [
  { name: 'Amex Gold', last_four: '1007', balance_unit: 'points', network: 'AMEX', used: { 'Uber Cash': 10, 'Dining Credit': 10, "Dunkin'": 0 } },
  { name: 'Chase Sapphire Reserve', last_four: '4421', balance_unit: 'points', network: 'VISA', used: { 'Travel Credit': 300 } },
  { name: 'Chase Freedom Unlimited', last_four: '3390', balance_unit: 'cash back', network: 'VISA', used: {} },
  { name: 'Capital One Venture X', last_four: '8812', balance_unit: 'points', network: 'VISA', used: { 'Capital One Travel Credit': 300 } },
]

const created = {}
for (const c of CARDS) {
  const suggestion = getSuggestedMultipliers(c.name)
  const card = await must(supabase.from('cards').insert({
    user_id: userId, name: c.name, type: 'credit', network: c.network, last_four: c.last_four,
    balance: 0, balance_unit: c.balance_unit, annual_fee: suggestion?.annualFee || 0,
  }).select().single())
  const multipliers = Object.entries(suggestion?.multipliers || {}).map(([category, multiplier]) => ({ card_id: card.id, category, multiplier }))
  if (multipliers.length) await must(supabase.from('multipliers').insert(multipliers))
  card.multipliers = multipliers

  for (const p of getSuggestedPerks(c.name) || []) {
    const usedKey = Object.keys(c.used).find(k => p.name.startsWith(k))
    const used = usedKey ? Math.min(c.used[usedKey], p.total_amount) : 0
    await must(supabase.from('perks').insert({
      user_id: userId, card_id: card.id, name: p.name, total_amount: p.total_amount,
      used_amount: used, period: p.period, resets_at: calculateResetsAt(p.period),
    }))
  }
  created[c.name] = card
}

// Purchases over the last ~7 weeks. Mostly the right card, a few not, so
// Insights has something real (but not dramatic) to say.
const day = 86400000
const PURCHASES = [
  ['Chipotle',        'dining',    18.45, 'Amex Gold', 2],
  ['Whole Foods',     'grocery',   86.12, 'Amex Gold', 3],
  ['Shell',           'gas',       41.30, 'Capital One Venture X', 5],
  ['Delta',           'travel',   412.60, 'Chase Sapphire Reserve', 8],
  ['Sweetgreen',      'dining',    16.95, 'Chase Freedom Unlimited', 9],
  ['Target',          'retail',    64.88, 'Capital One Venture X', 12],
  ['Trader Joe’s', 'grocery', 58.40, 'Chase Freedom Unlimited', 15],
  ['Netflix',         'streaming', 15.49, 'Capital One Venture X', 18],
  ['Blue Bottle',     'dining',     7.25, 'Amex Gold', 21],
  ['Home Depot',      'retail',   132.07, 'Capital One Venture X', 24],
  ['Marriott',        'hotel',    289.00, 'Chase Sapphire Reserve', 28],
  ['Safeway',         'grocery',   72.15, 'Amex Gold', 31],
  ['Uber',            'travel',     23.80, 'Chase Freedom Unlimited', 35],
  ['Shake Shack',     'dining',    24.10, 'Amex Gold', 39],
  ['Costco Gas',      'gas',       48.66, 'Chase Freedom Unlimited', 44],
  ['CVS',             'retail',     19.32, 'Capital One Venture X', 48],
]

const rateLabel = (card, mult) => card.balance_unit === 'cash back' ? `${mult}%` : `${mult}x pts`
const taps = PURCHASES.map(([merchant, category, amount, cardName, daysAgo]) => {
  const card = created[cardName]
  const mult = card.multipliers.find(m => m.category === category)?.multiplier || 1
  return {
    user_id: userId, card_id: card.id, card_name: card.name, merchant, category, amount,
    rewards_rate: rateLabel(card, mult),
    estimated_value: Math.round(dollarValuePerDollar(card, mult) * amount * 10000) / 10000,
    tapped_at: new Date(Date.now() - daysAgo * day - 3 * 3600000).toISOString(),
  }
})
await must(supabase.from('taps').insert(taps))

console.log(`Seeded ${DEMO_EMAIL}: ${CARDS.length} cards, ${taps.length} purchases.`)
await supabase.auth.signOut()

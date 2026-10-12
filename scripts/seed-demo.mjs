// Seeds a demo account with realistic cards, credits and purchases for
// screenshots and the public demo. Runs as the demo user (same row-level
// security as the app), so it can only ever touch that account.
//
//   DEMO_EMAIL=demo@... DEMO_PASSWORD=... node --env-file=.env.local scripts/seed-demo.mjs [--reset]
//
// --reset deletes the demo account's existing cards, perks and taps first.
// Refuses to run unless the email contains "demo".

import { createClient } from '@supabase/supabase-js'
import { buildDemoWallet, DEMO_PURCHASES } from '../lib/demoWallet.js'
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

// Same four cards, credits and purchases as the landing-page demo (lib/demoWallet.js)
const wallet = buildDemoWallet()
const created = {}
for (const c of wallet) {
  const card = await must(supabase.from('cards').insert({
    user_id: userId, name: c.name, type: c.type, network: null, last_four: c.last_four,
    balance: 0, balance_unit: c.balance_unit, annual_fee: c.annual_fee,
  }).select().single())
  await must(supabase.from('multipliers').insert(c.multipliers.map(m => ({ card_id: card.id, category: m.category, multiplier: m.multiplier }))))
  if (c.perks.length) {
    await must(supabase.from('perks').insert(c.perks.map(p => ({
      user_id: userId, card_id: card.id, name: p.name, total_amount: p.total_amount,
      used_amount: p.used_amount, period: p.period, resets_at: p.resets_at,
    }))))
  }
  created[c.id] = { ...card, multipliers: c.multipliers }
}

const day = 86400000
const rateLabel = (card, mult) => card.balance_unit === 'cash back' ? `${mult}%` : `${mult}x pts`
const taps = DEMO_PURCHASES.map(([merchant, category, amount, cardId, daysAgo]) => {
  const card = created[cardId]
  const mult = card.multipliers.find(m => m.category === category)?.multiplier || 1
  return {
    user_id: userId, card_id: card.id, card_name: card.name, merchant, category, amount,
    rewards_rate: rateLabel(card, mult),
    estimated_value: Math.round(dollarValuePerDollar(card, mult) * amount * 10000) / 10000,
    tapped_at: new Date(Date.now() - daysAgo * day - 3 * 3600000).toISOString(),
  }
})
await must(supabase.from('taps').insert(taps))

console.log(`Seeded ${DEMO_EMAIL}: ${wallet.length} cards, ${taps.length} purchases.`)
await supabase.auth.signOut()

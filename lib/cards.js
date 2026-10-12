import { supabase } from './supabase'

export async function getUserCards() {
  const { data, error } = await supabase
    .from('cards')
    .select(`*, multipliers(*), perks(*)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addCard(card) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('cards')
    .insert({ ...card, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCardBalance(id, balance) {
  const { error } = await supabase
    .from('cards')
    .update({ balance })
    .eq('id', id)
  if (error) throw error
}

export async function updateCardFee(id, annualFee) {
  const { error } = await supabase
    .from('cards')
    .update({ annual_fee: annualFee })
    .eq('id', id)
  if (error) throw error
}

export async function getWeeklyDigestPref() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return true
  const { data, error } = await supabase
    .from('user_settings')
    .select('weekly_digest')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return true
  return data ? data.weekly_digest !== false : true
}

export async function setWeeklyDigestPref(enabled) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, weekly_digest: enabled }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getRecurring() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('user_settings')
    .select('recurring')
    .eq('user_id', user.id)
    .maybeSingle()
  return data?.recurring || []
}

export async function saveRecurring(list) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, recurring: list }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function submitCardCorrection({ cardName, field, currentValue, suggestedValue, note }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('card_corrections')
    .insert({
      user_id: user?.id,
      card_name: cardName,
      field,
      current_value: currentValue != null ? String(currentValue) : null,
      suggested_value: String(suggestedValue),
      note: note || null,
    })
  if (error) throw error
}

export async function deleteCard(id) {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateCardMultipliers(cardId, multipliers) {
  await supabase.from('multipliers').delete().eq('card_id', cardId)
  const rows = Object.entries(multipliers)
    .filter(([, v]) => v !== '' && v !== null)
    .map(([category, multiplier]) => ({ card_id: cardId, category, multiplier: parseFloat(multiplier) || 0 }))
  if (rows.length) {
    const { error } = await supabase.from('multipliers').insert(rows)
    if (error) throw error
  }
}

export async function addMultipliers(cardId, multipliers) {
  const rows = Object.entries(multipliers).map(([category, multiplier]) => ({
    card_id: cardId,
    category,
    multiplier: parseFloat(multiplier) || 0
  }))
  const { error } = await supabase.from('multipliers').insert(rows)
  if (error) throw error
}

// Postgres "undefined column" / PostgREST "column not in schema cache":
// the anniversary migration hasn't been run yet
function isMissingColumn(error) {
  return error && (error.code === '42703' || error.code === 'PGRST204')
}

export async function addPerk(perk) {
  const { data: { user } } = await supabase.auth.getUser()
  const insert = row => supabase.from('perks').insert({ ...row, user_id: user.id }).select().single()
  let { data, error } = await insert(perk)
  if (isMissingColumn(error) && 'resets_on' in perk) {
    // Fall back to a calendar-year credit until the migration is applied
    const { resets_on: _drop, ...rest } = perk
    ;({ data, error } = await insert(rest))
  }
  if (error) throw error
  return data
}

// The date the card account was opened ('YYYY-MM-DD'), used for anniversary resets
export async function updateCardOpenedOn(id, openedOn) {
  const { error } = await supabase.from('cards').update({ opened_on: openedOn }).eq('id', id)
  if (isMissingColumn(error)) throw new Error('Card open dates need a one-time database update (supabase/migrations/20261012_anniversary_resets.sql).')
  if (error) throw error
}

export async function updatePerk(id, updates) {
  const { error } = await supabase
    .from('perks')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deletePerk(id) {
  const { error } = await supabase
    .from('perks')
    .delete()
    .eq('id', id)
  if (error) throw error
}
// Point valuation overrides live in the auth user's metadata
// ({ point_values: { [cardId]: centsPerPoint } }), so no table change is needed.
export async function savePointValueOverrides(map) {
  const { data, error } = await supabase.auth.updateUser({ data: { point_values: map } })
  if (error) throw error
  return data.user?.user_metadata?.point_values || {}
}

// ── Credit history (perk_periods) ──────────────────────────
// Missing table (migration 20261013_perk_periods.sql not run yet)
function isMissingTable(error) {
  return error && (error.code === '42P01' || error.code === 'PGRST205')
}

// Record how much of a credit was used in the period that just ended
export async function recordPerkPeriod(perk, cardId) {
  const { error } = await supabase.from('perk_periods').insert({
    perk_id: String(perk.id), card_id: String(cardId), perk_name: perk.name,
    period_end: String(perk.resets_at).slice(0, 10),
    total_amount: perk.total_amount || 0, used_amount: perk.used_amount || 0,
  })
  if (error && !isMissingTable(error)) throw error
}

// Credit periods that ended on or after `since` ('YYYY-MM-DD'); [] if unavailable
export async function getPerkPeriods(since) {
  const { data, error } = await supabase.from('perk_periods').select('*').gte('period_end', since)
  if (error) return []
  return data || []
}

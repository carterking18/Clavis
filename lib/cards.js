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

export async function deleteCard(id) {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)
  if (error) throw error
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

export async function addPerk(perk) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('perks')
    .insert({ ...perk, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
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
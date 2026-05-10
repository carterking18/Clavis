import { supabase } from './supabase'

export async function logTap({ card_id, card_name, merchant, category, amount, rewards_rate, estimated_value }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('taps').insert({
    user_id: user.id,
    card_id: card_id || null,
    card_name,
    merchant: merchant || null,
    category: category || null,
    amount: amount || 0,
    rewards_rate: rewards_rate || null,
    estimated_value: estimated_value || 0,
  })
  if (error) console.error('logTap error:', error)
}

export async function getTaps(limit = 100) {
  const { data, error } = await supabase
    .from('taps')
    .select('*')
    .order('tapped_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function deleteTap(id) {
  const { error } = await supabase.from('taps').delete().eq('id', id)
  if (error) throw error
}

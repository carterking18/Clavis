import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '../../../../lib/rateLimit'

export async function POST(request) {
  // 5 attempts per IP per 15 minutes
  const { limited, headers } = rateLimit(request, { limit: 5, windowMs: 15 * 60_000 })
  if (limited) return Response.json({ error: 'Too many requests — please wait and try again.' }, { status: 429, headers })

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Verify the token belongs to a real, currently-authenticated user —
  // never trust a user id passed from the client for a destructive action.
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  try {
    // Delete dependent rows first (cards' children don't carry user_id).
    const { data: cards, error: cardsErr } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('user_id', userId)
    if (cardsErr) throw cardsErr

    const cardIds = (cards || []).map(c => c.id)
    if (cardIds.length > 0) {
      const { error: multErr } = await supabaseAdmin.from('multipliers').delete().in('card_id', cardIds)
      if (multErr) throw multErr
    }

    // perks carry user_id directly (see addPerk in lib/cards.js)
    const { error: perksErr } = await supabaseAdmin.from('perks').delete().eq('user_id', userId)
    if (perksErr) throw perksErr

    const { error: tapsErr } = await supabaseAdmin.from('taps').delete().eq('user_id', userId)
    if (tapsErr) throw tapsErr

    const { error: cardsDelErr } = await supabaseAdmin.from('cards').delete().eq('user_id', userId)
    if (cardsDelErr) throw cardsDelErr

    const { error: settingsErr } = await supabaseAdmin.from('user_settings').delete().eq('user_id', userId)
    if (settingsErr) throw settingsErr

    const { error: correctionsErr } = await supabaseAdmin.from('card_corrections').delete().eq('user_id', userId)
    if (correctionsErr) throw correctionsErr

    // Finally, remove the auth user itself — irreversible.
    const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteUserErr) throw deleteUserErr
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

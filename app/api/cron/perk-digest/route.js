import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

function unsubscribeSig(userId) {
  return crypto.createHmac('sha256', process.env.CRON_SECRET || 'clavis-dev-secret')
    .update(userId)
    .digest('hex')
    .slice(0, 32)
}

function buildEmailHtml({ expiringSoon, unused, unsubscribeUrl }) {
  const expiringHtml = expiringSoon.map(p => {
    const daysLeft = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
    const remaining = p.total_amount - p.used_amount
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0ec;font-size:14px;color:#1a1a1a;font-weight:600">${p.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0ec;font-size:14px;color:#854F0B;text-align:right">$${remaining} left · ${daysLeft}d remaining</td>
    </tr>`
  }).join('')

  const unusedHtml = unused.map(p => {
    const remaining = p.total_amount - p.used_amount
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0ec;font-size:14px;color:#1a1a1a;font-weight:600">${p.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0ec;font-size:14px;color:#1D9E75;text-align:right">$${remaining} available</td>
    </tr>`
  }).join('')

  return `
    <div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2rem 1rem">
      <div style="font-size:22px;font-weight:700;margin-bottom:4px">Cla<span style="color:#c8a84b">vis</span></div>
      <div style="font-size:13px;color:#888;margin-bottom:2rem">Your weekly perk summary</div>
      ${expiringSoon.length > 0 ? `
        <div style="font-size:15px;font-weight:600;margin-bottom:12px;color:#1a1a1a">Expiring soon</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:2rem">${expiringHtml}</table>
      ` : ''}
      ${unused.length > 0 ? `
        <div style="font-size:15px;font-weight:600;margin-bottom:12px;color:#1a1a1a">Available credits</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:2rem">${unusedHtml}</table>
      ` : ''}
      <div style="font-size:12px;color:#bbb;margin-top:2rem;border-top:1px solid #f0f0ec;padding-top:1rem">
        Clavis · Your data is never sold or shared · <a href="${unsubscribeUrl}" style="color:#bbb">Unsubscribe from weekly summaries</a>
      </div>
    </div>
  `
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://claviscard.com'
  const sent = []
  const skipped = []
  const errors = []

  try {
    // Page through all users (admin API)
    let page = 1
    const perPage = 200
    let allUsers = []
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      allUsers = allUsers.concat(data.users)
      if (data.users.length < perPage) break
      page++
    }

    // Opt-out list (default = subscribed)
    const { data: settingsRows } = await supabase.from('user_settings').select('user_id, weekly_digest')
    const optedOut = new Set((settingsRows || []).filter(r => r.weekly_digest === false).map(r => r.user_id))

    for (const user of allUsers) {
      if (!user.email) continue
      if (optedOut.has(user.id)) { skipped.push({ email: user.email, reason: 'unsubscribed' }); continue }

      const { data: cards } = await supabase
        .from('cards')
        .select('*, perks(*)')
        .eq('user_id', user.id)
      const perks = (cards || []).flatMap(c => c.perks || [])
      if (!perks.length) { skipped.push({ email: user.email, reason: 'no perks tracked' }); continue }

      const expiringSoon = perks.filter(p => {
        if (!p.resets_at) return false
        const daysLeft = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
        return daysLeft <= 14 && daysLeft > 0
      })
      const unused = perks.filter(p => p.used_amount < p.total_amount)

      if (expiringSoon.length === 0 && unused.length === 0) { skipped.push({ email: user.email, reason: 'nothing to report' }); continue }

      const unsubscribeUrl = `${origin}/api/unsubscribe?uid=${encodeURIComponent(user.id)}&sig=${unsubscribeSig(user.id)}`

      try {
        await resend.emails.send({
          from: 'Clavis <alerts@claviscard.com>',
          to: user.email,
          subject: 'Your Clavis perk summary',
          html: buildEmailHtml({ expiringSoon, unused, unsubscribeUrl }),
        })
        sent.push(user.email)
      } catch (e) {
        errors.push({ email: user.email, error: e.message })
      }
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }

  return Response.json({ sent: sent.length, skipped: skipped.length, errors })
}

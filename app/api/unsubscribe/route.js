import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { rateLimit } from '../../../lib/rateLimit'

function expectedSig(userId) {
  return crypto.createHmac('sha256', process.env.CRON_SECRET || 'clavis-dev-secret')
    .update(userId)
    .digest('hex')
    .slice(0, 32)
}

function page({ title, message, ok }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clavis</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAFAFA;color:#111827">
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">
    <div style="width:100%;max-width:420px">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;color:#9CA3AF;margin-bottom:24px">CLAVIS</div>
      <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.01em;margin-bottom:10px">${title}</h1>
      <p style="font-size:14px;color:#6B7280;line-height:1.6;margin-bottom:8px">${message}</p>
      ${ok ? `<a href="https://claviscard.com/dashboard" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#111827;color:#fff;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none">Back to Clavis</a>` : ''}
    </div>
  </div>
</body></html>`
}

export async function GET(request) {
  const { limited, headers } = rateLimit(request, { limit: 20, windowMs: 60 * 60_000 })
  if (limited) return Response.json({ error: 'Too many requests.' }, { status: 429, headers })

  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')
  const sig = searchParams.get('sig')

  if (!uid || !sig || sig !== expectedSig(uid)) {
    return new Response(page({ title: 'Link not valid', message: 'This unsubscribe link is invalid or expired. You can manage email preferences from inside the app.', ok: false }), {
      status: 400, headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(page({ title: 'Something went wrong', message: 'We could not process your request right now. Please try again later.', ok: false }), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: uid, weekly_digest: false }, { onConflict: 'user_id' })

  if (error) {
    return new Response(page({ title: 'Something went wrong', message: 'We could not update your preferences. Please try again later.', ok: false }), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    })
  }

  return new Response(page({ title: "You're unsubscribed", message: "You won't receive weekly perk summary emails anymore. You can re-enable them anytime from your account settings in Clavis.", ok: true }), {
    status: 200, headers: { 'Content-Type': 'text/html' },
  })
}

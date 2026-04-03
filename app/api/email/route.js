import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const { email, perks } = await request.json()

  const expiringSoon = perks.filter(p => {
    if (!p.resets_at) return false
    const daysLeft = Math.ceil((new Date(p.resets_at) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 14 && daysLeft > 0
  })

  const unused = perks.filter(p => p.used_amount < p.total_amount)

  if (expiringSoon.length === 0 && unused.length === 0) {
    return Response.json({ message: 'No alerts to send' })
  }

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

  await resend.emails.send({
    from: 'Clavis <alerts@claviscard.com>',
    to: email,
    subject: 'Your Clavis perk summary',
    html: `
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
          Clavis · Your data is never sold or shared · <a href="#" style="color:#bbb">Unsubscribe</a>
        </div>
      </div>
    `
  })

  return Response.json({ message: 'Email sent' })
}
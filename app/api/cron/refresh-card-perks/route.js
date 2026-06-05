import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `You are a credit card benefits expert. Given a credit card name, return its current benefits as structured JSON.

Return ONLY valid JSON in this exact shape:
{
  "perks": [
    { "name": "string", "total_amount": number, "period": "monthly" | "quarterly" | "semi-annual" | "annual" }
  ],
  "multipliers": {
    "dining": number,
    "travel": number,
    "hotel": number,
    "grocery": number,
    "gas": number,
    "streaming": number,
    "retail": number,
    "other": number
  },
  "note": "brief one-line description of key earning highlights"
}

Rules:
- perks: only include credits with a concrete dollar value (e.g. $10/month dining credit, $300 travel credit). Exclude free nights, lounge memberships, purchase protections unless they have a fixed dollar value.
- multipliers: use the earn rate number (3 for 3x points or 3% cash back, 1 for 1x/1%). Use the highest applicable rate for each category.
- If the card doesn't exist or you're not confident, return null (not JSON, literally the word null).
- Do not include markdown, explanation, or any text outside the JSON.`

// Canonical card names to refresh (one representative name per card)
const CARDS_TO_REFRESH = [
  'Amex Platinum Card',
  'Amex Gold Card',
  'Amex Green Card',
  'Amex Blue Cash Preferred',
  'Chase Sapphire Reserve',
  'Chase Sapphire Preferred',
  'Capital One Venture X',
  'Citi Strata Premier',
  'Wells Fargo Autograph Journey',
  'Hilton Honors Aspire',
  'Hilton Honors Surpass',
  'Delta SkyMiles Reserve',
  'Delta SkyMiles Platinum',
  'Marriott Bonvoy Brilliant',
  'Marriott Bonvoy Boundless',
  'World of Hyatt Card',
  'United Explorer Card',
  'United Club Infinite Card',
  'Southwest Rapid Rewards Priority',
  'IHG One Rewards Premier',
  'Chase Ink Business Preferred',
  'Amazon Prime Visa',
]

export async function GET(request) {
  // Require a secret header so this can't be called anonymously
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const client = new Anthropic()
  const results = []
  const errors = []

  for (const cardName of CARDS_TO_REFRESH) {
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Credit card: "${cardName}"` }],
      })

      const raw = message.content[0]?.text?.trim()
      if (!raw || raw === 'null') {
        errors.push({ card: cardName, error: 'no data returned' })
        continue
      }

      const parsed = JSON.parse(raw)
      const { error } = await supabase
        .from('perk_catalog')
        .upsert({
          card_name: cardName.toLowerCase(),
          perks: parsed.perks || [],
          multipliers: parsed.multipliers || null,
          note: parsed.note || null,
          refreshed_at: new Date().toISOString(),
        }, { onConflict: 'card_name' })

      if (error) throw error
      results.push(cardName)
    } catch (err) {
      errors.push({ card: cardName, error: String(err.message || err) })
    }
  }

  return Response.json({ refreshed: results.length, errors, timestamp: new Date().toISOString() })
}

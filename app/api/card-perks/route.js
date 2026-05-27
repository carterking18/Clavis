import Anthropic from '@anthropic-ai/sdk'
import { getSuggestedPerks } from '../../../lib/cardPerks'
import { getSuggestedMultipliers } from '../../../lib/cardRewards'

const client = new Anthropic()

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

export async function POST(request) {
  const { name } = await request.json()
  if (!name || name.trim().length < 3) {
    return Response.json({ error: 'Card name too short' }, { status: 400 })
  }

  // Check internal database first — faster and free
  const knownPerks = getSuggestedPerks(name)
  const knownMults = getSuggestedMultipliers(name)
  if (knownPerks || knownMults) {
    return Response.json({
      perks: knownPerks || [],
      multipliers: knownMults?.multipliers || null,
      note: knownMults?.note || null,
      source: 'database',
    })
  }

  // Fall back to Claude for unknown cards
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ perks: null, multipliers: null, note: null, source: 'claude' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Credit card: "${name.trim()}"`,
        },
      ],
    })

    const raw = message.content[0]?.text?.trim()
    if (!raw || raw === 'null') {
      return Response.json({ perks: null, multipliers: null, note: null, source: 'claude' })
    }

    const parsed = JSON.parse(raw)
    return Response.json({
      perks: parsed.perks || [],
      multipliers: parsed.multipliers || null,
      note: parsed.note || null,
      source: 'claude',
    })
  } catch (err) {
    console.error('card-perks API error:', err)
    return Response.json({ error: 'Failed to fetch card data' }, { status: 500 })
  }
}

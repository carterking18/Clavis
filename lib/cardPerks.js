// Known perks/credits for popular cards.
// resets_at is calculated dynamically at runtime based on period.

const CARD_PERKS = [
  // ── Amex Platinum ─────────────────────────────────────────────────────
  {
    keywords: ['amex platinum', 'american express platinum'],
    perks: [
      { name: 'Airline Fee Credit', total_amount: 200, period: 'annual' },
      { name: 'Uber Cash', total_amount: 15, period: 'monthly' },
      { name: 'Digital Entertainment Credit', total_amount: 20, period: 'monthly' },
      { name: 'Walmart+ Credit', total_amount: 12.95, period: 'monthly' },
      { name: 'Saks Fifth Avenue Credit', total_amount: 50, period: 'semi-annual' },
      { name: 'CLEAR Plus Credit', total_amount: 189, period: 'annual' },
      { name: 'Fine Hotels + Resorts Credit', total_amount: 200, period: 'annual' },
      { name: 'Equinox Credit', total_amount: 300, period: 'annual' },
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Amex Gold ─────────────────────────────────────────────────────────
  {
    keywords: ['amex gold', 'american express gold', 'gold card'],
    perks: [
      { name: 'Dining Credit', total_amount: 10, period: 'monthly' },
      { name: 'Uber Cash', total_amount: 10, period: 'monthly' },
      { name: 'Dunkin\' Credit', total_amount: 7, period: 'monthly' },
      { name: 'Hotel Credit (Amex Travel)', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Amex Green ────────────────────────────────────────────────────────
  {
    keywords: ['amex green', 'american express green'],
    perks: [
      { name: 'CLEAR Plus Credit', total_amount: 189, period: 'annual' },
      { name: 'LoungeBuddy Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Amex Blue Cash Preferred ──────────────────────────────────────────
  {
    keywords: ['blue cash preferred'],
    perks: [
      { name: 'Disney Bundle Credit', total_amount: 7, period: 'monthly' },
    ]
  },

  // ── Chase Sapphire Reserve ────────────────────────────────────────────
  {
    keywords: ['sapphire reserve'],
    perks: [
      { name: 'Travel Credit', total_amount: 300, period: 'annual' },
      { name: 'DoorDash DashPass Credit', total_amount: 5, period: 'monthly' },
      { name: 'Instacart+ Credit', total_amount: 15, period: 'monthly' },
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
      { name: 'Peloton Credit', total_amount: 60, period: 'annual' },
    ]
  },

  // ── Chase Sapphire Preferred ──────────────────────────────────────────
  {
    keywords: ['sapphire preferred'],
    perks: [
      { name: 'Hotel Credit (Chase Travel)', total_amount: 50, period: 'annual' },
    ]
  },

  // ── Capital One Venture X ─────────────────────────────────────────────
  {
    keywords: ['venture x'],
    perks: [
      { name: 'Capital One Travel Credit', total_amount: 300, period: 'annual' },
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Citi Premier ──────────────────────────────────────────────────────
  {
    keywords: ['citi premier', 'citi strata premier'],
    perks: [
      { name: 'Hotel Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Wells Fargo Autograph Journey ─────────────────────────────────────
  {
    keywords: ['autograph journey'],
    perks: [
      { name: 'Airline Credit', total_amount: 50, period: 'annual' },
    ]
  },

  // ── Hilton Honors Aspire ──────────────────────────────────────────────
  {
    keywords: ['hilton honors aspire'],
    perks: [
      { name: 'Hilton Resort Credit', total_amount: 100, period: 'semi-annual' },
      { name: 'Airline Fee Credit', total_amount: 200, period: 'annual' },
      { name: 'Property Credit (Eligible Stays)', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Hilton Honors Surpass ─────────────────────────────────────────────
  {
    keywords: ['hilton honors surpass'],
    perks: [
      { name: 'Free Night Reward', total_amount: 0, period: 'annual' },
    ]
  },

  // ── Delta SkyMiles Reserve ────────────────────────────────────────────
  {
    keywords: ['delta skymiles reserve'],
    perks: [
      { name: 'Resy Dining Credit', total_amount: 20, period: 'monthly' },
      { name: 'Rideshare Credit', total_amount: 10, period: 'monthly' },
    ]
  },

  // ── Delta SkyMiles Platinum ───────────────────────────────────────────
  {
    keywords: ['delta skymiles platinum'],
    perks: [
      { name: 'Resy Dining Credit', total_amount: 10, period: 'monthly' },
      { name: 'Rideshare Credit', total_amount: 10, period: 'monthly' },
    ]
  },

  // ── Marriott Bonvoy Brilliant ─────────────────────────────────────────
  {
    keywords: ['marriott bonvoy brilliant'],
    perks: [
      { name: 'Marriott Dining Credit', total_amount: 25, period: 'monthly' },
      { name: 'Property Credit (Eligible Stays)', total_amount: 100, period: 'annual' },
      { name: 'Free Night Award', total_amount: 0, period: 'annual' },
    ]
  },

  // ── Marriott Bonvoy Boundless ─────────────────────────────────────────
  {
    keywords: ['marriott bonvoy boundless'],
    perks: [
      { name: 'Free Night Award', total_amount: 0, period: 'annual' },
    ]
  },

  // ── World of Hyatt ────────────────────────────────────────────────────
  {
    keywords: ['world of hyatt', 'hyatt'],
    perks: [
      { name: 'Hyatt Property Credit', total_amount: 50, period: 'semi-annual' },
      { name: 'Free Night Award', total_amount: 0, period: 'annual' },
    ]
  },

  // ── United Explorer ───────────────────────────────────────────────────
  {
    keywords: ['united explorer'],
    perks: [
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
      { name: 'IHG Dining Credit', total_amount: 0, period: 'annual' },
    ]
  },

  // ── United Club Infinite ──────────────────────────────────────────────
  {
    keywords: ['united club infinite'],
    perks: [
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Southwest Priority ────────────────────────────────────────────────
  {
    keywords: ['southwest rapid rewards priority', 'southwest priority'],
    perks: [
      { name: 'Southwest Travel Credit', total_amount: 75, period: 'annual' },
      { name: 'In-Flight Wi-Fi Credits', total_amount: 75, period: 'annual' },
    ]
  },

  // ── IHG Premier ──────────────────────────────────────────────────────
  {
    keywords: ['ihg one rewards premier', 'ihg premier'],
    perks: [
      { name: 'United TravelBank Credit', total_amount: 50, period: 'annual' },
    ]
  },

  // ── Chase Ink Business Preferred ─────────────────────────────────────
  {
    keywords: ['ink business preferred', 'ink preferred'],
    perks: [
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Amazon Prime Visa ─────────────────────────────────────────────────
  {
    keywords: ['amazon prime rewards', 'amazon prime visa'],
    perks: [
      { name: 'Amazon Prime Credit', total_amount: 14.99, period: 'monthly' },
    ]
  },

  // ── Amex Business Gold ────────────────────────────────────────────────
  {
    keywords: ['amex business gold', 'american express business gold'],
    perks: [
      { name: 'Hotel Collection Credit', total_amount: 150, period: 'annual' },
    ]
  },

  // ── Amex Business Platinum ────────────────────────────────────────────
  {
    keywords: ['amex business platinum', 'american express business platinum'],
    perks: [
      { name: 'Dell Technologies Credit', total_amount: 200, period: 'semi-annual' },
      { name: 'Indeed Credit', total_amount: 360, period: 'annual' },
      { name: 'Adobe Creative Solutions Credit', total_amount: 150, period: 'annual' },
      { name: 'Wireless Telephone Credit', total_amount: 10, period: 'monthly' },
      { name: 'Global Entry / TSA PreCheck Credit', total_amount: 100, period: 'annual' },
      { name: 'CLEAR Plus Credit', total_amount: 189, period: 'annual' },
    ]
  },

  // ── Bilt Mastercard ───────────────────────────────────────────────────
  {
    keywords: ['bilt rewards', 'bilt mastercard'],
    perks: [
      { name: 'Lyft Credit (Rent Day)', total_amount: 5, period: 'monthly' },
    ]
  },

  // ── Bank of America Premium Rewards ───────────────────────────────────
  {
    keywords: ['bank of america premium rewards', 'boa premium rewards'],
    perks: [
      { name: 'Travel Credit', total_amount: 100, period: 'annual' },
      { name: 'TSA PreCheck / Global Entry Credit', total_amount: 100, period: 'annual' },
    ]
  },

  // ── Marriott Bonvoy Brilliant ─────────────────────────────────────────
  // (already defined above — keeping for completeness, first match wins)

  // ── Delta SkyMiles Reserve ────────────────────────────────────────────
  // (already defined above)

  // ── JetBlue Plus ─────────────────────────────────────────────────────
  {
    keywords: ['jetblue plus'],
    perks: [
      { name: 'JetBlue Vacation Credit', total_amount: 100, period: 'annual' },
    ]
  },
]

export function getSuggestedPerks(name) {
  if (!name || name.length < 3) return null
  const lower = name.toLowerCase()
  for (const card of CARD_PERKS) {
    if (card.keywords.some(k => lower.includes(k))) {
      return card.perks
    }
  }
  return null
}

export function calculateResetsAt(period) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === 'monthly') {
    return new Date(year, month + 1, 0).toISOString().split('T')[0]
  }
  if (period === 'semi-annual') {
    return month < 6
      ? new Date(year, 5, 30).toISOString().split('T')[0]
      : new Date(year, 11, 31).toISOString().split('T')[0]
  }
  if (period === 'annual') {
    return new Date(year, 11, 31).toISOString().split('T')[0]
  }
  if (period === 'quarterly') {
    const quarterEnd = [2, 5, 8, 11] // Mar, Jun, Sep, Dec
    const endMonth = quarterEnd.find(m => m >= month) ?? 11
    return new Date(year, endMonth + 1, 0).toISOString().split('T')[0]
  }
  // Fallback: end of current year
  return new Date(year, 11, 31).toISOString().split('T')[0]
}

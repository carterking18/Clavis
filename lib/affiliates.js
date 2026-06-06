// Affiliate link configuration for card recommendations.
// Replace placeholder URLs with your actual tracked links from each program.
//
// Programs to sign up for:
//   - CardRatings:        https://www.cardratings.com/affiliates
//   - Credit Karma:       https://www.creditkarma.com/affiliate-program
//   - Commission Junction: https://www.cj.com  (Chase, Amex, Capital One all available)
//   - Bankrate:           https://www.bankrate.com/partnerships
//   - Direct issuer programs via their partner portals
//
// Payout tiers (approximate, varies by program):
//   'student'   — $25–$75 per approved application
//   'no-fee'    — $50–$100 per approved application
//   'mid'       — $75–$150 per approved application
//   'premium'   — $150–$250+ per approved application

const AFFILIATE_LINKS = {
  // ── Student & Starter ─────────────────────────────────────────────────
  'Discover it Student': {
    url: 'https://refer.discover.com/s/clavis-discover-student', // replace with your tracked link
    cta: 'Apply — No annual fee',
    tier: 'student',
    program: 'Discover',
  },
  'Capital One SavorOne Student': {
    url: 'https://capital.one/clavis-savorone-student', // replace
    cta: 'Apply — No annual fee',
    tier: 'student',
    program: 'Capital One',
  },
  'Capital One Quicksilver Student': {
    url: 'https://capital.one/clavis-quicksilver-student', // replace
    cta: 'Apply — No annual fee',
    tier: 'student',
    program: 'Capital One',
  },
  'Petal 2 Visa': {
    url: 'https://www.petalcard.com/clavis', // replace
    cta: 'Apply — No fees ever',
    tier: 'student',
    program: 'Petal',
  },
  'Deserve EDU Mastercard': {
    url: 'https://www.deserve.com/clavis', // replace
    cta: 'Apply — No SSN required',
    tier: 'student',
    program: 'Deserve',
  },

  // ── No-fee Everyday ───────────────────────────────────────────────────
  'Chase Freedom Unlimited': {
    url: 'https://creditcards.chase.com/clavis-cfu', // replace
    cta: 'Apply — No annual fee',
    tier: 'no-fee',
    program: 'Chase',
  },
  'Capital One SavorOne': {
    url: 'https://capital.one/clavis-savorone', // replace
    cta: 'Apply — No annual fee',
    tier: 'no-fee',
    program: 'Capital One',
  },
  'Citi Double Cash': {
    url: 'https://www.citi.com/clavis-doublecash', // replace
    cta: 'Apply — 2% on everything',
    tier: 'no-fee',
    program: 'Citi',
  },
  'Wells Fargo Autograph': {
    url: 'https://www.wellsfargo.com/clavis-autograph', // replace
    cta: 'Apply — No annual fee',
    tier: 'no-fee',
    program: 'Wells Fargo',
  },
  'Bilt Mastercard': {
    url: 'https://bilt.page/r/clavis', // replace
    cta: 'Apply — No annual fee',
    tier: 'no-fee',
    program: 'Bilt',
  },

  // ── Mid-tier ──────────────────────────────────────────────────────────
  'Chase Sapphire Preferred': {
    url: 'https://creditcards.chase.com/clavis-csp', // replace
    cta: 'Apply — $95/yr',
    tier: 'mid',
    program: 'Chase',
  },
  'Amex Gold Card': {
    url: 'https://americanexpress.com/clavis-gold', // replace
    cta: 'Apply — $250/yr',
    tier: 'mid',
    program: 'American Express',
  },
  'Capital One Venture': {
    url: 'https://capital.one/clavis-venture', // replace
    cta: 'Apply — $95/yr',
    tier: 'mid',
    program: 'Capital One',
  },

  // ── Premium ───────────────────────────────────────────────────────────
  'Capital One Venture X': {
    url: 'https://capital.one/clavis-venturex', // replace
    cta: 'Apply — $395/yr',
    tier: 'premium',
    program: 'Capital One',
  },
  'Chase Sapphire Reserve': {
    url: 'https://creditcards.chase.com/clavis-csr', // replace
    cta: 'Apply — $550/yr',
    tier: 'premium',
    program: 'Chase',
  },
  'Amex Platinum Card': {
    url: 'https://americanexpress.com/clavis-platinum', // replace
    cta: 'Apply — $695/yr',
    tier: 'premium',
    program: 'American Express',
  },
}

export function getAffiliateLink(cardName) {
  return AFFILIATE_LINKS[cardName] || null
}

// Tier badge colors for UI
export const TIER_STYLES = {
  student:  { bg: 'rgba(91,143,255,0.12)', color: '#5b8fff', label: 'Student-friendly' },
  'no-fee': { bg: 'rgba(29,184,122,0.1)',  color: '#1db87a', label: 'No annual fee'    },
  mid:      { bg: 'rgba(201,162,39,0.1)',  color: '#c9a227', label: 'Mid-tier'         },
  premium:  { bg: 'rgba(217,82,82,0.1)',   color: '#d95252', label: 'Premium'          },
}

export const AFFILIATE_DISCLOSURE = "Clavis may earn a commission if you apply for a card through our links. This never influences which cards we recommend — rankings are based entirely on your spending data."

const CARD_DESIGNS = [
  // Chase
  { keywords: ['sapphire reserve'], gradient: ['#0a2a4a', '#0d4a7a'], network: 'VISA', chip: true },
  { keywords: ['sapphire preferred', 'sapphire'], gradient: ['#1a4a6a', '#1a6eb5'], network: 'VISA', chip: true },
  { keywords: ['freedom unlimited'], gradient: ['#185FA5', '#2471a3'], network: 'VISA', chip: true },
  { keywords: ['freedom flex', 'freedom'], gradient: ['#1a5fa5', '#3498db'], network: 'VISA', chip: true },
  { keywords: ['ink business', 'ink preferred', 'ink cash', 'ink unlimited'], gradient: ['#0a2a5a', '#1a4a8a'], network: 'VISA', chip: true },
  { keywords: ['chase'], gradient: ['#115FA5', '#1a82c4'], network: 'VISA', chip: true },

  // Amex
  { keywords: ['platinum'], gradient: ['#8e9eab', '#b8c5cc'], network: 'AMEX', chip: true },
  { keywords: ['amex gold', 'american express gold', 'gold card'], gradient: ['#b8860b', '#c8a84b'], network: 'AMEX', chip: true },
  { keywords: ['amex green', 'american express green', 'green card'], gradient: ['#1a6b3c', '#27ae60'], network: 'AMEX', chip: true },
  { keywords: ['blue cash preferred', 'blue cash everyday', 'blue cash'], gradient: ['#0a4a8a', '#1a6eb5'], network: 'AMEX', chip: true },
  { keywords: ['blue business', 'amex business'], gradient: ['#003087', '#0057a8'], network: 'AMEX', chip: true },
  { keywords: ['amex', 'american express'], gradient: ['#006fcf', '#0085e6'], network: 'AMEX', chip: true },

  // Capital One
  { keywords: ['venture x'], gradient: ['#0d1b2a', '#1b3a5c'], network: 'VISA', chip: true },
  { keywords: ['venture'], gradient: ['#1a2a4a', '#2c4a7c'], network: 'VISA', chip: true },
  { keywords: ['savor one', 'savorone'], gradient: ['#5a0a0a', '#8a1a1a'], network: 'MC', chip: true },
  { keywords: ['savor'], gradient: ['#4a0a0a', '#7a1a1a'], network: 'MC', chip: true },
  { keywords: ['quicksilver'], gradient: ['#3a3a3a', '#5a5a5a'], network: 'MC', chip: true },
  { keywords: ['capital one'], gradient: ['#1a3a6b', '#2a5a9b'], network: 'MC', chip: true },

  // Citi
  { keywords: ['double cash'], gradient: ['#0a2a5a', '#1a4a8a'], network: 'MC', chip: true },
  { keywords: ['citi premier', 'premier'], gradient: ['#2a0a5a', '#4a1a9a'], network: 'MC', chip: true },
  { keywords: ['custom cash'], gradient: ['#0a4a5a', '#1a7a8a'], network: 'MC', chip: true },
  { keywords: ['citi'], gradient: ['#003b70', '#0057a8'], network: 'MC', chip: true },

  // Discover
  { keywords: ['discover it', 'discover'], gradient: ['#d06000', '#f07800'], network: 'DISC', chip: true },

  // Wells Fargo
  { keywords: ['active cash', 'wells fargo'], gradient: ['#aa0000', '#cc2222'], network: 'VISA', chip: true },

  // Bank of America
  { keywords: ['customized cash', 'unlimited cash rewards', 'bank of america', 'bofa'], gradient: ['#aa0000', '#cc2222'], network: 'VISA', chip: true },

  // US Bank
  { keywords: ['cash+', 'altitude', 'us bank'], gradient: ['#bb2200', '#dd3300'], network: 'VISA', chip: true },

  // Travel co-branded
  { keywords: ['marriott bonvoy boundless', 'marriott bonvoy bold', 'marriott bonvoy', 'bonvoy'], gradient: ['#0a2040', '#6a4a10'], network: 'VISA', chip: true },
  { keywords: ['hilton honors surpass', 'hilton honors aspire', 'hilton honors', 'hilton'], gradient: ['#0a2a5a', '#1a4a7a'], network: 'AMEX', chip: true },
  { keywords: ['delta skymiles reserve', 'delta skymiles platinum', 'delta skymiles gold', 'delta skymiles', 'delta'], gradient: ['#1a3a6b', '#2a5a9b'], network: 'AMEX', chip: true },
  { keywords: ['united explorer', 'united quest', 'united club', 'united'], gradient: ['#0a1a3a', '#1a3a6b'], network: 'VISA', chip: true },
  { keywords: ['southwest rapid rewards priority', 'southwest rapid rewards', 'southwest'], gradient: ['#304cb2', '#1a2d6b'], network: 'VISA', chip: true },
  { keywords: ['world of hyatt', 'hyatt'], gradient: ['#1a2a4a', '#2a4a7a'], network: 'VISA', chip: true },
  { keywords: ['ihg one rewards', 'ihg'], gradient: ['#1a5a3a', '#2a8a5a'], network: 'MC', chip: true },

  // Tech / Fintech
  { keywords: ['apple card', 'apple'], gradient: ['#1c1c1e', '#3a3a3c'], network: 'MC', chip: false },
  { keywords: ['amazon prime rewards', 'amazon'], gradient: ['#232f3e', '#37475a'], network: 'VISA', chip: true },
  { keywords: ['paypal cashback', 'paypal'], gradient: ['#003087', '#009cde'], network: 'MC', chip: true },

  // Retail
  { keywords: ['target redcard', 'target'], gradient: ['#cc0000', '#e63333'], network: 'MC', chip: true },
  { keywords: ['walmart'], gradient: ['#0071ce', '#1a8ae0'], network: 'MC', chip: true },
  { keywords: ['costco anywhere', 'costco'], gradient: ['#005dab', '#0074d9'], network: 'VISA', chip: true },
  { keywords: ['best buy'], gradient: ['#1a49bb', '#2460e0'], network: 'VISA', chip: true },

  // Gift / loyalty (no network)
  { keywords: ['starbucks'], gradient: ['#006241', '#00a862'], network: null, chip: false },
  { keywords: ['gift card', 'gift'], gradient: ['#5a4a8a', '#7a6aaa'], network: null, chip: false },
  { keywords: ['store credit', 'store card'], gradient: ['#3a3a3a', '#5a5a5a'], network: null, chip: false },
]

const DEFAULT_DESIGN = { gradient: ['#2a2a2a', '#444444'], network: null, chip: true }

export function getCardDesign(name) {
  if (!name) return DEFAULT_DESIGN
  const lower = name.toLowerCase()
  for (const design of CARD_DESIGNS) {
    if (design.keywords.some(k => lower.includes(k))) return design
  }
  return DEFAULT_DESIGN
}

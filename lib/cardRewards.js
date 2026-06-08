// Suggested rewards rates per category for popular cards.
// Values represent % cash back OR points multiplier per $1 spent.
// Source: card issuer published rates as of 2025.

const CARD_REWARDS = [
  // ── Chase ──────────────────────────────────────────────────────────────
  {
    keywords: ['sapphire reserve'],
    annualFee: 550,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Portal bookings earn 10x hotels/cars, 5x flights'
  },
  {
    keywords: ['sapphire preferred'],
    annualFee: 95,
    multipliers: { dining: 3, travel: 2, hotel: 2, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: 'Portal bookings earn 5x travel; 3x online grocery'
  },
  {
    keywords: ['freedom unlimited'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '5x via Chase Travel portal'
  },
  {
    keywords: ['freedom flex', 'freedom'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5x rotating quarterly categories; 5x via Chase Travel portal'
  },
  {
    keywords: ['ink business preferred', 'ink preferred'],
    annualFee: 95,
    multipliers: { dining: 1, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: '3x shipping, internet/cable/phone, ads (up to $150k/yr)'
  },
  {
    keywords: ['ink business unlimited', 'ink unlimited'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere'
  },
  {
    keywords: ['ink business cash', 'ink cash'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 1, gas: 2, streaming: 5, retail: 1, other: 1 },
    note: '5% office supplies, internet/cable/phone (up to $25k/yr)'
  },

  // ── Amex ───────────────────────────────────────────────────────────────
  {
    keywords: ['amex platinum', 'american express platinum'],
    annualFee: 695,
    multipliers: { dining: 1, travel: 5, hotel: 5, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5x on flights booked direct or via Amex Travel; 5x prepaid hotels via Amex Travel'
  },
  {
    keywords: ['amex gold', 'american express gold', 'gold card'],
    annualFee: 325,
    multipliers: { dining: 4, travel: 3, hotel: 1, grocery: 4, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '4x US supermarkets (up to $25k/yr); 3x flights direct/Amex Travel'
  },
  {
    keywords: ['amex green', 'american express green'],
    annualFee: 150,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x transit and travel'
  },
  {
    keywords: ['blue cash preferred'],
    annualFee: 95,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 6, gas: 3, streaming: 6, retail: 1, other: 1 },
    note: '6x US supermarkets (up to $6k/yr); 6x US streaming; 3x US gas & transit'
  },
  {
    keywords: ['blue cash everyday'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 3, gas: 2, streaming: 1, retail: 3, other: 1 },
    note: '3x US supermarkets (up to $6k/yr); 3x US online retail; 2x US gas'
  },

  // ── Capital One ────────────────────────────────────────────────────────
  {
    keywords: ['venture x'],
    annualFee: 395,
    multipliers: { dining: 2, travel: 5, hotel: 10, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '10x hotels/rental cars via portal; 5x flights via portal; 2x everywhere else'
  },
  {
    keywords: ['capital one venture', 'venture rewards'],
    annualFee: 95,
    multipliers: { dining: 2, travel: 2, hotel: 5, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '5x hotels/rental cars via portal; 2x everywhere else'
  },
  {
    keywords: ['savor one', 'savorone'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: '3x dining, entertainment, streaming, grocery stores'
  },
  {
    keywords: ['capital one savor'],
    annualFee: 95,
    multipliers: { dining: 4, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 4, retail: 1, other: 1 },
    note: '4x dining, entertainment, streaming; 3x grocery stores'
  },
  {
    keywords: ['quicksilver'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere'
  },

  // ── Citi ───────────────────────────────────────────────────────────────
  {
    keywords: ['citi double cash', 'double cash'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '2% everywhere (1% on purchase + 1% on payment)'
  },
  {
    keywords: ['citi premier', 'citi strata premier'],
    annualFee: 95,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 3, gas: 3, streaming: 1, retail: 1, other: 1 },
    note: '3x restaurants, supermarkets, gas, air travel & hotels'
  },
  {
    keywords: ['citi custom cash', 'custom cash'],
    annualFee: 0,
    multipliers: { dining: 5, travel: 1, hotel: 1, grocery: 5, gas: 5, streaming: 5, retail: 5, other: 1 },
    note: '5% on your top eligible spend category each billing cycle (up to $500); edit to match your top category'
  },

  // ── Discover ───────────────────────────────────────────────────────────
  {
    keywords: ['discover it', 'discover'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5% rotating quarterly categories (gas, groceries, restaurants, etc.); edit when you know the active quarter'
  },

  // ── Wells Fargo ────────────────────────────────────────────────────────
  {
    keywords: ['wells fargo active cash', 'active cash'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '2% everywhere'
  },
  {
    keywords: ['wells fargo autograph'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 3, streaming: 3, retail: 1, other: 1 },
    note: '3x restaurants, travel, gas, streaming, transit, phone plans'
  },

  // ── Bank of America ────────────────────────────────────────────────────
  {
    keywords: ['customized cash rewards', 'bank of america customized'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 2, gas: 3, streaming: 1, retail: 1, other: 1 },
    note: '3% in chosen category (default: gas/dining); 2% grocery/wholesale; edit to match your chosen category'
  },
  {
    keywords: ['unlimited cash rewards', 'bank of america unlimited'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere (Preferred Rewards members earn more)'
  },

  // ── US Bank ────────────────────────────────────────────────────────────
  {
    keywords: ['us bank cash+', 'cash+'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 2, gas: 1, streaming: 5, retail: 5, other: 1 },
    note: '5% on two chosen categories; 2% on one everyday category; edit to match your chosen categories'
  },
  {
    keywords: ['us bank altitude go'],
    annualFee: 0,
    multipliers: { dining: 4, travel: 1, hotel: 1, grocery: 2, gas: 2, streaming: 4, retail: 1, other: 1 },
    note: '4x dining and streaming; 2x grocery, gas, EV charging'
  },
  {
    keywords: ['us bank altitude connect'],
    annualFee: 95,
    multipliers: { dining: 2, travel: 4, hotel: 4, grocery: 2, gas: 4, streaming: 2, retail: 1, other: 1 },
    note: '4x travel, gas, EV charging; 2x grocery, dining, streaming'
  },

  // ── Travel Co-branded ──────────────────────────────────────────────────
  {
    keywords: ['marriott bonvoy boundless'],
    annualFee: 95,
    multipliers: { dining: 3, travel: 2, hotel: 6, grocery: 3, gas: 3, streaming: 2, retail: 2, other: 2 },
    note: '6x Marriott hotels; 3x gas, dining, groceries; 2x everywhere else'
  },
  {
    keywords: ['marriott bonvoy bold'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Marriott hotels; 2x travel'
  },
  {
    keywords: ['hilton honors surpass'],
    annualFee: 150,
    multipliers: { dining: 6, travel: 3, hotel: 12, grocery: 6, gas: 6, streaming: 3, retail: 3, other: 3 },
    note: '12x Hilton hotels; 6x restaurants, groceries, gas; 3x everywhere else'
  },
  {
    keywords: ['hilton honors aspire'],
    annualFee: 550,
    multipliers: { dining: 7, travel: 7, hotel: 14, grocery: 7, gas: 7, streaming: 7, retail: 3, other: 3 },
    note: '14x Hilton hotels; 7x select travel & purchases; 3x everywhere else'
  },
  {
    keywords: ['hilton honors'],
    annualFee: 0,
    multipliers: { dining: 5, travel: 3, hotel: 7, grocery: 5, gas: 5, streaming: 3, retail: 3, other: 3 },
    note: '7x Hilton hotels; 5x restaurants, groceries, gas; 3x everywhere else'
  },
  {
    keywords: ['delta skymiles reserve'],
    annualFee: 650,
    multipliers: { dining: 3, travel: 3, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Delta; 3x dining; 1x everywhere else'
  },
  {
    keywords: ['delta skymiles platinum'],
    annualFee: 350,
    multipliers: { dining: 3, travel: 3, hotel: 1, grocery: 3, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Delta; 3x restaurants & groceries; 1x everywhere else'
  },
  {
    keywords: ['delta skymiles gold'],
    annualFee: 150,
    multipliers: { dining: 2, travel: 2, hotel: 1, grocery: 2, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x Delta, restaurants & groceries; 1x everywhere else'
  },
  {
    keywords: ['united club infinite'],
    annualFee: 525,
    multipliers: { dining: 2, travel: 4, hotel: 2, grocery: 2, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '4x United; 2x dining, hotel, grocery'
  },
  {
    keywords: ['united explorer', 'united quest'],
    annualFee: 95,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x United, dining & hotels; 1x everywhere else'
  },
  {
    keywords: ['southwest rapid rewards priority', 'southwest priority'],
    annualFee: 149,
    multipliers: { dining: 2, travel: 3, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Southwest; 2x hotel & car partners, local transit & rideshare'
  },
  {
    keywords: ['southwest rapid rewards plus', 'southwest plus', 'southwest premier', 'southwest'],
    annualFee: 99,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x Southwest & partner purchases'
  },
  {
    keywords: ['world of hyatt', 'hyatt'],
    annualFee: 95,
    multipliers: { dining: 2, travel: 2, hotel: 9, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '9x Hyatt hotels; 2x dining, airlines, gyms, transit'
  },
  {
    keywords: ['ihg one rewards premier', 'ihg premier'],
    annualFee: 99,
    multipliers: { dining: 3, travel: 3, hotel: 26, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 3 },
    note: '26x IHG hotels; 5x on other travel; 3x dining & everything else'
  },

  // ── Tech / Retail ──────────────────────────────────────────────────────
  {
    keywords: ['amazon prime rewards', 'amazon prime visa'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 5, gas: 2, streaming: 1, retail: 5, other: 1 },
    note: '5% Amazon & Whole Foods; 2% restaurants, gas, drugstores'
  },
  {
    keywords: ['apple card'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 1 },
    note: '3% Apple purchases & select merchants; 2% Apple Pay; 1% physical card'
  },
  {
    keywords: ['costco anywhere'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 2, gas: 4, streaming: 1, retail: 2, other: 1 },
    note: '4% gas (up to $7k/yr); 3% restaurants & travel; 2% Costco; 1% elsewhere'
  },

  // ── Chase (additional) ─────────────────────────────────────────────────
  {
    keywords: ['chase slate edge', 'slate edge'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '1% everywhere; useful for balance transfers / 0% intro APR'
  },
  {
    keywords: ['amazon visa', 'chase amazon'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 5, gas: 2, streaming: 1, retail: 5, other: 1 },
    note: '5% Amazon & Whole Foods (no Prime required); 2% restaurants, gas, drugstores'
  },
  {
    keywords: ['disney visa', 'disney rewards'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 2, other: 1 },
    note: '2% Disney purchases; 1% everywhere else'
  },
  {
    keywords: ['united gateway'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 1, grocery: 1, gas: 2, streaming: 1, retail: 1, other: 1 },
    note: '2x United purchases, gas stations & local transit; 1x everywhere else'
  },
  {
    keywords: ['marriott bonvoy brilliant'],
    annualFee: 650,
    multipliers: { dining: 6, travel: 3, hotel: 6, grocery: 3, gas: 3, streaming: 3, retail: 3, other: 2 },
    note: '6x Marriott hotels & restaurants; 3x everywhere else'
  },
  {
    keywords: ['aeroplan'],
    annualFee: 95,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Air Canada & Air Canada Vacations; 3x dining & hotels directly'
  },

  // ── Amex (additional) ──────────────────────────────────────────────────
  {
    keywords: ['amex everyday preferred', 'everyday preferred'],
    annualFee: 95,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 3, gas: 2, streaming: 1, retail: 1, other: 1 },
    note: '3x US supermarkets (up to $6k/yr); 2x US gas; 50% bonus when 30+ transactions/billing period'
  },
  {
    keywords: ['amex everyday', 'american express everyday'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 2, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x US supermarkets (up to $6k/yr); 20% bonus when 20+ transactions/billing period'
  },
  {
    keywords: ['amex business gold', 'american express business gold'],
    annualFee: 375,
    multipliers: { dining: 4, travel: 4, hotel: 4, grocery: 4, gas: 4, streaming: 4, retail: 4, other: 1 },
    note: '4x on top 2 categories each billing cycle (up to $150k/yr combined); edit to match your top categories'
  },
  {
    keywords: ['amex business platinum', 'american express business platinum'],
    annualFee: 695,
    multipliers: { dining: 1, travel: 5, hotel: 5, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5x flights & prepaid hotels via Amex Travel; 1.5x on $5k+ purchases'
  },
  {
    keywords: ['delta skymiles blue'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x Delta & dining; 1x everywhere else; no annual fee'
  },
  {
    keywords: ['hilton honors amex'],
    annualFee: 0,
    multipliers: { dining: 5, travel: 3, hotel: 7, grocery: 5, gas: 5, streaming: 3, retail: 3, other: 3 },
    note: '7x Hilton hotels; 5x restaurants, US supermarkets, gas; 3x everywhere else'
  },
  {
    keywords: ['marriott bonvoy amex', 'marriott bonvoy bevy'],
    annualFee: 95,
    multipliers: { dining: 4, travel: 3, hotel: 6, grocery: 4, gas: 3, streaming: 3, retail: 3, other: 2 },
    note: '6x Marriott; 4x restaurants & US supermarkets; 2x everywhere else'
  },
  {
    keywords: ['amex cash magnet', 'cash magnet'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere'
  },

  // ── Capital One (additional) ───────────────────────────────────────────
  {
    keywords: ['capital one venture one', 'ventureone'],
    annualFee: 0,
    multipliers: { dining: 1.25, travel: 5, hotel: 5, grocery: 1.25, gas: 1.25, streaming: 1.25, retail: 1.25, other: 1.25 },
    note: '5x hotels & rental cars via portal; 1.25x everywhere else; no annual fee'
  },
  {
    keywords: ['spark cash plus', 'spark cash'],
    annualFee: 150,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '2% everywhere; unlimited'
  },
  {
    keywords: ['spark miles'],
    annualFee: 95,
    multipliers: { dining: 2, travel: 5, hotel: 5, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 2 },
    note: '5x hotels & rental cars via portal; 2x everywhere else'
  },

  // ── Citi (additional) ──────────────────────────────────────────────────
  {
    keywords: ['citi simplicity'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '1x everywhere; known for no late fees & long 0% APR intro'
  },
  {
    keywords: ['citi rewards+', 'rewards+'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 2, gas: 2, streaming: 1, retail: 1, other: 1 },
    note: '2x grocery & gas (up to $6k/yr); rounds every purchase up to nearest 10 points'
  },
  {
    keywords: ['aa advantage platinum', 'citi aadvantage', 'american airlines citi'],
    annualFee: 99,
    multipliers: { dining: 2, travel: 2, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '2x American Airlines & restaurants; 1x everywhere else'
  },

  // ── Bank of America (additional) ───────────────────────────────────────
  {
    keywords: ['bank of america premium rewards', 'boa premium rewards'],
    annualFee: 95,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '2x travel & dining; 1.5x everything else'
  },
  {
    keywords: ['bank of america travel rewards', 'boa travel rewards'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5x everywhere; no foreign transaction fees'
  },
  {
    keywords: ['alaska airlines visa', 'alaska airlines bank of america'],
    annualFee: 95,
    multipliers: { dining: 3, travel: 3, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Alaska Airlines; 2x gas & EV; 1x everywhere else'
  },

  // ── Wells Fargo (additional) ───────────────────────────────────────────
  {
    keywords: ['wells fargo reflect', 'reflect card'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '1x everywhere; known for long 0% intro APR up to 21 months'
  },
  {
    keywords: ['bilt rewards', 'bilt mastercard'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 2, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x dining; 2x travel; 1x rent (no fee, up to 100k pts/yr); 1x everywhere else'
  },

  // ── Barclays ───────────────────────────────────────────────────────────
  {
    keywords: ['jetblue plus'],
    annualFee: 99,
    multipliers: { dining: 2, travel: 6, hotel: 2, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '6x JetBlue; 2x dining & grocery; 1x everywhere else'
  },
  {
    keywords: ['jetblue card', 'jetblue barclays'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 3, hotel: 2, grocery: 2, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x JetBlue; 2x dining & grocery; 1x everywhere else'
  },
  {
    keywords: ['hawaiian airlines mastercard', 'hawaiian airlines barclays'],
    annualFee: 99,
    multipliers: { dining: 2, travel: 3, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3x Hawaiian Airlines; 2x gas, dining & grocery; 1x everywhere else'
  },
  {
    keywords: ['frontier airlines world mastercard', 'frontier airlines card'],
    annualFee: 99,
    multipliers: { dining: 3, travel: 5, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5x Frontier; 3x restaurants & hotels; 1x everywhere else'
  },

  // ── Navy Federal / USAA / Credit Union ────────────────────────────────
  {
    keywords: ['navy federal cashrewards', 'navy federal cash rewards'],
    annualFee: 0,
    multipliers: { dining: 1.75, travel: 1.75, hotel: 1.75, grocery: 1.75, gas: 1.75, streaming: 1.75, retail: 1.75, other: 1.75 },
    note: '1.75% everywhere (up to 1.75% with direct deposit); no annual fee'
  },
  {
    keywords: ['usaa cashback rewards plus', 'usaa cashback'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 2, gas: 5, streaming: 1, retail: 1, other: 1 },
    note: '5% gas & military base purchases (up to $3k/yr); 2% grocery; 1% everywhere else'
  },
  {
    keywords: ['penfed power cash', 'penfed gold'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '2% everywhere with PenFed Honors Advantage; 1.5% otherwise'
  },

  // ── Student & Starter Cards ────────────────────────────────────────────
  {
    keywords: ['discover it student', 'discover student'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '5% rotating quarterly categories (gas, restaurants, Amazon, etc.); 1x elsewhere; cash-back match first year'
  },
  {
    keywords: ['discover it secured', 'discover secured'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 1, gas: 2, streaming: 1, retail: 1, other: 1 },
    note: '2% gas & restaurants; 1% everywhere else; secured card for building credit'
  },
  {
    keywords: ['capital one savor student', 'savor student'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 3, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: '3% dining, grocery, entertainment & streaming; no annual fee; student version of SavorOne'
  },
  {
    keywords: ['capital one quicksilver student', 'quicksilver student'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1.5 },
    note: '1.5% everywhere; no annual fee; student version of Quicksilver'
  },
  {
    keywords: ['bank of america student', 'boa student', 'cash rewards student'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 1, hotel: 1, grocery: 2, gas: 3, streaming: 1, retail: 1, other: 1 },
    note: '3% chosen category (default gas); 2% grocery/wholesale; student version'
  },
  {
    keywords: ['journey student', 'capital one journey'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '1% everywhere + 0.25% bonus when you pay on time; discontinued but still in wallets'
  },
  {
    keywords: ['deserve edu', 'deserve edu mastercard'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 3, retail: 1, other: 1 },
    note: '3% streaming; 1x everywhere else; no SSN required — popular with international students'
  },
  {
    keywords: ['petal 2', 'petal 2 visa'],
    annualFee: 0,
    multipliers: { dining: 1.5, travel: 1.5, hotel: 1.5, grocery: 1.5, gas: 1.5, streaming: 1.5, retail: 1.5, other: 1 },
    note: '1–1.5% everywhere scaling up to 1.5% with on-time payments; no fees, no SSN required'
  },
  {
    keywords: ['petal 1', 'petal 1 visa'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 1, hotel: 1, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 1 },
    note: '2–10% cash back at select merchants; 1% everywhere else; for limited/no credit history'
  },
  {
    keywords: ['credit one platinum', 'credit one bank'],
    annualFee: 75,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '1% on eligible purchases; designed for building/rebuilding credit'
  },
  {
    keywords: ['opensky secured', 'opensky'],
    annualFee: 35,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'No credit check required; secured card; reports to all 3 bureaus'
  },
  {
    keywords: ['chime credit builder', 'chime credit'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'No interest, no fees, no credit check; secured against Chime spending account'
  },
  {
    keywords: ['self secured', 'self credit builder'],
    annualFee: 25,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Secured Visa backed by Self credit-builder account; great for first card'
  },
  {
    keywords: ['secured mastercard capital one', 'capital one secured'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Secured card; low $49/$99/$200 deposit; automatic credit line reviews'
  },
  {
    keywords: ['wells fargo student', 'wells fargo secured'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '1% everywhere; secured option available for building credit'
  },
  {
    keywords: ['apple card student', 'goldman sachs apple'],
    annualFee: 0,
    multipliers: { dining: 2, travel: 2, hotel: 2, grocery: 2, gas: 2, streaming: 2, retail: 2, other: 1 },
    note: '3% Apple & select merchants; 2% Apple Pay; 1% physical card; no fees; popular first card for iPhone users'
  },
  {
    keywords: ['deserve pro mastercard', 'deserve pro'],
    annualFee: 0,
    multipliers: { dining: 3, travel: 3, hotel: 3, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '3% dining & travel; 2% streaming; 1x elsewhere; no foreign transaction fee; no SSN required'
  },
  {
    keywords: ['firstcard', 'first card student'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Up to 10% cash back at partner merchants; secured/unsecured options; no credit check for students'
  },
  {
    keywords: ['slate', 'chase slate'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '0% intro APR; no rewards but good balance transfer starter card'
  },
  {
    keywords: ['citi secured', 'citi secured mastercard'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Secured card; $200 min deposit; reports to all 3 bureaus; path to unsecured'
  },
  {
    keywords: ['usaa classic platinum visa', 'usaa secured'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Secured Visa for USAA members; low APR; great for military students'
  },
  {
    keywords: ['navy federal nrewards', 'nrewards secured'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: 'Secured card; earns points; no annual fee; strong path to Navy Federal unsecured cards'
  },

  // ── Store / Co-brand ───────────────────────────────────────────────────
  {
    keywords: ['target redcard', 'target red card'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 5, gas: 1, streaming: 1, retail: 5, other: 1 },
    note: '5% at Target & Target.com; 1x everywhere else'
  },
  {
    keywords: ['walmart rewards', 'walmart credit card'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 5, gas: 2, streaming: 1, retail: 5, other: 1 },
    note: '5% Walmart.com; 2% in-store Walmart & Murphy USA gas; 1x everywhere else'
  },
  {
    keywords: ['home depot credit', 'home depot card'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 1, other: 1 },
    note: '0% promo financing at Home Depot; no ongoing rewards rate'
  },
  {
    keywords: ['lowes advantage', 'lowes credit'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 5, other: 1 },
    note: '5% off eligible Lowe\'s purchases or 6 months special financing'
  },
  {
    keywords: ['best buy credit', 'best buy visa'],
    annualFee: 0,
    multipliers: { dining: 1, travel: 1, hotel: 1, grocery: 1, gas: 1, streaming: 1, retail: 5, other: 1 },
    note: '5% back in rewards at Best Buy (My Best Buy Visa: 3% dining, 2% grocery & gas)'
  },
]

export function getSuggestedMultipliers(name) {
  if (!name || name.length < 3) return null
  const lower = name.toLowerCase()
  for (const card of CARD_REWARDS) {
    if (card.keywords.some(k => lower.includes(k))) {
      return { multipliers: card.multipliers, note: card.note, annualFee: card.annualFee }
    }
  }
  return null
}

// Single source of truth for money formatting.
//
// Precision rules, one per context:
//   money()       cents   purchases, rewards earned, missed rewards, balances, per-card net
//   moneyWhole()  dollars annual fees, perk credit amounts, totals of credits, spend totals, per-year estimates
// Negative values use a true minus sign (−$1,965), never "$-1965".

const MINUS = '−'

const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

function format(formatter, n, { sign = false } = {}) {
  const value = Number(n) || 0
  const body = formatter.format(Math.abs(value))
  // Values that round to zero print without a sign
  if (formatter.format(Math.abs(value)) === formatter.format(0)) return body
  if (value < 0) return MINUS + body
  return sign ? '+' + body : body
}

export const money = (n, opts) => format(cents, n, opts)
export const moneyWhole = (n, opts) => format(whole, n, opts)

// Earn rate in cents per dollar spent, e.g. 0.025 -> "2.5¢"
export function centsPerDollar(dollarsPerDollar) {
  const c = Math.round(dollarsPerDollar * 1000) / 10
  return `${c % 1 === 0 ? c.toFixed(0) : c.toFixed(1)}¢`
}

// Apply to every money and rate figure so columns line up
export const NUM = { fontVariantNumeric: 'tabular-nums' }

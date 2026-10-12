'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { buildDemoWallet, DEMO_CATEGORIES, DEMO_MERCHANTS, DEMO_PURCHASES, SOURCES, RATES_VERIFIED, RATES_VERIFIED_LABEL } from '../lib/demoWallet.js'
import { rankCards, isCashBack } from '../lib/ranking.js'
import { analyzeRetroactiveTaps } from '../lib/insights'
import { searchMerchants } from '../lib/merchants'
import { getCardDesign } from '../lib/cardImages'
import { daysUntilReset } from '../lib/cardPerks.js'
import { dollarValuePerDollar } from '../lib/pointValues.js'
import { money, moneyWhole } from '../lib/format.js'
import { useReorder } from '../lib/useReorder'

// Shared marketing page components used by /, /about and the legal pages

// ── Key logo ─────────────────────────────────────────────
export function KeySVG({ size = 20, id = 'mk1' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <mask id={id}>
          <circle cx="187" cy="254" r="107" fill="white"/>
          <circle cx="187" cy="254" r="61"  fill="black"/>
          <rect x="246" y="232" width="200" height="44" rx="22" fill="white"/>
          <rect x="354" y="276" width="42"  height="58" rx="11" fill="white"/>
          <rect x="408" y="276" width="30"  height="42" rx="9"  fill="white"/>
        </mask>
      </defs>
      <rect width="512" height="512" fill="#C9A227" mask={`url(#${id})`}/>
    </svg>
  )
}

// ── Nav + footer shared by every marketing and legal page ──
export function MarketingNav({ cta, showLinks = true, id = 'navkey' }) {
  return (
    <nav className="mkt-nav">
      <div className="mkt-wrap mkt-nav-inner">
        <Link href="/" className="mkt-logo">
          <KeySVG size={18} id={id}/>
          <span>CLAVIS</span>
        </Link>
        {showLinks && (
          <div className="mkt-nav-links">
            <a href="#demo" className="mkt-nav-link">Try it</a>
            <a href="#credits" className="mkt-nav-link">Credits</a>
            <a href="#numbers" className="mkt-nav-link">Where the numbers come from</a>
            <a href="#data" className="mkt-nav-link">Your data</a>
          </div>
        )}
        <a href={cta.href} className="pill-dark">{cta.label}</a>
      </div>
    </nav>
  )
}

export function MarketingFooter({ id = 'ftkey' }) {
  return (
    <footer className="mkt-footer">
      <div className="mkt-wrap mkt-footer-inner">
        <div className="mkt-footer-links">
          <Link href="/" className="mkt-logo mkt-logo-sm">
            <KeySVG size={16} id={id}/>
            <span>CLAVIS</span>
          </Link>
          <Link href="/faq" className="mkt-footer-link">FAQ</Link>
          <Link href="/privacy" className="mkt-footer-link">Privacy</Link>
          <Link href="/terms" className="mkt-footer-link">Terms</Link>
        </div>
        <span className="mkt-footer-note">© {new Date().getFullYear()} Clavis · Your data is never sold.</span>
      </div>
    </footer>
  )
}

// ── Shared layout for legal/info pages (Privacy, Terms, FAQ) ──
export function LegalLayout({ title, meta, children, navId = 'lglkey', ftId = 'lglftkey' }) {
  return (
    <>
      <style>{marketingStyles}</style>
      <div className="mkt-page">
        <MarketingNav cta={{ href: '/dashboard', label: 'Dashboard' }} showLinks={false} id={navId}/>
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 16px 96px' }}>
          <h1 className="display-lg" style={{ marginBottom: '8px' }}>{title}</h1>
          {meta && <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '40px' }}>{meta}</p>}
          {children}
        </main>
        <MarketingFooter id={ftId}/>
      </div>
    </>
  )
}

// ── Content primitives for legal/info pages ──────────────
export function LegalH2({ children }) {
  return <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: '40px', marginBottom: '14px' }}>{children}</h2>
}

export function LegalP({ children }) {
  return <p style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)', marginBottom: '14px' }}>{children}</p>
}

export function LegalList({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: '22px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)', marginBottom: '6px' }}>{item}</li>
      ))}
    </ul>
  )
}

// ── Demo data ─────────────────────────────────────────────
// Scored as of the 1st of this month, so monthly credits read as freshly
// reset and the ranking doesn't depend on what day someone visits.
function useDemoWallet() {
  return useMemo(() => {
    const now = new Date()
    const asOf = new Date(now.getFullYear(), now.getMonth(), 1)
    return { asOf, wallet: buildDemoWallet(asOf) }
  }, [])
}

const CATEGORY_LABEL = { dining: 'Dining', grocery: 'Grocery', gas: 'Gas', streaming: 'Streaming', retail: 'Shopping', other: 'Everything else' }

function Swatch({ name }) {
  return <span className="swatch" style={{ background: getCardDesign(name).gradient[0] }} aria-hidden="true"/>
}

function rateLabel(card, mult) {
  return isCashBack(card) ? `${mult}% cash back` : `${mult}x points`
}

// ── Live demo: real ranking code on a real-shaped wallet ──
export function LiveDemo() {
  const { asOf, wallet } = useDemoWallet()
  const [query, setQuery] = useState('DoorDash')
  const [merchant, setMerchant] = useState(DEMO_MERCHANTS[1])
  const [category, setCategory] = useState('dining')
  const [amount, setAmount] = useState(40)

  const suggestions = query && (!merchant || merchant.name !== query) ? searchMerchants(query) : []
  const unsupported = suggestions.length > 0 && suggestions.every(s => !DEMO_CATEGORIES.includes(s.category))
  const pickable = suggestions.filter(s => DEMO_CATEGORIES.includes(s.category)).slice(0, 5)

  const choose = m => { setMerchant(m); setQuery(m.name); setCategory(m.category) }
  const chooseCategory = c => { setCategory(c); setMerchant(null); setQuery('') }

  const spend = Math.max(0, Number(amount) || 0)
  const ranked = rankCards(wallet, { category, merchant: merchant?.name || '', now: asOf })
  const best = ranked[0]
  const credit = best.merchantPerk ? Math.min(spend, best.merchantPerk.total_amount - best.merchantPerk.used_amount) : 0
  const others = ranked.slice(1).sort((a, b) => b.dollarVal - a.dollarVal)
  const rowRef = useReorder([best, ...others].map(r => r.card.id))

  return (
    <div className="demo">
      <div className="demo-controls">
        <div className="demo-field">
          <label htmlFor="demo-merchant" className="demo-label">Where are you paying?</label>
          <input id="demo-merchant" className="input demo-input" value={query} autoComplete="off"
            placeholder="Try Chipotle, Target, Shell…"
            onChange={e => { setQuery(e.target.value); setMerchant(null) }}/>
          {pickable.length > 0 && (
            <div className="demo-suggest" role="listbox" aria-label="Matching merchants">
              {pickable.map(s => (
                <button key={s.name} role="option" aria-selected="false" className="demo-suggest-item" onClick={() => choose(s)}>
                  {s.name}<span>{CATEGORY_LABEL[s.category]}</span>
                </button>
              ))}
            </div>
          )}
          {unsupported && <p className="demo-note">Travel rates depend on where you book, so this demo covers everyday spending. The app handles travel.</p>}
        </div>
        <div className="demo-field demo-field-amount">
          <label htmlFor="demo-amount" className="demo-label">Amount</label>
          <div className="demo-amount">
            <span>$</span>
            <input id="demo-amount" className="input" type="number" inputMode="decimal" min="0" value={amount} onChange={e => setAmount(e.target.value)}/>
          </div>
        </div>
      </div>

      <div className="demo-try">
        <span>Try</span>
        {DEMO_MERCHANTS.map(m => (
          <button key={m.name} className={`demo-chip${merchant?.name === m.name ? ' is-active' : ''}`} onClick={() => choose(m)}>{m.name}</button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Or pick a category" className="segmented demo-segmented">
        {DEMO_CATEGORIES.map(c => (
          <button key={c} role="radio" aria-checked={!merchant && category === c} className={`segmented-item${!merchant && category === c ? ' is-active' : ''}`} onClick={() => chooseCategory(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="demo-results" aria-live="polite">
        <div className="demo-best" ref={rowRef(best.card.id)}>
          <div className="demo-best-card">
            <Swatch name={best.card.name}/>
            <div>
              <div className="demo-best-label">Use this card{merchant ? ` at ${merchant.name}` : ''}</div>
              <div className="demo-best-name">{best.card.name}</div>
              <div className="demo-meta">
                {rateLabel(best.card, best.mult)}
                {best.merchantPerk && <> · uses your unused {moneyWhole(best.merchantPerk.total_amount - best.merchantPerk.used_amount)} {best.merchantPerk.name}</>}
              </div>
            </div>
          </div>
          <div className="demo-best-value">
            <div className="demo-big">{money(best.dollarVal * spend + credit)}</div>
            <div className="demo-meta">
              {credit > 0 ? `${money(best.dollarVal * spend)} rewards + ${money(credit)} credit` : `back on ${money(spend)}`}
            </div>
          </div>
        </div>
        <div className="demo-others-label">What your other cards would earn here</div>
        {others.map(r => (
          <div key={r.card.id} className="demo-row" ref={rowRef(r.card.id)}>
            <span className="demo-row-name"><Swatch name={r.card.name}/>{r.card.name}</span>
            <span className="demo-row-rate">{rateLabel(r.card, r.mult)}</span>
            <span className="demo-row-val">{money(r.dollarVal * spend)}</span>
          </div>
        ))}
        <p className="demo-foot">
          Demo wallet: four common cards with their published rates and monthly credits. Points valued at 1.0¢, which you can change in the app.
          {best.merchantPerk && ' The best card here earns fewer points but uses a credit that would otherwise expire unused.'}
        </p>
      </div>
    </div>
  )
}

// ── Credits panel: the demo wallet's monthly credits ──────
export function CreditsPanel() {
  const { wallet } = useDemoWallet()
  const days = daysUntilReset(monthEnd(new Date()))
  const rows = wallet.flatMap(c => c.perks.map(p => ({ ...p, card: c.name })))
  const unused = rows.reduce((s, p) => s + (p.total_amount - p.used_amount), 0)
  return (
    <div className="ui-panel">
      <div className="ui-panel-head">
        <span>Credits this month</span>
        <span><strong>{moneyWhole(unused)}</strong> unused</span>
      </div>
      <div className="credit-grid">
        {rows.map(p => {
          const done = p.used_amount >= p.total_amount
          return (
            <div key={p.id} className="credit">
              <div className="credit-top">
                <div style={{ minWidth: 0 }}>
                  <div className="credit-name">{p.name}</div>
                  <div className="credit-meta">{p.card} · {done ? 'used this month' : `resets in ${days} days`}</div>
                </div>
                <span className={`credit-amt${done ? ' is-done' : ''}`}>{moneyWhole(p.used_amount)} / {moneyWhole(p.total_amount)}</span>
              </div>
              <div className="bar"><div style={{ width: `${(p.used_amount / p.total_amount) * 100}%`, background: done ? 'var(--gain)' : 'var(--ink)' }}/></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function monthEnd(d) {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

// ── History panel: demo purchases through the real analysis ──
export function HistoryPanel() {
  const { wallet } = useDemoWallet()
  const { taps, earned, missed } = useMemo(() => {
    const byId = Object.fromEntries(wallet.map(c => [c.id, c]))
    const taps = DEMO_PURCHASES.map(([merchant, category, amount, cardId], i) => {
      const card = byId[cardId]
      const mult = card.multipliers.find(m => m.category === category)?.multiplier || 1
      return { id: `t${i}`, merchant, category, amount, card_id: cardId, card_name: card.name, estimated_value: dollarValuePerDollar(card, mult) * amount }
    })
    const missed = analyzeRetroactiveTaps(taps, wallet)
    return { taps, earned: taps.reduce((s, t) => s + t.estimated_value, 0), missed }
  }, [wallet])
  const missedTotal = missed.reduce((s, m) => s + m.missedTotal, 0)
  const missedById = Object.fromEntries(missed.map(m => [m.tap.id, m]))
  return (
    <div className="ui-panel">
      <div className="history-sum">
        <div>
          <div className="credit-meta">Earned on {taps.length} purchases, last 7 weeks</div>
          <div className="demo-big">{money(earned)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="credit-meta">Missed by using the wrong card</div>
          <div className="history-missed">{money(missedTotal)}</div>
        </div>
      </div>
      {taps.slice(0, 7).map(t => {
        const m = missedById[t.id]
        return (
          <div key={t.id} className="history-row">
            <span className="demo-row-name"><Swatch name={t.card_name}/>
              <span style={{ minWidth: 0 }}>
                <span className="credit-name">{t.merchant}</span>
                <span className="credit-meta" style={{ display: 'block' }}>
                  {t.card_name}{m ? ` · ${m.bestCard.name} would have earned ${money(m.missedTotal)} more` : ''}
                </span>
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span className="demo-row-val" style={{ display: 'block' }}>{money(t.amount)}</span>
              <span className="credit-meta" style={{ color: 'var(--gain)' }}>{money(t.estimated_value, { sign: true })}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Shared section styles injected via <style> ────────────
export const marketingStyles = `
  .mkt-page { min-height: 100vh; background: var(--paper); color: var(--ink); }
  .mkt-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

  .mkt-nav { position: sticky; top: 0; z-index: 100; background: var(--paper); border-bottom: 1px solid var(--hairline); }
  .mkt-nav-inner { height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .mkt-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--ink); font-size: 14px; font-weight: 600; letter-spacing: 0.06em; }
  .mkt-logo-sm { font-size: 12px; color: var(--ink-2); }
  .mkt-nav-links { display: flex; gap: 28px; }
  .mkt-nav-link { font-size: 14px; font-weight: 500; color: var(--ink-2); text-decoration: none; }
  .mkt-nav-link:hover { color: var(--ink); }

  .mkt-footer { border-top: 1px solid var(--hairline); padding: 32px 0; }
  .mkt-footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
  .mkt-footer-links { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .mkt-footer-link { font-size: 14px; color: var(--ink-2); text-decoration: none; }
  .mkt-footer-link:hover { color: var(--ink); text-decoration: underline; }
  .mkt-footer-note { font-size: 12px; color: var(--muted); }

  .mkt-section { padding-block: 120px; }
  .mkt-lede { font-size: 18px; line-height: 1.6; color: var(--ink-2); text-wrap: pretty; }
  .mkt-body { font-size: 16px; line-height: 1.65; color: var(--ink-2); text-wrap: pretty; }
  .mkt-body + .mkt-body { margin-top: 16px; }
  .mkt-body strong { color: var(--ink); font-weight: 600; }
  .mkt-link { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }

  /* Hero */
  .mkt-hero { padding-block: 96px 56px; }
  .mkt-hero h1 { max-width: 760px; }
  .mkt-hero .mkt-lede { max-width: 560px; margin-top: 24px; }
  .mkt-hero-ctas { display: flex; align-items: center; gap: 16px; margin-top: 32px; flex-wrap: wrap; }
  .mkt-hero-note { font-size: 14px; color: var(--muted); }

  /* Live demo */
  .demo { background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-container); box-shadow: 0 1px 2px rgba(17,24,39,0.04), 0 32px 64px -32px rgba(17,24,39,0.20); font-variant-numeric: tabular-nums; }
  .demo-controls { display: grid; grid-template-columns: 1fr 160px; gap: 16px; padding: 24px 24px 0; }
  .demo-field { position: relative; }
  .demo-label { display: block; font-size: 12px; font-weight: 500; color: var(--ink-2); margin-bottom: 8px; }
  .demo-input { font-size: 16px; min-height: 48px; }
  .demo-amount { display: flex; align-items: center; gap: 8px; font-size: 16px; color: var(--muted); }
  .demo-amount .input { font-size: 16px; min-height: 48px; }
  .demo-suggest { position: absolute; z-index: 5; left: 0; right: 0; top: calc(100% + 4px); background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-control); box-shadow: var(--shadow-overlay); padding: 4px; }
  .demo-suggest-item { display: flex; justify-content: space-between; width: 100%; min-height: 40px; padding: 0 12px; border: none; background: none; border-radius: 4px; font: inherit; font-size: 14px; color: var(--ink); cursor: pointer; text-align: left; align-items: center; }
  .demo-suggest-item span { color: var(--muted); font-size: 12px; }
  .demo-suggest-item:hover { background: var(--sunken); }
  .demo-note { font-size: 12px; color: var(--ink-2); margin-top: 8px; }
  .demo-try { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; padding: 12px 24px 0; font-size: 12px; color: var(--muted); }
  .demo-chip { min-height: 32px; padding: 0 10px; border: 1px solid var(--hairline); border-radius: var(--radius-control); background: none; font: inherit; font-size: 12px; font-weight: 500; color: var(--ink-2); cursor: pointer; }
  .demo-chip:hover { color: var(--ink); border-color: var(--muted); }
  .demo-chip.is-active { color: var(--ink); border-color: var(--ink); }
  .demo-segmented { margin: 16px 24px 0; }
  .demo-results { margin-top: 24px; border-top: 1px solid var(--hairline); }
  .demo-best { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 28px 24px 28px 28px; box-shadow: inset 4px 0 0 var(--accent); background: var(--accent-wash); border-bottom: 1px solid var(--hairline); }
  .demo-best-card { display: flex; gap: 16px; align-items: center; min-width: 0; }
  .demo-best-card .swatch { width: 56px; height: 38px; border-radius: 6px; }
  .demo-best-label { font-size: 12px; font-weight: 500; color: var(--accent-ink); }
  .demo-best-name { font-size: 24px; font-weight: 600; letter-spacing: -0.01em; margin-top: 2px; }
  .demo-meta { font-size: 14px; color: var(--ink-2); margin-top: 4px; }
  .demo-best-value { text-align: right; flex-shrink: 0; }
  .demo-big { font-size: 40px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
  .demo-others-label { padding: 16px 24px 4px; font-size: 12px; font-weight: 500; color: var(--muted); }
  .demo-row { display: grid; grid-template-columns: 1fr 140px 90px; gap: 12px; align-items: center; padding: 14px 24px; border-bottom: 1px solid var(--hairline-soft); font-size: 14px; color: var(--ink-2); }
  .demo-row-name { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .demo-row-rate { color: var(--muted); }
  .demo-row-val { text-align: right; color: var(--ink); font-weight: 500; font-variant-numeric: tabular-nums; }
  .demo-foot { padding: 16px 24px 20px; font-size: 12px; line-height: 1.6; color: var(--muted); }
  .swatch { display: inline-block; width: 28px; height: 19px; border-radius: 3px; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
  .demo-how { font-size: 16px; color: var(--ink-2); margin: 0 0 20px; }
  .demo-how strong { color: var(--ink); font-weight: 600; }

  /* Product panels */
  .ui-panel { background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-container); overflow: hidden; box-shadow: 0 1px 2px rgba(17,24,39,0.04), 0 24px 48px -32px rgba(17,24,39,0.16); font-variant-numeric: tabular-nums; }
  .ui-panel-head { display: flex; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--hairline); font-size: 14px; font-weight: 500; color: var(--ink-2); }
  .ui-panel-head strong { color: var(--ink); font-weight: 600; }
  .credit-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .credit { padding: 20px 24px; border-bottom: 1px solid var(--hairline-soft); }
  .credit:nth-child(odd) { border-right: 1px solid var(--hairline-soft); }
  .credit-top { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .credit-name { font-size: 16px; font-weight: 500; color: var(--ink); }
  .credit-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .credit-amt { font-size: 14px; font-weight: 500; color: var(--ink-2); white-space: nowrap; }
  .credit-amt.is-done { color: var(--gain); }
  .bar { height: 4px; background: var(--sunken); border-radius: 2px; overflow: hidden; margin-top: 12px; }
  .bar > div { height: 100%; }
  .history-sum { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 24px; border-bottom: 1px solid var(--hairline); }
  .history-missed { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; margin-top: 4px; }
  .history-row { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center; padding: 14px 24px; border-bottom: 1px solid var(--hairline-soft); }

  /* Section layouts: each one different */
  .split-head { display: grid; grid-template-columns: 1.1fr 1fr; gap: 64px; align-items: end; margin-bottom: 48px; }
  .side-by-side { display: grid; grid-template-columns: 5fr 7fr; gap: 72px; align-items: start; }
  .sticky-col { position: sticky; top: 108px; }
  .facts { border-top: 1px solid var(--ink); margin-top: 48px; }
  .fact { display: grid; grid-template-columns: 240px 1fr; gap: 32px; padding: 28px 0; border-bottom: 1px solid var(--hairline); }
  .fact dt { font-size: 16px; font-weight: 600; }
  .fact dd { margin: 0; }
  .sources { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 6px; }
  .sources a { font-size: 14px; }
  .data-band { background: var(--surface); border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); }
  .data-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 64px; margin-top: 40px; }
  .data-item { padding: 20px 0; border-top: 1px solid var(--hairline); }
  .data-item h3 { font-size: 16px; font-weight: 600; }
  .data-item p { font-size: 14px; line-height: 1.6; color: var(--ink-2); margin-top: 4px; }
  .mkt-close { padding-block: 128px; text-align: center; }

  @media (max-width: 860px) {
    .mkt-nav-links { display: none; }
    .split-head, .side-by-side, .data-grid { grid-template-columns: 1fr; gap: 20px; }
    .sticky-col { position: static; }
    .fact { grid-template-columns: 1fr; gap: 8px; }
  }
  @media (max-width: 640px) {
    .mkt-wrap { padding: 0 16px; }
    .mkt-section { padding-block: 80px; }
    .mkt-hero { padding-block: 56px 40px; }
    .demo-controls { grid-template-columns: 1fr; padding: 16px 16px 0; }
    .demo-try { padding: 12px 16px 0; }
    .demo-segmented { margin: 12px 16px 0; }
    .demo-best { flex-direction: column; align-items: flex-start; padding: 20px 16px 20px 20px; gap: 16px; }
    .demo-best-value { text-align: left; }
    .demo-best-name { font-size: 20px; }
    .demo-big { font-size: 32px; }
    .demo-row { grid-template-columns: 1fr auto; padding: 14px 16px; }
    .demo-row-rate { display: none; }
    .demo-others-label, .demo-foot { padding-left: 16px; padding-right: 16px; }
    .credit-grid { grid-template-columns: 1fr; }
    .credit:nth-child(odd) { border-right: none; }
    .credit, .ui-panel-head, .history-sum, .history-row { padding-left: 16px; padding-right: 16px; }
    .mkt-close { padding-block: 88px; }
  }
`

// ── The full marketing body (sections below nav) ──────────
// cta: primary action; it differs for signed-in (/about) and logged-out (/)
export function MarketingBody({ cta, secondaryCta }) {
  return (
    <main>
      {/* Hero: the question, then the product answering it */}
      <section className="mkt-wrap mkt-hero">
        <h1 className="display-xl">Which card should I <em>use?</em></h1>
        <p className="mkt-lede">
          Type where you&apos;re paying. Clavis ranks every card in your wallet by what it actually earns there, counting the credits you haven&apos;t used yet.
        </p>
        <div className="mkt-hero-ctas">
          <a href={cta.href} className="pill-dark">{cta.label}</a>
          <span className="mkt-hero-note">Free. No bank login.</span>
        </div>
      </section>

      <section id="demo" className="mkt-wrap" style={{ scrollMarginTop: '80px' }}>
        <p className="demo-how"><strong>How it works:</strong> add your cards once, type where you&apos;re paying, and pay with the card at the top.</p>
        <LiveDemo/>
      </section>

      {/* Credits: split header over a full-width panel */}
      <section id="credits" className="mkt-wrap mkt-section" style={{ scrollMarginTop: '40px' }}>
        <div className="split-head">
          <h2 className="display-lg">Credits you pay for, tracked until they reset.</h2>
          <div>
            <p className="mkt-body">The Amex Gold alone comes with $10 a month in Uber Cash, $10 a month in dining credits and $7 a month at Dunkin&apos;. Each one resets whether you use it or not.</p>
            <p className="mkt-body">Clavis keeps every credit on one list, counts down to each reset, and moves the card with an unused credit to the top when you&apos;re at the merchant it covers.</p>
          </div>
        </div>
        <CreditsPanel/>
      </section>

      {/* History: narrow text beside a larger panel */}
      <section className="mkt-wrap mkt-section" style={{ paddingTop: 0 }}>
        <div className="side-by-side">
          <div className="sticky-col">
            <h2 className="display-lg">Every purchase, and what a better card would have earned.</h2>
            <p className="mkt-body" style={{ marginTop: '20px' }}>Log a purchase in one tap. Clavis records the card, the amount and the rewards, then checks each one against the rest of your wallet.</p>
            <p className="mkt-body">These are the demo wallet&apos;s last seven weeks, run through the same analysis the app uses.</p>
          </div>
          <HistoryPanel/>
        </div>
      </section>

      {/* Where the numbers come from: a plain statement and a list of facts */}
      <section id="numbers" className="mkt-wrap mkt-section" style={{ paddingTop: 0, scrollMarginTop: '40px' }}>
        <h2 className="display-lg" style={{ maxWidth: '720px' }}>Where the numbers come from.</h2>
        <dl className="facts">
          <div className="fact">
            <dt>Reward rates</dt>
            <dd>
              <p className="mkt-body">From each card issuer&apos;s published terms. The cards in this demo were last checked on <time dateTime={RATES_VERIFIED}>{RATES_VERIFIED_LABEL}</time>:</p>
              <ul className="sources">
                {SOURCES.map(s => <li key={s.card}><a className="mkt-link" href={s.url} target="_blank" rel="noopener noreferrer">{s.card}, {s.issuer}</a></li>)}
              </ul>
            </dd>
          </div>
          <div className="fact">
            <dt>Point values</dt>
            <dd><p className="mkt-body">Points and miles are converted to dollars at a conservative value close to what you&apos;d get as a statement credit, usually 1.0¢. Transfer partners can be worth more, but Clavis won&apos;t count on it. You can set your own value for each card.</p></dd>
          </div>
          <div className="fact">
            <dt>Credits</dt>
            <dd><p className="mkt-body">Amounts and reset schedules come from the issuer&apos;s terms. Annual credits currently reset on the calendar year.</p></dd>
          </div>
          <div className="fact">
            <dt>Rankings</dt>
            <dd><p className="mkt-body">Each card is scored on what it earns per dollar at that merchant. A card with an unused credit that covers the merchant goes to the top, because that credit is worth more than any rate difference. Estimates only: your issuer decides how each purchase is categorized.</p></dd>
          </div>
        </dl>
      </section>

      {/* Your data: structured facts, checked against the code */}
      <section id="data" className="data-band" style={{ scrollMarginTop: '40px' }}>
        <div className="mkt-wrap mkt-section">
          <h2 className="display-lg" style={{ maxWidth: '720px' }}>How your data is handled.</h2>
          <div className="data-grid">
            <div className="data-item"><h3>You add cards by hand</h3><p>Clavis never connects to your bank or card accounts. There is no bank login to give it.</p></div>
            <div className="data-item"><h3>No card numbers</h3><p>Clavis stores the card&apos;s name, its rates and credits, and, if you choose, its last four digits. Never the full number, expiry or security code.</p></div>
            <div className="data-item"><h3>Never sold</h3><p>Your data is used only to run Clavis. It goes to the services that host it (Supabase for the database and sign-in, Vercel for hosting, Resend for the emails you opt into) and nowhere else.</p></div>
            <div className="data-item"><h3>Unrecognized cards</h3><p>If you add a card Clavis doesn&apos;t know, its name, and only its name, is sent to Anthropic&apos;s Claude to look up its rates and credits.</p></div>
            <div className="data-item"><h3>Delete everything</h3><p>Deleting your account removes your cards, credits, purchases and email preferences.</p></div>
            <div className="data-item"><h3>Card links</h3><p>Some card suggestions in Insights link to issuers that pay Clavis a commission. It never changes which cards are recommended.</p></div>
          </div>
          <p className="mkt-body" style={{ marginTop: '32px' }}>Details are in the <Link className="mkt-link" href="/privacy">privacy policy</Link>.</p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mkt-wrap mkt-close">
        <h2 className="display-lg">Start getting more from every purchase.</h2>
        <p className="mkt-body" style={{ maxWidth: '440px', margin: '20px auto 0' }}>You already have the cards. Clavis makes sure you use the right one, and the credits that come with it.</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={cta.href} className="pill-dark">{cta.label}</a>
          {secondaryCta && <a href={secondaryCta.href} className="pill-outline">{secondaryCta.label}</a>}
        </div>
      </section>
    </main>
  )
}

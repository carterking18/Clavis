'use client'
import { useEffect, useRef, useState } from 'react'
import { money, moneyWhole } from '../lib/format.js'

// Cumulative rewards: best card per purchase (ink, emphasized) vs the best
// single card (gray, context). The shaded gap is what choosing per purchase
// is worth. Data comes from lib/valueOverTime.js.

const INK = '#111827'
const CONTEXT = '#8B929E'
const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function ValueChart({ data, height = 220, caption }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!data) return null
  const { points, singleCard, best, single, gain } = data
  const singleName = singleCard.name
  const narrow = width < 520
  const m = { top: 12, right: narrow ? 12 : 168, bottom: 28, left: 48 }
  const w = width - m.left - m.right
  const h = height - m.top - m.bottom

  const t0 = points[0].date.getTime()
  const t1 = points[points.length - 1].date.getTime()
  const x = d => m.left + (t1 === t0 ? w : ((d.getTime() - t0) / (t1 - t0)) * w)
  const step = niceStep((best * 1.08) / 2)
  const yMax = step * 2
  const y = v => m.top + h - (v / yMax) * h
  const ticks = [0, step, yMax]

  const line = key => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
  const gap = `${line('best')}${points.slice().reverse().map(p => `L${x(p.date).toFixed(1)},${y(p.single).toFixed(1)}`).join('')}Z`

  // End labels: keep them apart; if they'd collide, drop the lower one beneath
  const yBest = y(best), ySingle = y(single)
  const labelGap = 30
  const ySingleLabel = ySingle - yBest < labelGap ? yBest + labelGap : ySingle

  const nearest = clientX => {
    const rect = wrapRef.current.querySelector('svg').getBoundingClientRect()
    const px = clientX - rect.left
    let bestI = 0, bestD = Infinity
    points.forEach((p, i) => { const d = Math.abs(x(p.date) - px); if (d < bestD) { bestD = d; bestI = i } })
    return bestI
  }
  const hp = hover != null ? points[hover] : null

  return (
    <figure className="vc" ref={wrapRef} style={{ margin: 0 }}>
      <div className="vc-head">
        <div>
          <div className="vc-big">{money(gain, { sign: true })}</div>
          <div className="vc-sub">vs a {singleName} on everything</div>
        </div>
        <div className="vc-legend" aria-hidden="true">
          <span><i style={{ background: INK }}/>Best card every time</span>
          <span><i style={{ background: CONTEXT }}/>{singleName}</span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" tabIndex={0}
        aria-label={`Rewards over ${points.length} purchases: ${money(best)} using the best card each time, ${money(single)} with a ${singleName}.`}
        onPointerMove={e => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(points.length - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') setHover(i => Math.max(0, (i ?? points.length - 1) - 1))
          if (e.key === 'ArrowRight') setHover(i => Math.min(points.length - 1, (i ?? 0) + 1))
        }}
        style={{ display: 'block', touchAction: 'pan-y', outline: 'none' }}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} stroke="rgba(17,24,39,0.08)" strokeWidth="1"/>
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="12" fill="#626A77">{Number.isInteger(t) ? `$${t}` : money(t)}</text>
          </g>
        ))}
        <text x={m.left} y={height - 8} fontSize="12" fill="#626A77">{fmtDate(points[0].date)}</text>
        <text x={m.left + w} y={height - 8} fontSize="12" fill="#626A77" textAnchor="end">{fmtDate(points[points.length - 1].date)}</text>

        <path d={gap} fill="rgba(17,24,39,0.07)"/>
        <path d={line('single')} fill="none" stroke={CONTEXT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <path d={line('best')} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={x(points[points.length - 1].date)} cy={yBest} r="4" fill={INK} stroke="#fff" strokeWidth="2"/>
        <circle cx={x(points[points.length - 1].date)} cy={ySingle} r="4" fill={CONTEXT} stroke="#fff" strokeWidth="2"/>

        {!narrow && (
          <g fontSize="12">
            <text x={m.left + w + 12} y={yBest - 6} fill={INK} fontWeight="600">{money(best)}</text>
            <text x={m.left + w + 12} y={yBest + 9} fill="#4B5563">Best card every time</text>
            <text x={m.left + w + 12} y={ySingleLabel - 6} fill={INK} fontWeight="600">{money(single)}</text>
            <text x={m.left + w + 12} y={ySingleLabel + 9} fill="#4B5563">{truncate(singleName, 22)}</text>
          </g>
        )}

        {hp && (
          <g pointerEvents="none">
            <line x1={x(hp.date)} x2={x(hp.date)} y1={m.top} y2={m.top + h} stroke="rgba(17,24,39,0.25)" strokeWidth="1"/>
            <circle cx={x(hp.date)} cy={y(hp.best)} r="4" fill={INK} stroke="#fff" strokeWidth="2"/>
            <circle cx={x(hp.date)} cy={y(hp.single)} r="4" fill={CONTEXT} stroke="#fff" strokeWidth="2"/>
          </g>
        )}
      </svg>
      {hp && (
        <div className="vc-tip" role="status" style={{ left: Math.min(Math.max(x(hp.date) - 90, 0), width - 180) }}>
          <div className="vc-tip-date">{fmtDate(hp.date)}</div>
          <div><i style={{ background: INK }}/><strong>{money(hp.best)}</strong> best card</div>
          <div><i style={{ background: CONTEXT }}/><strong>{money(hp.single)}</strong> {truncate(singleName, 18)}</div>
        </div>
      )}
      </div>

      {caption && <figcaption className="vc-caption">{caption}</figcaption>}

      <details className="vc-table">
        <summary>View as table</summary>
        <table>
          <thead><tr><th scope="col">Date</th><th scope="col">Best card every time</th><th scope="col">{singleName}</th></tr></thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}><td>{fmtDate(p.date)}</td><td>{money(p.best)}</td><td>{money(p.single)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

// Smallest round step (1, 1.5, 2, 2.5 ... 10 x 10^k) that is >= v, so ticks stay round
function niceStep(v) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * p).find(c => c >= v)
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export const valueChartStyles = `
  .vc { position: relative; font-variant-numeric: tabular-nums; }
  .vc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
  .vc-big { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; color: var(--gain); line-height: 1.1; }
  .vc-sub { font-size: 14px; color: var(--ink-2); margin-top: 2px; }
  .vc-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--ink-2); }
  .vc-legend span, .vc-tip div { display: inline-flex; align-items: center; gap: 6px; }
  .vc-legend i, .vc-tip i { display: inline-block; width: 14px; height: 2px; border-radius: 1px; }
  .vc svg:focus-visible { box-shadow: var(--focus-ring); border-radius: 4px; }
  .vc-tip { position: absolute; top: 4px; width: 180px; padding: 8px 10px; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-control); box-shadow: var(--shadow-overlay); font-size: 12px; color: var(--ink-2); pointer-events: none; display: flex; flex-direction: column; gap: 3px; }
  .vc-tip strong { color: var(--ink); font-weight: 600; }
  .vc-tip-date { color: var(--muted); }
  .vc-caption { font-size: 12px; color: var(--muted); margin-top: 8px; }
  .vc-table { margin-top: 8px; font-size: 12px; color: var(--ink-2); }
  .vc-table summary { cursor: pointer; color: var(--ink-2); min-height: 32px; display: inline-flex; align-items: center; }
  .vc-table table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .vc-table th, .vc-table td { text-align: right; padding: 6px 4px; border-bottom: 1px solid var(--hairline-soft); }
  .vc-table th:first-child, .vc-table td:first-child { text-align: left; }
  .vc-table th { font-weight: 500; color: var(--muted); }
`

// ── Is each card paying for itself? ───────────────────────
// One row per card with an annual fee: captured this year (credits used +
// rewards, solid) then credit still available before Dec 31 (light, same
// hue), against a tick at the annual fee. Data from lib/cardValue.js.

const GAIN = '#047857'
const GAIN_LIGHT = 'rgba(4,120,87,0.24)'

export function CardValueChart({ data, caption }) {
  const [hover, setHover] = useState(null)
  if (!data || data.rows.length === 0) return null
  const { rows, totals } = data
  const scale = Math.max(...rows.map(r => Math.max(r.fee, r.captured + r.available))) * 1.04
  const pct = v => `${Math.min(100, (v / scale) * 100)}%`

  return (
    <figure className="cv" style={{ margin: 0 }}>
      <div className="vc-head">
        <div>
          <div className="vc-big" style={{ color: 'var(--ink)' }}>{moneyWhole(totals.captured)} <span className="cv-of">of {moneyWhole(totals.fees)} in fees</span></div>
          <div className="vc-sub">{moneyWhole(totals.available)} in credits still available this year</div>
        </div>
        <div className="vc-legend" aria-hidden="true">
          <span><b className="cv-key" style={{ background: GAIN }}/>Credits used + rewards</span>
          <span><b className="cv-key" style={{ background: GAIN_LIGHT }}/>Credits still available</span>
          <span><b className="cv-key cv-key-fee"/>Annual fee</span>
        </div>
      </div>

      <ul className="cv-rows">
        {rows.map((r, i) => {
          const covered = r.captured >= r.fee
          return (
            <li key={r.card.id} className="cv-row" tabIndex={0}
              onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              aria-label={`${r.card.name}: ${moneyWhole(r.captured)} of ${moneyWhole(r.fee)} annual fee covered, ${moneyWhole(r.available)} in credits still available.`}>
              <div className="cv-label">
                <span className="cv-name">{r.card.name}</span>
                <span className="cv-value"><strong>{moneyWhole(r.captured)}</strong> of {moneyWhole(r.fee)}{covered && ' · paid for itself'}</span>
              </div>
              <div className="cv-track" aria-hidden="true">
                <span className="cv-seg" style={{ width: pct(r.captured), background: GAIN }}/>
                {r.available > 0 && <span className="cv-seg cv-seg-avail" style={{ width: pct(r.available), background: GAIN_LIGHT }}/>}
                <span className="cv-fee" style={{ left: pct(r.fee) }}/>
              </div>
              {r.next && !covered && (
                <div className="cv-next">Next: use your {moneyWhole(r.next.left)} {r.next.perk.name}</div>
              )}
              {hover === i && (
                <div className="vc-tip cv-tip" role="status">
                  <div className="vc-tip-date">{r.card.name}</div>
                  <div><strong>{money(r.credits)}</strong> credits used</div>
                  <div><strong>{money(r.rewards)}</strong> rewards logged</div>
                  <div><strong>{moneyWhole(r.available)}</strong> credits still available</div>
                  {r.lost > 0 && <div><strong>{moneyWhole(r.lost)}</strong> credits expired unused</div>}
                  <div><strong>{moneyWhole(r.fee)}</strong> annual fee</div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {caption && <figcaption className="vc-caption">{caption}</figcaption>}

      <details className="vc-table">
        <summary>View as table</summary>
        <table>
          <thead><tr><th scope="col">Card</th><th scope="col">Credits used</th><th scope="col">Rewards</th><th scope="col">Still available</th><th scope="col">Annual fee</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.card.id}><td>{r.card.name}</td><td>{money(r.credits)}</td><td>{money(r.rewards)}</td><td>{moneyWhole(r.available)}</td><td>{moneyWhole(r.fee)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export const cardValueStyles = `
  .cv-of { font-size: 16px; font-weight: 500; color: var(--ink-2); letter-spacing: 0; }
  .cv-key { display: inline-block; width: 12px; height: 8px; border-radius: 2px; }
  .cv-key-fee { width: 2px; height: 12px; border-radius: 1px; background: var(--ink); }
  .cv-rows { list-style: none; padding: 0; margin: 4px 0 0; }
  .cv-row { position: relative; padding: 12px 0; border-top: 1px solid var(--hairline-soft); outline: none; }
  .cv-row:first-child { border-top: none; }
  .cv-row:focus-visible { box-shadow: var(--focus-ring); border-radius: 4px; }
  .cv-label { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; font-size: 14px; }
  .cv-name { color: var(--ink); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .cv-value { color: var(--ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .cv-value strong { color: var(--ink); font-weight: 600; }
  .cv-track { position: relative; display: flex; gap: 2px; height: 12px; background: var(--sunken); border-radius: 3px; }
  .cv-seg { display: block; height: 100%; border-radius: 3px; min-width: 0; }
  .cv-fee { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; background: var(--ink); border-radius: 1px; }
  .cv-next { font-size: 12px; color: var(--ink-2); margin-top: 8px; }
  .cv-tip { top: calc(100% - 6px); right: 0; left: auto !important; z-index: 30; }
`

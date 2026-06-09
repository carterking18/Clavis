// Shared marketing page components used by both / and /about

// ── Key logo ─────────────────────────────────────────────
export function KeySVG({ size = 20, id = 'mk1' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
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

// ── Shared layout for legal/info pages (Privacy, Terms, FAQ) ──
export function LegalLayout({ title, meta, children, navId = 'lglkey', ftId = 'lglftkey' }) {
  return (
    <>
      <style>{marketingStyles}</style>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(9,9,12,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <KeySVG size={18} id={navId}/>
              <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', color: '#dddde4' }}>CLAVIS</span>
            </a>
            <a href="/dashboard" className="pill-dark" style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px' }}>
              ← Dashboard
            </a>
          </div>
        </nav>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 96px' }}>
          <h1 className="display-lg" style={{ marginBottom: '8px' }}>{title}</h1>
          {meta && <p style={{ fontSize: '13px', color: 'var(--text-faintest)', marginBottom: '40px' }}>{meta}</p>}
          {children}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: 0 }}/>
        <footer style={{ padding: '32px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeySVG size={16} id={ftId}/>
              <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', color: 'rgba(221,221,228,0.35)' }}>CLAVIS</span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(221,221,228,0.2)' }}>
              © {new Date().getFullYear()} Clavis · One card. Every reward.
            </span>
          </div>
        </footer>
      </div>
    </>
  )
}

// ── Content primitives for legal/info pages ──────────────
export function LegalH2({ children }) {
  return <h2 style={{ fontSize: '19px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em', marginTop: '40px', marginBottom: '14px' }}>{children}</h2>
}

export function LegalP({ children }) {
  return <p style={{ fontSize: '14.5px', lineHeight: '1.7', color: 'var(--text-secondary)', marginBottom: '14px' }}>{children}</p>
}

export function LegalList({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: '22px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '14.5px', lineHeight: '1.7', color: 'var(--text-secondary)', marginBottom: '6px' }}>{item}</li>
      ))}
    </ul>
  )
}

// ── Hero card-stack illustration ──────────────────────────
export function HeroArt() {
  const bars   = [12, 20, 16, 28, 14, 18]
  const groups = [0, 1, 2, 3]
  const dots   = [0, 1, 2, 3]

  return (
    <svg
      viewBox="0 0 520 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: '520px', display: 'block' }}
    >
      <defs>
        <linearGradient id="msGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#B8911F"/>
          <stop offset="100%" stopColor="#C9A227"/>
        </linearGradient>
        <pattern id="msDots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.04)"/>
        </pattern>
      </defs>

      <rect width="520" height="420" fill="url(#msDots)"/>

      {/* Card C — back */}
      <g transform="rotate(-14 240 215)">
        <rect x="60" y="108" width="300" height="188" rx="10" fill="#F3F4F6" stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
      </g>

      {/* Card B — middle */}
      <g transform="rotate(-6 240 215)">
        <rect x="60" y="108" width="300" height="188" rx="10" fill="#F9FAFB" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
        <rect x="84" y="132" width="26" height="20" rx="3" fill="#E5E7EB"/>
      </g>

      {/* Card A — front, gold-bordered */}
      <rect x="60" y="108" width="300" height="188" rx="10" fill="#FFFFFF" stroke="rgba(201,162,39,0.5)" strokeWidth="1.5"/>
      <rect x="60" y="108" width="5" height="188" rx="2.5" fill="url(#msGold)"/>

      {/* Chip */}
      <rect x="83" y="131" width="28" height="22" rx="4" fill="#F3F4F6" stroke="rgba(201,162,39,0.3)" strokeWidth="1"/>
      <line x1="83"  y1="139" x2="111" y2="139" stroke="rgba(201,162,39,0.18)" strokeWidth="0.8"/>
      <line x1="83"  y1="145" x2="111" y2="145" stroke="rgba(201,162,39,0.18)" strokeWidth="0.8"/>
      <line x1="97"  y1="131" x2="97"  y2="153" stroke="rgba(201,162,39,0.12)" strokeWidth="0.8"/>

      {/* PAN dots */}
      {groups.map(g => dots.map(d => (
        <circle key={`${g}-${d}`} cx={83 + g * 30 + d * 6} cy={186} r="2.4" fill="rgba(17,24,39,0.15)"/>
      )))}

      {/* Cardholder bars */}
      <rect x="83" y="204" width="78" height="6" rx="2" fill="rgba(17,24,39,0.07)"/>
      <rect x="83" y="214" width="55" height="5" rx="2" fill="rgba(17,24,39,0.04)"/>

      {/* Network circles */}
      <circle cx="330" cy="134" r="17" fill="rgba(201,162,39,0.08)" stroke="rgba(201,162,39,0.25)"  strokeWidth="1"/>
      <circle cx="318" cy="134" r="11" fill="rgba(201,162,39,0.05)" stroke="rgba(201,162,39,0.18)" strokeWidth="1"/>

      {/* Rate badge */}
      <rect x="374" y="90" width="100" height="66" rx="6" fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
      <rect x="385" y="100" width="44" height="5"  rx="2" fill="rgba(17,24,39,0.06)"/>
      <rect x="385" y="114" width="76" height="4"  rx="2" fill="rgba(201,162,39,0.12)"/>
      <text x="385" y="148" fontSize="30" fontWeight="700" fill="#C9A227" fontFamily="system-ui,sans-serif">4×</text>
      <text x="416" y="148" fontSize="11"              fill="rgba(17,24,39,0.35)" fontFamily="system-ui,sans-serif"> pts</text>

      {/* Dashed connector */}
      <line x1="360" y1="133" x2="375" y2="124" stroke="rgba(201,162,39,0.25)" strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx="360" cy="134" r="2.5" fill="rgba(201,162,39,0.5)"/>

      {/* Recommended pill */}
      <rect x="374" y="172" width="116" height="34" rx="6" fill="rgba(201,162,39,0.06)" stroke="rgba(201,162,39,0.28)" strokeWidth="1"/>
      <circle cx="393" cy="189" r="7" fill="#C9A227"/>
      <path d="M390 189 L392.5 191.5 L397 186" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="406" y="185" width="52" height="4"  rx="2" fill="rgba(201,162,39,0.5)"/>
      <rect x="406" y="193" width="36" height="3"  rx="1.5" fill="rgba(201,162,39,0.22)"/>

      {/* Stats panel */}
      <rect x="60" y="318" width="300" height="74" rx="6" fill="#FFFFFF" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
      <rect x="76" y="330" width="54" height="5"   rx="2" fill="rgba(17,24,39,0.06)"/>

      {/* Bar chart */}
      {bars.map((h, i) => (
        <rect key={i} x={76 + i * 28} y={374 - h} width="16" height={h} rx="2"
          fill={i === 3 ? '#C9A227' : 'rgba(201,162,39,0.15)'}/>
      ))}

      {/* Right stat */}
      <text x="294" y="356" fontSize="19" fontWeight="700" fill="rgba(201,162,39,0.9)" fontFamily="system-ui,sans-serif">7.2¢</text>
      <rect x="294" y="362" width="50" height="4" rx="2" fill="rgba(17,24,39,0.05)"/>
      <text x="294" y="378" fontSize="9"            fill="rgba(17,24,39,0.3)" fontFamily="system-ui,sans-serif">per dollar</text>
    </svg>
  )
}

// ── Card comparison table ─────────────────────────────────
export function ComparisonArt() {
  const rows = [
    { name: 'Chase Sapphire Reserve', rate: '4×',   val: '7.2¢', highlight: true  },
    { name: 'Amex Gold Card',         rate: '4×',   val: '7.2¢', highlight: false },
    { name: 'Capital One Venture X',  rate: '2×',   val: '3.7¢', highlight: false },
    { name: 'Freedom Unlimited',      rate: '1.5×', val: '1.5¢', highlight: false },
  ]
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden', width: '100%', maxWidth: '440px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {['Card','Rate','Value'].map(h => (
          <span key={h} style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: h === 'Card' ? 'left' : 'right' }}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '13px 16px', borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: row.highlight ? 'rgba(201,162,39,0.04)' : 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: row.highlight ? '#C9A227' : 'transparent', flexShrink: 0 }}/>
            <span style={{ fontSize: '12px', fontWeight: row.highlight ? '600' : '400', color: row.highlight ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: '700', color: row.highlight ? '#C9A227' : 'var(--text-faintest)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.rate}</span>
          <span style={{ fontSize: '12px', fontWeight: '500', color: row.highlight ? 'rgba(201,162,39,0.8)' : 'var(--text-faintest)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.val}</span>
        </div>
      ))}
      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(201,162,39,0.03)' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', color: '#C9A227' }}>◉ &nbsp;Recommended · Chase Sapphire Reserve</span>
      </div>
    </div>
  )
}

// ── Perk tracker visual ───────────────────────────────────
export function PerkArt() {
  const perks = [
    { name: 'Travel Credit',  total: 300, used: 240, warn: false, done: false },
    { name: 'Dining Credit',  total: 120, used: 120, warn: false, done: true  },
    { name: 'Streaming',      total: 15,  used: 8,   warn: true,  done: false },
    { name: 'Global Entry',   total: 100, used: 100, warn: false, done: true  },
  ]
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden', width: '100%', maxWidth: '440px' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Perk Tracker</span>
        <span style={{ fontSize: '10px', fontWeight: '600', color: '#C9A227' }}>4 active</span>
      </div>
      {perks.map((p, i) => {
        const pct = Math.min(100, (p.used / p.total) * 100)
        return (
          <div key={i} style={{ padding: '14px 16px', borderBottom: i < perks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {p.warn && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#B45309', display: 'inline-block', flexShrink: 0 }}/>}
                <span style={{ fontSize: '12px', fontWeight: '500', color: p.warn ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.name}</span>
                {p.warn && <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309', background: 'rgba(180,83,9,0.08)', padding: '1px 6px', borderRadius: '9999px' }}>3d left</span>}
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: p.done ? '#0F9B65' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>${p.used}/${p.total}</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', background: p.done ? '#0F9B65' : p.warn ? '#B45309' : '#C9A227' }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Rewards bar chart ─────────────────────────────────────
export function ChartArt() {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D']
  const vals   = [42, 58, 67, 71, 89, 94, 78, 112, 98, 103, 88, 64]
  const max    = Math.max(...vals)

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '20px', width: '100%', maxWidth: '440px' }}>
      <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Earned this year</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>$847<span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>.20</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,155,101,0.08)', border: '1px solid rgba(15,155,101,0.2)', borderRadius: '9999px', padding: '4px 10px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#0F9B65' }}>↑ 23%</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '72px', marginTop: '16px', marginBottom: '6px' }}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: `${(v / max) * 100}%`, borderRadius: '2px 2px 0 0', background: i === 7 ? '#C9A227' : 'rgba(201,162,39,0.15)' }}/>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {months.map((m, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '8px', fontWeight: '600', color: i === 7 ? '#C9A227' : 'var(--text-faintest)' }}>{m}</div>
        ))}
      </div>
    </div>
  )
}

// ── Shared section styles injected via <style> ────────────
export const marketingStyles = `
  .mkt-nav-link {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s;
    letter-spacing: 0.01em;
  }
  .mkt-nav-link:hover { color: var(--text-primary); }

  .mkt-section {
    padding: 96px 24px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .mkt-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }

  .mkt-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
  }

  .mkt-body {
    font-size: 16px;
    line-height: 1.65;
    color: var(--text-secondary);
    font-weight: 400;
    margin-top: 16px;
  }

  .mkt-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0;
  }

  @media (max-width: 768px) {
    .mkt-grid { grid-template-columns: 1fr; gap: 48px; }
    .mkt-grid-reverse { direction: ltr; }
    .mkt-section { padding: 64px 20px; }
    .display-xl { font-size: 2.2rem !important; }
    .display-lg { font-size: 1.65rem !important; }
    .hero-ctas { flex-direction: column !important; align-items: flex-start !important; }
    .nav-links { display: none !important; }
  }
`

// ── The full marketing body (sections below nav) ──────────
export function MarketingBody() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: '80px 24px 96px', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="mkt-grid" style={{ gap: '60px' }}>
          <div>
            <div className="mkt-label">Free to use</div>
            <h1 className="display-xl">
              Which card<br/>
              <span className="gradient-text">should I use?</span>
            </h1>
            <p className="mkt-body" style={{ maxWidth: '420px' }}>
              Clavis looks at every card in your wallet and tells you which one earns the most at wherever you are shopping. Add your cards once and it handles the rest.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeroArt/>
          </div>
        </div>
      </section>

      <hr className="mkt-divider"/>

      {/* How it works */}
      <section id="how-it-works" className="mkt-section">
        <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 64px' }}>
          <div className="mkt-label">How it works</div>
          <h2 className="display-lg">Set up in minutes.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {[
            { step: '01', title: 'Add your cards',     body: 'Enter the cards you already have. Clavis fills in the reward rates and perks for you based on the card name.' },
            { step: '02', title: 'Search a merchant',  body: 'Type where you are shopping or pick a category like dining, travel, or grocery. Clavis figures out the rest.' },
            { step: '03', title: 'Use the right card', body: 'Clavis ranks every card by how much you will actually earn and highlights the best pick. Tap to log the purchase.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '32px 28px', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.16em', color: 'rgba(201,162,39,0.5)', marginBottom: '16px' }}>{item.step}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: '1.3' }}>{item.title}</div>
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="mkt-divider"/>

      {/* Feature 1: Smart selection */}
      <section id="features" className="mkt-section">
        <div className="mkt-grid">
          <div>
            <div className="mkt-label">Smart selection</div>
            <h2 className="display-lg">Never guess<br/><span className="gradient-text">again.</span></h2>
            <p className="mkt-body">At Chipotle your Amex Gold earns 4x. At Target your Freedom earns 5%. Clavis knows the difference and tells you before you pay, not after.</p>
            <ul style={{ marginTop: '24px', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Shows real dollar value, not just points', 'Factors in expiring credits automatically', 'You can always override and pick manually'].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C9A227', flexShrink: 0 }}/>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><ComparisonArt/></div>
        </div>
      </section>

      <hr className="mkt-divider"/>

      {/* Feature 2: Perk tracking (flipped) */}
      <section className="mkt-section">
        <div className="mkt-grid mkt-grid-reverse" style={{ direction: 'rtl' }}>
          <div style={{ direction: 'ltr' }}>
            <div className="mkt-label">Perk tracking</div>
            <h2 className="display-lg">Stop losing<br/><span className="gradient-text">benefits you paid for.</span></h2>
            <p className="mkt-body">Most cards come with travel credits, dining credits, and streaming perks that reset every year. Clavis tracks all of them and reminds you before they expire.</p>
            <ul style={{ marginTop: '24px', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Alerts 14 days before a perk expires', 'See every unused credit across all your cards', 'Weekly email so nothing slips through'].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C9A227', flexShrink: 0 }}/>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ direction: 'ltr', display: 'flex', justifyContent: 'center' }}><PerkArt/></div>
        </div>
      </section>

      <hr className="mkt-divider"/>

      {/* Feature 3: Insights */}
      <section id="insights" className="mkt-section">
        <div className="mkt-grid">
          <div>
            <div className="mkt-label">Insights</div>
            <h2 className="display-lg">See what you<br/><span className="gradient-text">are actually earning.</span></h2>
            <p className="mkt-body">Track every purchase and the rewards it earned. Clavis also shows you past purchases where a different card would have done better, so you can improve over time.</p>
            <ul style={{ marginTop: '24px', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Total rewards earned by month', 'See which past purchases used the wrong card', 'Spot which categories you are missing out on'].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C9A227', flexShrink: 0 }}/>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><ChartArt/></div>
        </div>
      </section>
    </>
  )
}

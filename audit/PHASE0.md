# Phase 0 audit

Branch: `redesign/institutional` (from `main` at `e87f3b6`). No product code changed in this phase.

Evidence:
- `audit/before/`: landing (logged out `/`, signed-in `/about`) and `/auth` at 390, 768 and 1440px, 100% zoom, captured from local `main`.
- `audit/before/app-live/`: Tap, Wallet, Perks, History, Insights from claviscard.com, provided by Carter at mixed browser zoom. **Not** yet at 390/768/1440 or 100% zoom.
- `audit/inventory.txt`: every hard-coded color, font, size, weight, radius, shadow, padding, gap and letter-spacing in `app/` and `lib/`.
- Screenshots are gitignored because the app screens show real account data.

---

## 1. References

Measured at 1440px with computed styles, plus visual review. Principles only.

### Stripe (stripe.com)
1. **Type scale:** one family (Söhne) for everything. Headings are weight **300**, not bold: about 48px for section display, 28px for h2, 22px for tile titles, 16px for body. Slight negative tracking (−0.01 to −0.02em). Section headlines run as one sentence, an ink lead clause followed by a slate continuation. The two tones are tonal, not an accent color.
2. **Spacing rhythm:** 1266px container with visible 1px vertical guide lines at both edges and hairline dividers between sections. Large gaps between sections (about 120–160px), tight spacing inside components.
3. **Border/radius:** 4–6px radii on about 185 of 240 rounded elements. 1px hairline borders (`#E5EDF5`). Buttons are 4–6px rectangles, not pills.
4. **Color restraint:** text is ink navy `#061B31` with slate `#50617A`, plus one accent (`#533AFD`) for CTAs and links. The vivid gradient is confined to the hero and a few product tiles.
5. **Product UI:** realistic product composites at near-actual scale inside bordered tiles: a checkout, a usage meter, and a connected-accounts table with ten believable rows and amounts. Proof is a 4-up stat row (135+ / $1.9T / 99.999% / 200M+) and named customer stories.

### Palantir (Ontology page)
1. **Type scale:** one grotesk (Alliance No.1), at weight **400** on 178 of 197 text nodes. 100px page title, 50px section heads, normal tracking. Monospace is used only for diagram callouts.
2. **Spacing rhythm:** content sits in large white panels on `#FAFAFA` with about 30px gutters. A single centered declarative statement gets a whole band of whitespace.
3. **Border/radius:** 8px panels. One 1px dark outline on the media frame, thin grey hairlines in diagrams. Essentially no shadows (one in the whole page).
4. **Color restraint:** near-monochrome ink `#202426` on white/`#FAFAFA` with one lavender family (`#F0EEFF` backgrounds, `#967EFF` accent text). *Note: it also uses two-tone headings (ink plus a lavender phrase).* Two-tone alone isn't the problem. Doing it mechanically on every section, in the brand accent, is.
5. **Product UI:** explains how the system works with isometric line diagrams and mono labels rather than screenshots. Supporting content is a 2×2 of title, paragraph and "Read more".

### Q2 (q2.com)
1. **Type scale:** Lexend throughout. Heavy (600) headings at 52–72px with tight tracking (−0.04em), 16/20px body.
2. **Spacing rhythm:** alternating full-bleed bands (light, black, light) in section containers with 40–48px rounded corners. Centered hero.
3. **Border/radius:** heavily rounded: 16px cards (101 of them) and pill buttons. Almost no borders.
4. **Color restraint:** the least restrained of the three. Charcoal `#1F2025` dominates, but gradient-filled accent words and a coral CTA add color.
5. **Product UI and proof:** stylized device mockups. Credibility comes from **structured third-party proof**: analyst award cards (IDC, Javelin, Datos), a named customer quote with title and bank, and "Read story" links.

### What we adopt
- **Stripe (primary):**
  - Real product UI at real scale carries the page.
  - One precise type system.
  - Hairline borders with small radii (one container radius, one control radius).
  - Tonal hierarchy (ink, then muted) instead of accent-colored headline halves.
  - Tight spacing inside components, generous spacing between sections.
  - **Not** the gradients.
- **Palantir (primary):**
  - Restraint: near-monochrome with one accent.
  - One display weight.
  - Large declarative statements with room around them.
  - No decorative shadows or ornaments.
  - A plain explanation of *how it works* (fits "Where the numbers come from").
- **Q2 (secondary, tone only):**
  - Structured, checkable proof.
  - Clavis has no awards or customer logos, so proof means verifiable facts instead: what data we store, where rates come from, the valuation method, and a "rates last verified" date.
  - **Not** its pills, gradients or coral.

**Type implication to flag:** all three references use a single sans. You picked Pairing A (Instrument Serif headlines + Geist). It can work if the serif is used sparingly and set correctly. But the references point more toward Pairing B (Geist only, light/regular display weight). I'll proceed with A unless you want to revisit it.

---

## 2. Inventory (summary; full list in `inventory.txt`)

| Token type | Distinct values | Notes |
|---|---|---|
| Hex colors | 113 (219 uses) | `#C9A227` gold ×43; many one-off card gradients in `lib/cardImages.js` |
| rgb/rgba colors | 88 (178 uses) | many gold-alpha variants |
| Font sizes (inline) | 29 | 13/11/12/14px dominate; 9, 9.5, 10.5, 11.5, 12.5, 13.5 also used |
| Font weights | 5 | 400, 500, 600, 700, 800; 700 most common |
| Border radii | 17 | 6/4/8px, 9999px pills, 50%, plus 2/3/5/10/12/14/16/20px |
| Box shadows | 9 | all ad hoc |
| Padding values | 91 | no spacing scale |
| Gap values | 15 | |
| Letter-spacing | 14 | |
| Uppercase text | 40 uses | |

**Fonts:**
- **Serif:** Instrument Serif (`next/font`, `--font-instrument`). It's loaded at weight 400 only but set at 700, so the browser fakes a bold.
- **Sans:** Geist is confirmed (`--font-geist`).

Also in use:
- Georgia (tour modal)
- `var(--font-dm-sans)` in `install-prompt.js`, which is never loaded, so it falls back
- the system font stack (`global-error.js`)
- `monospace` (one dashboard formula)

**Colors in practice:**
- ink `#111827`
- paper `#FAFAFA`
- gold `#C9A227`
- green `#0F9B65`
- red (`--red`)
- orange `#B45309`
- dark nav `rgba(9,9,12,.85)` with 12px blur
- blue buttons on Insights (affiliate "Apply")
- a tan panel on Insights

---

## 3. Known findings: confirmed or refuted

### Landing
| Finding | Status | Evidence |
|---|---|---|
| Template skeleton (hero, bordered 01/02/03, zigzag with mirrored Perk section, eyebrow + heading + 3 bullets) | **Confirmed** | `marketing-sections.js` `MarketingBody`; Perk section uses `direction: rtl` |
| Every heading two-tone (black + gold) | **Confirmed** | `.gradient-text` spans in every heading, incl. closing CTA and `/auth` |
| Gold eyebrows on every heading | **Confirmed** | `.mkt-label`; also "See it in action" and "Get started" |
| Gold everywhere | **Confirmed** | eyebrows, headline halves, bullet dots, chart bars, hero card border, tour button |
| Mock UI small and generic | **Confirmed** | 440px max-width mocks |
| Footer very low contrast | **Confirmed** | `/`: `#9CA3AF` on `#FAFAFA` = **2.4:1**. `/about` and legal pages: `rgba(221,221,228,.2)` on `#FAFAFA` ≈ 1.1:1, a leftover dark-theme color |
| Closing CTA missing when signed in | **Confirmed: hidden, not scroll-reveal** | CTA is written only in `app/page.js`; `/about` uses `MarketingBody` without it. No `data-reveal` on landing |
| Two typographic voices | **Confirmed**, plus a third (Georgia) | see Inventory |
| "At Target your Freedom earns 5%" | **Confirmed wrong vs. app data** | `lib/cardRewards.js`: Freedom Unlimited 1.5x retail; Freedom Flex 1x (rotating 5x not modeled). Issuer terms still to check in Phase 1 |
| Demo tie: CSR and Gold both 4x / 7.2¢, CSR "recommended" | **Confirmed, and worse** | App data has CSR at **3x** dining, not 4x. 7.2¢ implies 1.8¢/pt; the app values Gold at 1.0¢ and CSR at 1.5¢ |

### App
| Finding | Status | Evidence |
|---|---|---|
| Palette without rules | **Confirmed** | green toggle; green "left" amounts; red remove; tan Insights box; History "This month" green vs "All time" gold; blue affiliate buttons (new) |
| 11+ uppercase micro-labels; mixed radii | **Confirmed** | 40 uppercase uses; 17 radii |
| Grey placeholder thumbnails with repeated "AMEX" | **Confirmed in effect** | `CardArt` draws an issuer-ish gradient with the network word in `--text-secondary` (dark grey on dark gradients). Amex Platinum's is grey, so History is a column of grey "AMEX" tiles |
| Nav wider than content; low-contrast inactive items | **Confirmed** | nav inner 1100px vs `.app` 760px. Inactive items `#4B5563` on the dark bar = **1.82:1** (target ≥4.5:1) |
| Perks "resets in −103d" | **Confirmed, root cause found** | `dashboard/page.js:284` rolls a perk forward only if `used_amount > 0`, so unused monthly credits keep a stale `resets_at`. Annual uses Dec 31 (calendar year), not card anniversary. `calculateResetsAt` uses `toISOString()` (UTC), which can shift the date a day east of UTC |
| Wallet "$-1965", no thousands separator | **Confirmed** | `${netValue >= 0 ? '+' : ''}$${netValue.toFixed(0)}`; 34 `toFixed` calls; only 2 locale formatters in the app |
| Insights "$2 left" vs "$1.66" | **Confirmed** | header uses `toFixed(0)`, card uses 2 decimals. Same issue: "Rewards earned $50" vs History "$50.49" |
| History test data | **Confirmed** | "//test" note (Ulta); Uber $23.00 on Jun 24 twice plus a third Uber row with no amount |
| Valuation inconsistency | **Confirmed** | landing 4x = 7.2¢ (1.8¢/pt) vs app Platinum 5x = 5¢ (1.0¢/pt, `lib/pointValues.js`) |
| Wallet "Net value" misleading | **Confirmed, refined** | it's *captured* perks + tap rewards − fees. Uncaptured perk value ($1,694 here) is ignored, so it shows **−$1,965 in red**. Annual fees are also shown in red |
| "Tap Clavis" ambiguous; "Email me my perk summary" dominant; tiny edit / × / "+ perk"; full-width "+ perk" on every card | **Confirmed** | |
| Insights headline "$1.66 left on the table" undercuts the pitch | **Confirmed** | |

### Additional findings
1. **Gold fails as text color:** `#C9A227` on `#FAFAFA` = **2.32:1**. This covers "5x pts", "$50.49", Wallet percentages and the selected chip. The accent needs a darker text variant or should be used only as fill or border.
2. **Green fails AA for normal-size text:** `#0F9B65` on `#FAFAFA` = **3.41:1** ("$300 left", "+$1.15").
3. **Logged-out `/` renders the hero twice** (`page.js` has its own hero, then `MarketingBody` adds another).
4. **`/about` and the legal pages still use a dark nav and footer** on a light page.
5. **Insights valuation looks inconsistent:** McDonald's, Platinum → CSR, shows 2.5¢/$. With the app's own data (Platinum 1x at 1.0¢, CSR 3x at 1.5¢) it should be 3.5¢/$. DoorDash and Amex Gold reconcile. Investigate in Phase 1.
6. **Unqualified claim on Insights:** the affiliate card says Capital One Venture earns "5x on hotels & rental cars". That's only through Capital One Travel.
7. **Invalid CSS** in `globals.css`: `gap: '10px' !important` (quoted value inside a media query) is ignored.
8. **Lint baseline:** `main` already has 17 lint errors (15 in `dashboard/page.js`, 2 in `auth`). There's no TypeScript, so no typecheck. Build passes.
9. **Local dev uses the production Supabase project** (`.env.local`). Seeded demo data in Phase 1 needs a separate demo account or project.

---

## 4. Gaps before Phase 1
- App screens at 390/768/1440 and 100% zoom. These need a signed-in session in the browser pane (I can't enter your password), or I capture them later against a demo account.
- Issuer-terms check for every rate claim (Phase 1).

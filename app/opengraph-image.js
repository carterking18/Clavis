import { ImageResponse } from 'next/og'

export const alt = 'Clavis: which card should I use?'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Social preview: the headline and one ranked result, in the site's colors
export default function OpengraphImage() {
  const row = (name, rate, value, best) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderTop: '1px solid rgba(17,24,39,0.10)', background: best ? 'rgba(201,162,39,0.08)' : '#FFFFFF', boxShadow: best ? 'inset 6px 0 0 #C9A227' : 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {best && <div style={{ fontSize: 20, color: '#7D6309' }}>Use this card at DoorDash</div>}
        <div style={{ fontSize: best ? 34 : 26, fontWeight: 600, color: '#111827' }}>{name}</div>
        <div style={{ fontSize: 20, color: '#4B5563' }}>{rate}</div>
      </div>
      <div style={{ fontSize: best ? 44 : 28, fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  )
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#FAFAFA', padding: 64, gap: 56, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 470 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 2, color: '#111827' }}>CLAVIS</div>
          <div style={{ fontSize: 72, lineHeight: 1.05, color: '#111827', marginTop: 28 }}>Which card should I use?</div>
          <div style={{ fontSize: 26, lineHeight: 1.4, color: '#4B5563', marginTop: 24 }}>Every card in your wallet, ranked by what it earns where you pay.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid rgba(17,24,39,0.10)', borderRadius: 12, overflow: 'hidden', background: '#FFFFFF' }}>
          {row('Chase Sapphire Reserve', '3x points + unused $15 DoorDash promo', '$16.20', true)}
          {row('Amex Gold', '4x points', '$1.60')}
          {row('Chase Freedom Unlimited', '3% cash back', '$1.20')}
        </div>
      </div>
    ),
    size
  )
}

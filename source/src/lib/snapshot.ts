import type { Lang } from '../data/types'

/** Filled in by <SnapshotBridge/> while the city is on screen. */
export const snapshot: { capture: null | (() => string) } = { capture: null }

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** Compose a shareable postcard (1080×1350) from a city capture and a few stats. */
export async function makePostcard(o: {
  shot: string; lang: Lang; name?: string; completion: number; landmarks: string[]; points?: number; memories?: number; collectibles?: number; dateText: string
}): Promise<string> {
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#14533f'); grad.addColorStop(1, '#08241b')
  g.fillStyle = grad; g.fillRect(0, 0, W, H)
  // geometric dots
  g.fillStyle = 'rgba(201,162,74,0.12)'
  for (let y = 18; y < H; y += 36) for (let x = 18; x < W; x += 36) { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill() }
  try {
    await document.fonts?.ready
  } catch { /* ignore */ }
  const img = await loadImg(o.shot)
  const bx = 60, by = 60, bw = W - 120, bh = 820
  g.save(); roundRect(g, bx, by, bw, bh, 40); g.clip()
  const s = Math.max(bw / img.width, bh / img.height)
  g.drawImage(img, bx + (bw - img.width * s) / 2, by + (bh - img.height * s) / 2, img.width * s, img.height * s)
  g.restore()
  g.strokeStyle = '#c9a24a'; g.lineWidth = 6; roundRect(g, bx, by, bw, bh, 40); g.stroke()

  const rtl = o.lang === 'ar'
  g.direction = rtl ? 'rtl' : 'ltr'
  g.textAlign = rtl ? 'right' : 'left'
  const tx = rtl ? W - 70 : 70
  g.fillStyle = '#ecd594'
  g.font = '700 64px "Reem Kufi", "IBM Plex Sans Arabic", sans-serif'
  g.fillText(rtl ? 'مدينتي بعيوني' : 'My City, My Story', tx, 970)
  g.fillStyle = '#f8f0e0'
  g.font = '600 36px "IBM Plex Sans Arabic", sans-serif'
  const who = o.name ? (rtl ? `مدينة ${o.name}` : `${o.name}’s Madinah`) : rtl ? 'نسختي الخاصة من المدينة المنورة' : 'My own version of Al Madinah'
  g.fillText(who, tx, 1030)
  g.font = '500 30px "IBM Plex Sans Arabic", sans-serif'
  g.fillStyle = 'rgba(248,240,224,0.85)'
  g.fillText(o.landmarks.join(rtl ? ' · ' : ' · ') || (rtl ? 'بداية الرحلة' : 'The journey begins'), tx, 1085)
  // completion badge
  const cx = rtl ? 150 : W - 150, cy = 1010
  g.beginPath(); g.arc(cx, cy, 82, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill()
  g.beginPath(); g.arc(cx, cy, 82, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * o.completion) / 100); g.strokeStyle = '#dcbb63'; g.lineWidth = 12; g.lineCap = 'round'; g.stroke()
  g.textAlign = 'center'; g.fillStyle = '#ecd594'; g.font = '700 46px "IBM Plex Sans Arabic", sans-serif'
  g.fillText(rtl ? `${o.completion.toLocaleString('ar-SA-u-nu-arab')}٪` : `${o.completion}%`, cx, cy + 16)
  // stats row
  g.textAlign = rtl ? 'right' : 'left'
  g.font = '500 28px "IBM Plex Sans Arabic", sans-serif'
  g.fillStyle = 'rgba(248,240,224,0.75)'
  const parts: string[] = []
  const n = (x: number) => (rtl ? x.toLocaleString('ar-SA-u-nu-arab') : String(x))
  if (o.points !== undefined) parts.push(rtl ? `${n(o.points)} نقطة` : `${o.points} pts`)
  if (o.collectibles !== undefined) parts.push(rtl ? `${n(o.collectibles)} مقتنيات` : `${o.collectibles} collectibles`)
  if (o.memories !== undefined) parts.push(rtl ? `${n(o.memories)} ذكريات` : `${o.memories} memories`)
  g.fillText(parts.join('  ·  '), tx, 1150)
  g.fillStyle = 'rgba(201,162,74,0.9)'
  g.font = '500 26px "IBM Plex Sans Arabic", sans-serif'
  g.fillText(o.dateText, tx, 1270)
  g.textAlign = rtl ? 'left' : 'right'
  g.fillText(rtl ? 'Al Madinah · المدينة المنورة' : 'المدينة المنورة · Al Madinah', rtl ? 70 : W - 70, 1270)
  return c.toDataURL('image/jpeg', 0.88)
}

import { useGame } from '../state/gameStore'
import { LANDMARK_MAP } from '../data/landmarks'
import { COLLECTIBLES } from '../data/collectibles'
import { STORIES } from '../data/stories'
import { rendersFor } from '../data/renders'
import { photoURL } from '../state/photoStore'
import { cityCompletion } from '../data/progression'
import type { Lang, LandmarkId } from '../data/types'
import { fmtDate, num } from './format'
import { snapshot } from './snapshot'

/**
 * Personal travel story: slides built from the player's real data (visit dates, their own
 * photos and notes, finds), drawn on a 1080×1920 canvas. The same renderer drives the
 * in-app player, the summary image and the video export, so what you save is what you saw.
 */
export const W = 1080, H = 1920

export type Slide =
  | { kind: 'cover'; title: string; sub: string; img?: HTMLImageElement; label: string }
  | { kind: 'place'; id: LandmarkId; name: string; date: string; hijri: string; note?: string; finds: string[]; story?: string; img?: HTMLImageElement; label: string; index: number; total: number }
  | { kind: 'stats'; rows: [string, string][] }
  | { kind: 'end'; title: string; sub: string }

const loadImg = (src?: string) => new Promise<HTMLImageElement | undefined>((res) => {
  if (!src) return res(undefined)
  const i = new Image()
  i.onload = () => res(i)
  i.onerror = () => res(undefined)
  i.src = src
})

const hijriText = (iso: string, lang: Lang) => {
  try { return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) } catch { return '' }
}

/** Build the slides from the current player's journey. */
export async function buildJourney(lang: Lang): Promise<Slide[]> {
  const s = useGame.getState()
  const ar = lang === 'ar'
  const visited = (Object.keys(s.progress) as LandmarkId[])
    .filter((id) => s.progress[id]?.unlocked)
    .sort((a, b) => (s.progress[a].visitDate ?? '').localeCompare(s.progress[b].visitDate ?? ''))
  const shot = snapshot.capture?.() ?? undefined
  const cover: Slide = {
    kind: 'cover',
    title: ar ? (s.profileName ? `رحلة ${s.profileName} في المدينة` : 'رحلتي في المدينة المنورة') : s.profileName ? `${s.profileName}'s Madinah journey` : 'My journey in Madinah',
    sub: visited.length
      ? `${fmtDate(s.progress[visited[0]].visitDate!, lang)}${visited.length > 1 ? ` — ${fmtDate(s.progress[visited[visited.length - 1]].visitDate!, lang)}` : ''}`
      : ar ? 'لم تبدأ رحلتك بعد' : 'Your journey has not started yet',
    img: await loadImg(shot ?? rendersFor('quba')[0]),
    label: shot ? (ar ? 'مدينتك في اللعبة' : 'Your city in the game') : ar ? 'نموذج اللعبة' : 'Game model',
  }
  const slides: Slide[] = [cover]
  for (const [i, id] of visited.entries()) {
    const lm = LANDMARK_MAP[id]
    const mems = s.memories.filter((m) => m.landmarkId === id && !m.sample)
    const withPhoto = mems.find((m) => m.photoKey)
    const photo = withPhoto?.photoKey ? await photoURL(withPhoto.photoKey) : undefined
    const sample = s.memories.find((m) => m.landmarkId === id && m.sample && m.samplePhoto)
    const img = await loadImg(photo ?? rendersFor(id)[sample ? 1 : 0])
    const note = (mems.find((m) => m.note?.trim()) ?? s.memories.find((m) => m.landmarkId === id && m.note?.trim()))?.note?.trim()
    const finds = COLLECTIBLES.filter((c) => c.landmark === id && s.discoveries[`hidden:${id}:${c.id}`]).map((c) => `${c.icon} ${c.name[lang]}`)
    const story = STORIES.find((st) => st.landmark === id && s.stories[st.id]?.doneAt)
    const visitDate = s.progress[id].visitDate ?? new Date().toISOString()
    slides.push({
      kind: 'place', id, index: i + 1, total: visited.length, name: lm.name[lang], date: fmtDate(visitDate, lang), hijri: hijriText(visitDate, lang),
      note: note ? note.slice(0, 220) : undefined, finds, story: story ? `${story.icon} ${story.title[lang]}` : undefined, img,
      label: photo ? (ar ? 'صورتك' : 'Your photo') : ar ? 'نموذج اللعبة المبسّط' : 'Simplified game model',
    })
  }
  const found = COLLECTIBLES.filter((c) => s.discoveries[`hidden:${c.landmark}:${c.id}`]).length
  const mins = Math.round(s.playSeconds / 60)
  slides.push({
    kind: 'stats',
    rows: [
      [ar ? 'اكتمال مدينتي' : 'City complete', ar ? `${num(cityCompletion(s), lang)}٪` : `${cityCompletion(s)}%`],
      [ar ? 'المعالم' : 'Landmarks', `${num(visited.length, lang)}/${num(4, lang)}`],
      [ar ? 'المقتنيات' : 'Collectibles', `${num(found, lang)}/${num(COLLECTIBLES.length, lang)}`],
      [ar ? 'القصص المكتملة' : 'Stories finished', num(STORIES.filter((st) => s.stories[st.id]?.doneAt).length, lang)],
      [ar ? 'الذكريات' : 'Memories', num(s.memories.filter((m) => !m.sample).length, lang)],
      [ar ? 'وقت الاستكشاف' : 'Time exploring', ar ? `${num(mins, lang)} دقيقة` : `${mins} min`],
    ],
  })
  slides.push({ kind: 'end', title: ar ? 'مدينتي بعيوني' : 'My City, My Story', sub: hijriText(new Date().toISOString(), lang) })
  return slides
}

/* ---------------- drawing ---------------- */

const FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif'
const DISPLAY = '"Reem Kufi", "IBM Plex Sans Arabic", system-ui, sans-serif'

function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (g.measureText(t).width > max && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  return lines
}

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, zoom: number) {
  const s = Math.max(W / img.width, H / img.height) * zoom
  g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
}

function chip(g: CanvasRenderingContext2D, text: string, x: number, y: number, rtl: boolean) {
  g.font = `600 30px ${FONT}`
  const w = g.measureText(text).width + 40
  const x0 = rtl ? x - w : x
  g.fillStyle = 'rgba(0,0,0,0.55)'
  g.beginPath(); g.roundRect?.(x0, y, w, 52, 26); g.fill()
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, x0 + w / 2, y + 37)
}

/** Draw slide `sl` at progress p (0..1) within its time on screen. */
export function drawSlide(g: CanvasRenderingContext2D, sl: Slide, p: number, lang: Lang, motion = true) {
  const rtl = lang === 'ar'
  g.direction = rtl ? 'rtl' : 'ltr'
  const X = rtl ? W - 80 : 80
  g.textAlign = rtl ? 'right' : 'left'
  const zoom = motion ? 1 + 0.06 * p : 1
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#14533f'); bg.addColorStop(1, '#08241b')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)

  if ((sl.kind === 'cover' || sl.kind === 'place') && sl.img) {
    cover(g, sl.img, zoom)
    const sh = g.createLinearGradient(0, H * 0.35, 0, H)
    sh.addColorStop(0, 'rgba(8,36,27,0)'); sh.addColorStop(0.55, 'rgba(8,36,27,0.78)'); sh.addColorStop(1, 'rgba(8,36,27,0.96)')
    g.fillStyle = sh; g.fillRect(0, 0, W, H)
    chip(g, sl.label, rtl ? W - 60 : 60, 150, rtl)
    g.textAlign = rtl ? 'right' : 'left'
  }
  g.fillStyle = 'rgba(201,162,74,0.10)'
  if (sl.kind === 'stats' || sl.kind === 'end') for (let y = 30; y < H; y += 48) for (let x = 30; x < W; x += 48) { g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill() }

  const fadeIn = motion ? Math.min(1, p * 4) : 1
  g.globalAlpha = fadeIn
  if (sl.kind === 'cover') {
    g.fillStyle = '#ecd594'; g.font = `600 40px ${FONT}`; g.fillText(rtl ? 'قصة رحلتي' : 'My travel story', X, H - 520)
    g.fillStyle = '#fdfaf3'; g.font = `700 92px ${DISPLAY}`
    wrap(g, sl.title, W - 160).slice(0, 3).forEach((l, i) => g.fillText(l, X, H - 400 + i * 110))
    g.fillStyle = 'rgba(253,250,243,0.8)'; g.font = `500 40px ${FONT}`; g.fillText(sl.sub, X, H - 110)
  } else if (sl.kind === 'place') {
    g.fillStyle = '#ecd594'; g.font = `600 38px ${FONT}`
    g.fillText(rtl ? `المحطة ${num(sl.index, lang)} من ${num(sl.total, lang)}` : `Stop ${sl.index} of ${sl.total}`, X, H - 760)
    g.fillStyle = '#fdfaf3'; g.font = `700 96px ${DISPLAY}`; g.fillText(sl.name, X, H - 650)
    g.fillStyle = 'rgba(253,250,243,0.85)'; g.font = `500 40px ${FONT}`; g.fillText(`${sl.date}${sl.hijri ? (rtl ? ` — ${sl.hijri}` : ` · ${sl.hijri}`) : ''}`, X, H - 580)
    let y = H - 490
    if (sl.note) {
      g.fillStyle = '#fdfaf3'; g.font = `italic 500 44px ${FONT}`
      wrap(g, `“${sl.note}”`, W - 160).slice(0, 4).forEach((l) => { g.fillText(l, X, y); y += 62 })
      y += 20
    }
    g.font = `600 36px ${FONT}`; g.fillStyle = '#ecd594'
    for (const f of sl.finds.slice(0, 3)) { g.fillText(f, X, y); y += 54 }
    if (sl.story) { g.fillStyle = '#7fbf9f'; g.fillText(sl.story, X, y) }
  } else if (sl.kind === 'stats') {
    g.fillStyle = '#ecd594'; g.font = `700 76px ${DISPLAY}`; g.fillText(rtl ? 'رحلتي بالأرقام' : 'My journey in numbers', X, 330)
    sl.rows.forEach(([k, v], i) => {
      const y = 520 + i * 200
      const show = motion ? Math.min(1, Math.max(0, p * 6 - i * 0.5)) : 1
      g.globalAlpha = show
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.roundRect?.(70, y - 110, W - 140, 160, 36); g.fill()
      g.fillStyle = 'rgba(253,250,243,0.75)'; g.font = `500 40px ${FONT}`; g.fillText(k, X, y - 40)
      g.fillStyle = '#fdfaf3'; g.font = `700 64px ${DISPLAY}`; g.fillText(v, X, y + 30)
    })
  } else {
    g.textAlign = 'center'
    g.fillStyle = '#ecd594'; g.font = `700 104px ${DISPLAY}`; g.fillText(sl.title, W / 2, H / 2 - 40)
    g.fillStyle = 'rgba(253,250,243,0.8)'; g.font = `500 42px ${FONT}`; g.fillText(sl.sub, W / 2, H / 2 + 50)
    g.font = `500 30px ${FONT}`; g.fillStyle = 'rgba(253,250,243,0.55)'
    g.fillText(rtl ? 'صُنعت على جهازك — صورك لا تغادره إلا إن شاركتها أنت' : 'Made on your device — your photos only leave it if you share them', W / 2, H - 140)
  }
  g.globalAlpha = 1
}

/** Accessible text version of a slide (screen readers, captions). */
export function slideText(sl: Slide, lang: Lang): string {
  if (sl.kind === 'cover') return `${sl.title}. ${sl.sub}`
  if (sl.kind === 'place') return [`${sl.name}, ${sl.date}`, sl.note, sl.finds.join(lang === 'ar' ? '، ' : ', '), sl.story].filter(Boolean).join('. ')
  if (sl.kind === 'stats') return sl.rows.map(([k, v]) => `${k}: ${v}`).join('. ')
  return `${sl.title}. ${sl.sub}`
}

/* ---------------- exports ---------------- */

/** One tall summary poster with every stop. */
export async function journeyPoster(slides: Slide[], lang: Lang): Promise<Blob | null> {
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  try { await document.fonts?.ready } catch { /* ignore */ }
  const rtl = lang === 'ar'
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#14533f'); bg.addColorStop(1, '#08241b')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  const coverS = slides.find((s) => s.kind === 'cover') as Extract<Slide, { kind: 'cover' }> | undefined
  if (coverS?.img) {
    g.save(); g.beginPath(); g.roundRect?.(60, 60, W - 120, 640, 40); g.clip();
    const s = Math.max((W - 120) / coverS.img.width, 640 / coverS.img.height)
    g.drawImage(coverS.img, 60 + (W - 120 - coverS.img.width * s) / 2, 60 + (640 - coverS.img.height * s) / 2, coverS.img.width * s, coverS.img.height * s)
    g.restore()
  }
  g.direction = rtl ? 'rtl' : 'ltr'
  g.textAlign = rtl ? 'right' : 'left'
  const X = rtl ? W - 90 : 90
  g.fillStyle = '#fdfaf3'; g.font = `700 76px ${DISPLAY}`; g.fillText(coverS?.title ?? '', X, 820)
  g.fillStyle = 'rgba(253,250,243,0.75)'; g.font = `500 36px ${FONT}`; g.fillText(coverS?.sub ?? '', X, 880)
  let y = 980
  for (const sl of slides) {
    if (sl.kind !== 'place') continue
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(rtl ? W - 100 : 100, y - 14, 14, 0, Math.PI * 2); g.fill()
    const tx = rtl ? W - 140 : 140
    g.fillStyle = '#fdfaf3'; g.font = `700 46px ${DISPLAY}`; g.fillText(sl.name, tx, y)
    g.fillStyle = 'rgba(253,250,243,0.7)'; g.font = `500 30px ${FONT}`; g.fillText(sl.date, tx, y + 46)
    let yy = y + 92
    if (sl.note) { g.fillStyle = 'rgba(253,250,243,0.9)'; g.font = `italic 500 32px ${FONT}`; for (const l of wrap(g, `“${sl.note}”`, W - 260).slice(0, 2)) { g.fillText(l, tx, yy); yy += 44 } }
    if (sl.finds.length) { g.fillStyle = '#ecd594'; g.font = `600 28px ${FONT}`; g.fillText(sl.finds.join('  '), tx, yy); yy += 40 }
    y = yy + 50
    if (y > H - 260) break
  }
  const stats = slides.find((s) => s.kind === 'stats') as Extract<Slide, { kind: 'stats' }> | undefined
  if (stats) {
    g.textAlign = 'center'
    const cols = stats.rows.slice(0, 3)
    cols.forEach(([k, v], i) => {
      const cx = rtl ? W - (W / 3) * (i + 0.5) : (W / 3) * (i + 0.5)
      g.fillStyle = '#ecd594'; g.font = `700 58px ${DISPLAY}`; g.fillText(v, cx, H - 170)
      g.fillStyle = 'rgba(253,250,243,0.7)'; g.font = `500 28px ${FONT}`; g.fillText(k, cx, H - 120)
    })
  }
  g.textAlign = 'center'; g.fillStyle = 'rgba(253,250,243,0.5)'; g.font = `500 26px ${FONT}`
  g.fillText(rtl ? 'مدينتي بعيوني' : 'My City, My Story', W / 2, H - 50)
  return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.9))
}

export function videoSupport(): { ok: boolean; mime: string } {
  try {
    const c = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }
    if (typeof MediaRecorder === 'undefined' || !c.captureStream) return { ok: false, mime: '' }
    for (const m of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MediaRecorder.isTypeSupported(m)) return { ok: true, mime: m }
  } catch { /* ignore */ }
  return { ok: false, mime: '' }
}

/** Record the slides as a short silent video (WebM or MP4, whatever this browser can make). */
export async function journeyVideo(slides: Slide[], lang: Lang, onProgress?: (p: number) => void, perSlide = 3.2): Promise<Blob | null> {
  const sup = videoSupport()
  if (!sup.ok) return null
  const c = document.createElement('canvas') as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }
  c.width = 720; c.height = 1280
  const g = c.getContext('2d')!
  try { await document.fonts?.ready } catch { /* ignore */ }
  const stream = c.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: sup.mime, videoBitsPerSecond: 4_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise<void>((r) => { rec.onstop = () => r() })
  rec.start(250)
  const total = slides.length * perSlide
  const t0 = performance.now()
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = (performance.now() - t0) / 1000
      if (t >= total) return resolve()
      const i = Math.min(slides.length - 1, Math.floor(t / perSlide))
      const p = (t - i * perSlide) / perSlide
      g.save(); g.scale(720 / W, 1280 / H); drawSlide(g, slides[i], p, lang, true); g.restore()
      onProgress?.(t / total)
      requestAnimationFrame(frame)
    }
    frame()
  })
  rec.stop()
  stream.getTracks().forEach((tr) => tr.stop())
  await done
  return new Blob(chunks, { type: sup.mime.split(';')[0] })
}

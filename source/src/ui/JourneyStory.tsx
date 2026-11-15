import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/gameStore'
import { Icon } from './components/Icon'
import { buildJourney, drawSlide, journeyPoster, journeyVideo, slideText, videoSupport, W, H, type Slide } from '../lib/journey'
import { saveFile } from '../lib/save'
import { reducedMotion } from '../lib/a11y'
import { num } from '../lib/format'

const PER = 5 // seconds per slide in the player

/** Full-screen personal travel story (Instagram-style), with image / video export. */
export function JourneyStory() {
  const open = useGame((s) => s.panel === 'journey')
  const lang = useGame((s) => s.lang)
  const g = useGame.getState
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const t0 = useRef(performance.now())
  const motion = !reducedMotion()

  useEffect(() => {
    if (!open) { setSlides(null); setI(0); setMsg(null); return }
    buildJourney(lang).then((s) => { setSlides(s); setI(0); t0.current = performance.now() })
  }, [open, lang])

  // draw loop
  useEffect(() => {
    if (!slides || !cv.current) return
    const ctx = cv.current.getContext('2d')!
    let raf = 0
    let pausedAt = 0
    const loop = () => {
      const now = performance.now()
      if (paused) { if (!pausedAt) pausedAt = now } else if (pausedAt) { t0.current += now - pausedAt; pausedAt = 0 }
      const p = Math.min(1, ((pausedAt || now) - t0.current) / 1000 / PER)
      drawSlide(ctx, slides[i], p, lang, motion)
      if (p >= 1 && !paused) {
        if (i < slides.length - 1) { setI(i + 1); t0.current = performance.now(); return }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [slides, i, paused, lang, motion])

  const go = (d: number) => { if (!slides) return; setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))); t0.current = performance.now() }
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') g().setUi({ panel: null })
      if (e.key === 'ArrowLeft') go(lang === 'ar' ? 1 : -1)
      if (e.key === 'ArrowRight') go(lang === 'ar' ? -1 : 1)
      if (e.key === ' ') setPaused((p) => !p)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  if (!open) return null
  const vid = videoSupport()
  const saveImage = async () => {
    if (!slides) return
    setBusy('img'); setMsg(null)
    const b = await journeyPoster(slides, lang)
    const r = b ? await saveFile(`my-madinah-journey.jpg`, b) : 'failed'
    setBusy(null)
    setMsg(r === 'saved' ? L('تم حفظ ملخص الرحلة.', 'Journey summary saved.') : r === 'declined' ? L('أُلغي الحفظ.', 'Saving cancelled.') : L('تعذّر الحفظ هنا.', "Couldn't save here."))
  }
  const saveVideo = async () => {
    if (!slides) return
    setBusy('vid'); setMsg(L('جارٍ تسجيل الفيديو… ٠٪', 'Recording video… 0%'))
    setPaused(true)
    const b = await journeyVideo(slides, lang, (p) => setMsg(L(`جارٍ تسجيل الفيديو… ${num(Math.round(p * 100), 'ar')}٪`, `Recording video… ${Math.round(p * 100)}%`)))
    const ext = b?.type.includes('mp4') ? 'mp4' : 'webm'
    const r = b ? await saveFile(`my-madinah-journey.${ext}`, b) : 'failed'
    setBusy(null); setPaused(false)
    setMsg(r === 'saved' ? L('تم حفظ الفيديو (بلا صوت).', 'Video saved (silent).') : r === 'declined' ? L('أُلغي الحفظ.', 'Saving cancelled.') : L('تعذّر إنشاء الفيديو هنا.', "Couldn't make the video here."))
  }
  const copyText = async () => {
    if (!slides) return
    const text = slides.map((s) => slideText(s, lang)).join('\n')
    try { await navigator.clipboard.writeText(text); setMsg(L('نُسخ ملخص الرحلة.', 'Journey summary copied.')) } catch { setMsg(L('تعذّر النسخ هنا.', "Couldn't copy here.")) }
  }
  const last = slides ? i === slides.length - 1 : false

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label={L('قصة رحلتي', 'My travel story')}>
      {/* progress segments */}
      <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+10px)] z-10 flex gap-1" aria-hidden="true">
        {(slides ?? []).map((_, k) => <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><div className={`h-full bg-white ${k < i ? 'w-full' : k === i ? 'w-1/2' : 'w-0'}`} /></div>)}
      </div>
      <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+22px)] z-10 flex justify-between">
        <button onClick={() => setPaused((p) => !p)} className="btn-press grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white" aria-label={paused ? L('تشغيل', 'Play') : L('إيقاف مؤقت', 'Pause')}>{paused ? '▶' : '❚❚'}</button>
        <button onClick={() => g().setUi({ panel: null })} className="btn-press grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white" aria-label={L('إغلاق', 'Close')}><Icon name="x" size={18} /></button>
      </div>
      {!slides && <div className="text-sand-100/80">{L('نجهّز قصتك…', 'Preparing your story…')}</div>}
      <div className="relative h-full max-h-[100dvh] w-full" style={{ aspectRatio: `${W}/${H}`, maxWidth: `calc(100dvh * ${W / H})` }}>
        <canvas ref={cv} width={W} height={H} className="h-full w-full" aria-hidden="true" />
        {/* tap zones */}
        <button className="absolute inset-y-0 start-0 w-1/3" onClick={() => go(-1)} aria-label={L('السابق', 'Previous')} />
        <button className="absolute inset-y-0 end-0 w-1/3" onClick={() => go(1)} aria-label={L('التالي', 'Next')} />
        {slides && <p className="sr-only" aria-live="polite">{slideText(slides[i], lang)}</p>}
      </div>
      {last && (
        <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-10 mx-auto max-w-md space-y-2 rounded-3xl bg-black/65 p-3 text-sand-50 backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={saveImage} disabled={!!busy} className="btn-press rounded-2xl bg-gold-400 px-3 py-2.5 text-[calc(13px*var(--fs))] font-bold text-pine-950">🖼️ {L('حفظ ملخص الرحلة', 'Save summary image')}</button>
            {vid.ok ? (
              <button onClick={saveVideo} disabled={!!busy} className="btn-press rounded-2xl bg-white/15 px-3 py-2.5 text-[calc(13px*var(--fs))] font-semibold">🎬 {L('حفظ فيديو', 'Save video')}</button>
            ) : (
              <div className="rounded-2xl bg-white/8 px-3 py-2 text-center text-[calc(11px*var(--fs))] text-sand-100/70">{L('تصدير الفيديو غير مدعوم في هذا المتصفح', "This browser can't export video")}</div>
            )}
            <button onClick={() => g().setUi({ panel: 'share' })} className="btn-press rounded-2xl bg-white/15 px-3 py-2.5 text-[calc(13px*var(--fs))] font-semibold">💌 {L('بطاقة بريدية', 'Postcard')}</button>
            <button onClick={copyText} className="btn-press rounded-2xl bg-white/15 px-3 py-2.5 text-[calc(13px*var(--fs))] font-semibold">📋 {L('نسخ الملخص نصًا', 'Copy as text')}</button>
          </div>
          <div className="text-center text-[calc(11px*var(--fs))] text-sand-100/70">{msg ?? L('كل شيء يُنشأ على جهازك. الحفظ يعتمد على ما يسمح به المكان الذي فُتحت فيه اللعبة.', 'Everything is made on your device. Saving depends on what the place hosting the game allows.')}</div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useGame } from '../state/gameStore'
import { NARRATION } from '../data/narration'
import { LANDMARK_MAP } from '../data/landmarks'
import type { Lang, LandmarkId } from '../data/types'
import { audio } from '../lib/audio'
import { Icon } from './components/Icon'

/** The sentence of the narration being spoken at character index i (for captions). */
export function sentenceAt(text: string, i: number) {
  const parts = text.split(/(?<=[.!؟?。])\s+/)
  let n = 0
  for (const p of parts) { n += p.length + 1; if (i < n) return p }
  return parts[parts.length - 1] ?? ''
}

/** Live captions for narration (Settings → Accessibility → Captions). */
export function Captions() {
  const caption = useGame((s) => s.caption)
  const on = useGame((s) => s.a11y.captions)
  const lang = useGame((s) => s.audio.voiceLang)
  if (!on || !caption) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[70] flex justify-center px-4" aria-live="polite">
      <p dir={lang === 'ar' ? 'rtl' : 'ltr'} className="max-w-xl rounded-2xl bg-black/78 px-4 py-2.5 text-center text-[calc(15px*var(--fs))] font-medium leading-relaxed text-white shadow-xl">{caption}</p>
    </div>
  )
}

/** Shared player logic for the landmark audio guide. */
function useGuide(id: LandmarkId) {
  const voiceLang = useGame((s) => s.audio.voiceLang)
  const [lang, setLang] = useState<Lang>(voiceLang)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [mode, setMode] = useState(() => audio.narrationMode(id, voiceLang))
  useEffect(() => setLang(voiceLang), [voiceLang])
  useEffect(() => {
    const update = () => setMode(audio.narrationMode(id, lang))
    update()
    const t = setTimeout(update, 800)
    try { window.speechSynthesis?.addEventListener?.('voiceschanged', update) } catch { /* ignore */ }
    return () => { clearTimeout(t); try { window.speechSynthesis?.removeEventListener?.('voiceschanged', update) } catch { /* ignore */ } }
  }, [id, lang])
  useEffect(() => () => { audio.stopNarration(); useGame.getState().setUi({ caption: null }) }, [id])
  const text = NARRATION[id][lang]
  const play = () => {
    audio.ensure()
    if (playing) { audio.stopNarration(); setPlaying(false); useGame.getState().setUi({ caption: null }); return }
    setPos(0)
    const cap = (i: number) => {
      setPos(i)
      if (!useGame.getState().a11y.captions) return
      useGame.getState().setUi({ caption: sentenceAt(text, i) })
    }
    cap(0)
    const ok = audio.narrate(id, lang, text, () => { setPlaying(false); setPos(text.length); useGame.getState().setUi({ caption: null }) }, cap)
    if (!ok) useGame.getState().setUi({ caption: null })
    setPlaying(ok)
    if (!ok) setMode('none')
  }
  const switchLang = (l: Lang) => { audio.stopNarration(); setPlaying(false); setPos(0); setLang(l) }
  return { lang, playing, pos, mode, text, play, switchLang }
}

function Transcript({ text, pos, lang }: { text: string; pos: number; lang: Lang }) {
  return (
    <p className="text-[calc(13.5px*var(--fs))] leading-[1.9]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <span className="text-pine-900">{text.slice(0, pos)}</span>
      <span className="text-ink-500">{text.slice(pos)}</span>
    </p>
  )
}

/** Card inside the landmark panel. */
export function AudioGuideCard({ id }: { id: LandmarkId }) {
  const ui = useGame((s) => s.lang)
  const g = useGuide(id)
  const [open, setOpen] = useState(false)
  const L = (ar: string, en: string) => (ui === 'ar' ? ar : en)
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/5">
      <div className="flex items-center gap-3">
        <button onClick={() => { g.play(); setOpen(true) }} className={`btn-press grid h-11 w-11 shrink-0 place-items-center rounded-full ${g.playing ? 'bg-gold-400 text-pine-950' : 'bg-pine-800 text-sand-50'}`} aria-label="play guide">
          <Icon name={g.playing ? 'pause' : 'play'} size={18} fill={!g.playing} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[calc(14px*var(--fs))] font-semibold"><Icon name="headphones" size={15} /> {L('الدليل الصوتي', 'Audio guide')}</div>
          <div className="text-[calc(11.5px*var(--fs))] text-ink-500">
            {g.mode === 'recorded' ? L('تسجيل صوتي', 'Recorded narration') : g.mode === 'voice' ? L('بصوت الجهاز', 'Device voice') : L('لا يتوفر صوت لهذه اللغة على جهازك — النص متاح', 'No voice for this language on your device — transcript available')}
          </div>
        </div>
        <div className="flex rounded-xl bg-ink-900/6 p-1">
          {(['ar', 'en'] as const).map((l) => (
            <button key={l} onClick={() => g.switchLang(l)} className={`btn-press rounded-lg px-2 py-1 text-[calc(11.5px*var(--fs))] font-semibold ${g.lang === l ? 'bg-pine-800 text-sand-50' : 'text-ink-700'}`}>{l === 'ar' ? 'ع' : 'EN'}</button>
          ))}
        </div>
      </div>
      <button onClick={() => setOpen(!open)} className="mt-2 text-[calc(12px*var(--fs))] font-semibold text-pine-700">{open ? L('إخفاء النص', 'Hide transcript') : L('عرض النص', 'Show transcript')}</button>
      {open && <div className="mt-1.5"><Transcript text={g.text} pos={g.pos} lang={g.lang} /></div>}
    </div>
  )
}

/** Floating mini player used inside buildings. */
export function AudioGuideMini() {
  const id = useGame((s) => s.guideFor)
  const lang = useGame((s) => s.lang)
  if (!id) return null
  return <Mini id={id} ui={lang} />
}

function Mini({ id, ui }: { id: LandmarkId; ui: Lang }) {
  const g = useGuide(id)
  const L = (ar: string, en: string) => (ui === 'ar' ? ar : en)
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-[88px] z-30 mx-auto max-w-md rounded-2xl bg-sand-50/95 p-3 shadow-xl backdrop-blur anim-rise">
      <div className="flex items-center gap-2.5">
        <button onClick={g.play} className={`btn-press grid h-10 w-10 shrink-0 place-items-center rounded-full ${g.playing ? 'bg-gold-400 text-pine-950' : 'bg-pine-800 text-sand-50'}`}><Icon name={g.playing ? 'pause' : 'play'} size={16} fill={!g.playing} /></button>
        <div className="min-w-0 flex-1 text-[calc(13px*var(--fs))] font-semibold">{L('الدليل الصوتي', 'Audio guide')} · {LANDMARK_MAP[id].name[ui]}</div>
        <div className="flex rounded-lg bg-ink-900/6 p-0.5">
          {(['ar', 'en'] as const).map((l) => <button key={l} onClick={() => g.switchLang(l)} className={`rounded-md px-1.5 py-0.5 text-[calc(11px*var(--fs))] font-semibold ${g.lang === l ? 'bg-pine-800 text-sand-50' : ''}`}>{l === 'ar' ? 'ع' : 'EN'}</button>)}
        </div>
        <button onClick={() => { audio.stopNarration(); useGame.getState().setUi({ guideFor: null }) }} className="grid h-8 w-8 place-items-center rounded-full bg-ink-900/6"><Icon name="x" size={14} /></button>
      </div>
      <div className="scroll-y mt-2 max-h-[24dvh]"><Transcript text={g.text} pos={g.pos} lang={g.lang} /></div>
    </div>
  )
}

import { useGame, useT } from '../state/gameStore'
import { LANDMARK_MAP } from '../data/landmarks'
import { fmtDate, num } from '../lib/format'
import { rendersFor } from '../data/renders'
import { useMemoryImage } from '../state/photoStore'
import { startReplay, stopReplay, visitDateFor } from '../state/director'
import type { LandmarkId } from '../data/types'
import { Btn } from './components/Sheet'
import { Icon } from './components/Icon'
import { LandmarkEmblem } from './components/LandmarkEmblem'

function StopPhoto({ id }: { id: LandmarkId }) {
  const visiting = useGame((s) => s.visiting)
  const mem = useGame((s) => (s.visiting ? undefined : [...s.memories].reverse().find((m) => m.landmarkId === id && (m.photoKey || m.samplePhoto))))
  const url = useMemoryImage(mem?.photoKey, mem?.samplePhoto)
  const fallback = rendersFor(id)[0]
  const src = (visiting ? visiting.memories.find((m) => m.landmarkId === id && m.photo)?.photo : url) ?? fallback
  return src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-pine-800 pattern-geo"><LandmarkEmblem id={id} size={56} tone="gold" /></div>
}

export function ReplayOverlay() {
  const t = useT()
  const r = useGame((s) => s.replay)
  const lang = useGame((s) => s.lang)
  const progress = useGame((s) => s.progress)
  const memories = useGame((s) => s.memories)
  const visiting = useGame((s) => s.visiting)
  if (!r.active) return null
  const id = r.order[r.index] as LandmarkId | undefined
  const lm = id ? LANDMARK_MAP[id] : null
  const note = id ? (visiting ? visiting.memories.find((m) => m.landmarkId === id)?.note : [...memories].reverse().find((m) => m.landmarkId === id && m.note)?.note) : undefined
  const first = r.order[0], last = r.order[r.order.length - 1]

  return (
    <div className="pointer-events-none fixed inset-0 z-[65]">
      {/* letterbox */}
      <div className="absolute inset-x-0 top-0 h-[9vh] bg-black/85 transition-all" />
      <div className="absolute inset-x-0 bottom-0 h-[9vh] bg-black/85" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 safe-top text-sand-50">
        <div className="flex items-center gap-2 pt-1">
          <Icon name="play" size={14} fill className="text-gold-300" />
          <span className="font-display text-[calc(15px*var(--fs))] font-semibold">{t('replay')}</span>
          <div className="ms-2 flex gap-1">
            {r.order.map((o, k) => <span key={o} className={`h-1.5 w-5 rounded-full ${k < r.built.length ? 'bg-gold-400' : k === r.index ? 'bg-gold-200/70' : 'bg-white/25'}`} />)}
          </div>
        </div>
        {r.phase !== 'end' && (
          <button onClick={stopReplay} className="pointer-events-auto btn-press mt-1 rounded-full bg-white/15 px-3.5 py-1.5 text-[calc(13px*var(--fs))] font-semibold">{t('skip')}</button>
        )}
      </div>

      {r.phase === 'intro' && (
        <div className="absolute inset-0 grid place-items-center px-6">
          <div className="anim-rise text-center text-sand-50 drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">
            <div className="font-display text-[calc(30px*var(--fs))] font-bold"><span className="gold-text">{t('replay')}</span></div>
            <div className="mt-2 text-[calc(15px*var(--fs))]">{t('replayIntro')}</div>
          </div>
        </div>
      )}

      {lm && id && (r.phase === 'fly' || r.phase === 'build') && (
        <div className="absolute inset-x-0 bottom-[11vh] flex justify-center px-4">
          <div key={id + r.phase} className="anim-rise rounded-2xl bg-pine-950/80 px-5 py-3 text-center text-sand-50 backdrop-blur">
            <div className="text-[calc(12px*var(--fs))] text-gold-300">{t('stop')} {num(r.index + 1, lang)} / {num(r.order.length, lang)}</div>
            <div className="font-display text-[calc(20px*var(--fs))] font-semibold">{lm.name[lang]}</div>
            <div className="text-[calc(12.5px*var(--fs))] text-sand-200/85">{fmtDate(visitDateFor(id), lang, true)}</div>
          </div>
        </div>
      )}

      {lm && id && r.phase === 'card' && (
        <div className="absolute inset-x-0 bottom-[11vh] flex justify-center px-4">
          <div key={id} className="anim-pop w-full max-w-sm overflow-hidden rounded-[26px] bg-sand-50 shadow-2xl">
            <div className="relative h-44 w-full overflow-hidden">
              <StopPhoto id={id} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                <div className="text-[calc(11.5px*var(--fs))] opacity-90">{t('stop')} {num(r.index + 1, lang)}<span className="mx-1.5 opacity-40">|</span>{fmtDate(visitDateFor(id), lang)}</div>
                <div className="font-display text-[calc(22px*var(--fs))] font-semibold leading-tight">{lm.name[lang]}</div>
              </div>
            </div>
            {note && <p className="px-4 py-3 text-[calc(14px*var(--fs))] leading-relaxed text-ink-700">“{note}”</p>}
          </div>
        </div>
      )}

      {r.phase === 'aerial' && (
        <div className="absolute inset-x-0 top-[13vh] flex justify-center px-6">
          <div className="anim-rise text-center text-sand-50 drop-shadow-[0_2px_14px_rgba(0,0,0,.7)]">
            <div className="font-display text-[calc(28px*var(--fs))] font-bold">{t('replayEndTitle')}</div>
          </div>
        </div>
      )}

      {r.phase === 'end' && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-pine-950/40 px-5">
          <div className="anim-pop w-full max-w-sm rounded-[28px] bg-gradient-to-br from-pine-800 to-pine-950 p-6 text-center text-sand-50 shadow-2xl ring-1 ring-gold-400/40">
            <div className="font-display text-[calc(24px*var(--fs))] font-bold"><span className="gold-text">{t('replayEndTitle')}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat v={num(r.order.length, lang)} l={lang === 'ar' ? 'معالم' : 'landmarks'} />
              <Stat v={num(visiting ? visiting.memories.length : memories.length, lang)} l={lang === 'ar' ? 'ذكريات' : 'memories'} />
              <Stat v={num(Math.max(1, Math.round((new Date(visitDateFor(last) ?? 0).getTime() - new Date(visitDateFor(first) ?? 0).getTime()) / 86400000) + 1), lang)} l={lang === 'ar' ? 'أيام' : 'days'} />
            </div>
            <div className="mt-3 text-[calc(12.5px*var(--fs))] text-sand-200/80">
              {fmtDate(visitDateFor(first), lang)} → {fmtDate(visitDateFor(last), lang)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Btn tone="light" onClick={() => startReplay()}><Icon name="reset" size={17} /> {t('replayAgain')}</Btn>
              <Btn tone="gold" onClick={stopReplay}>{t('replayDone')}</Btn>
              {!visiting && (
                <Btn tone="light" className="col-span-2" onClick={() => { useGame.getState().setUi({ panel: 'journey' }); stopReplay() }}>
                  🎞️ {lang === 'ar' ? 'شاهد قصة رحلتي واحفظها' : 'Watch & save my travel story'}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-2 py-3">
      <div className="font-display text-[calc(22px*var(--fs))] font-bold text-gold-300">{v}</div>
      <div className="text-[calc(11.5px*var(--fs))] text-sand-200/80">{l}</div>
    </div>
  )
}

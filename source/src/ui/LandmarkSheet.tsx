import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGame, useT } from '../state/gameStore'
import { LANDMARK_MAP, hasInterior } from '../data/landmarks'
import { PLACES, SPOTS, SPOT_MAP } from '../data/places'
import { mapsSearchUrl } from './Places'
import thenNowJson from '../content/then-now.json'
import type { LandmarkId, MemoryItem } from '../data/types'
import { fmtDate, fmtDistance, fromDateInput, num, toDateInput, pctText } from '../lib/format'
import { haversine } from '../lib/geo'
import { landmarkProgress } from '../data/progression'
import { LANDMARK_SOURCES } from '../data/collectibles'
import { SourceList, TruthBadge } from './Collection'
import { AudioGuideCard } from './AudioGuide'
import { StoryEntry } from './Stories'
import { rendersFor } from '../data/renders'
import { useMemoryImage } from '../state/photoStore'
import { enterBuilding } from '../state/director'
import { Icon } from './components/Icon'
import { Btn, Pill } from './components/Sheet'
import { LandmarkEmblem } from './components/LandmarkEmblem'

type SheetTab = 'about' | 'photos' | 'memories' | 'quiz'

export function LandmarkSheet() {
  const t = useT()
  const id = useGame((s) => s.selected)
  const open = useGame((s) => s.sheetOpen && s.tab === 'city' && s.mode === 'city' && !s.replay.active && !s.visiting)
  const lang = useGame((s) => s.lang)
  const progress = useGame((s) => (id ? s.progress[id] : undefined))
  const demo = useGame((s) => s.demoMode)
  const constructing = useGame((s) => !!s.constructing)
  const pct = useGame((s) => (id ? landmarkProgress(s, id) : 0))
  const [tab, setTab] = useState<SheetTab>('about')
  const [expanded, setExpanded] = useState(false)
  const s = useGame.getState
  if (!open || !id) return null
  const lm = LANDMARK_MAP[id]
  const unlocked = !!progress?.unlocked

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[28px] bg-sand-50 shadow-[0_-12px_40px_rgba(8,36,27,.35)] anim-rise md:inset-x-auto md:bottom-4 md:end-4 md:top-[92px] md:w-[400px] md:rounded-[28px] ${expanded ? 'h-[86dvh]' : 'h-[58dvh]'} md:h-auto`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-ink-900/15 md:hidden" onClick={() => setExpanded(!expanded)} aria-label="expand" />
      {/* header */}
      <div className="flex items-start gap-3 px-5 pt-3">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${unlocked ? 'bg-pine-800' : 'bg-ink-700/80'} pattern-geo`}>
          <LandmarkEmblem id={id} size={40} tone={unlocked ? 'gold' : 'light'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-[calc(22px*var(--fs))] font-semibold leading-tight text-pine-900">{lm.name[lang]}</h2>
          </div>
          <div className="text-[calc(12.5px*var(--fs))] text-ink-500">{lm.name[lang === 'ar' ? 'en' : 'ar']} · {lm.kind[lang]}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {unlocked ? <Pill tone="green"><Icon name="check" size={12} /> {t('unlocked')}</Pill> : <Pill><Icon name="lock" size={12} /> {t('locked')}</Pill>}
            <Pill tone="gold">{interiorLabel(lm.interior, lang)}</Pill>
            {lm.approx && <Pill>≈ {lang === 'ar' ? 'موضع تقريبي' : 'Approximate position'}</Pill>}
          </div>
          {unlocked && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/8"><div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${pct}%` }} /></div>
              <span className="text-[calc(11px*var(--fs))] font-bold text-gold-600">{pctText(pct, lang)}</span>
            </div>
          )}
        </div>
        <button onClick={() => s().closeSheet()} className="btn-press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900/6" aria-label={t('close')}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="scroll-y min-h-0 flex-1 px-5 pb-6 pt-3">
        {/* status / actions */}
        {unlocked ? (
          <div className="rounded-2xl bg-pine-800 p-4 text-sand-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[calc(12px*var(--fs))] text-sand-200/80">{t('visitedOn')}</div>
                <div className="text-[calc(14px*var(--fs))] font-semibold">{fmtDate(progress?.visitDate, lang, true)}</div>
              </div>
              <label className="btn-press relative grid h-9 w-9 place-items-center rounded-xl bg-white/12" aria-label="edit date">
                <Icon name="edit" size={16} />
                <input
                  type="date"
                  className="absolute inset-0 opacity-0"
                  value={toDateInput(progress?.visitDate)}
                  max={toDateInput()}
                  onChange={(e) => e.target.value && s().setVisitDate(id, fromDateInput(e.target.value, progress?.visitDate))}
                />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              {hasInterior(id) ? (
                <Btn tone="gold" onClick={() => enterBuilding(id)} disabled={constructing}>
                  <Icon name="door" size={18} /> {enterLabel(id, lang)}
                </Btn>
              ) : (
                <a href={mapsSearchUrl(lm.coords)} target="_blank" rel="noopener noreferrer" className="btn-press flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-3 font-semibold text-pine-950 shadow-lg">🗺️ {lang === 'ar' ? 'افتح في الخرائط' : 'Open in Maps'}</a>
              )}
              <Btn tone="light" onClick={() => s().setUi({ composer: { landmarkId: id } })}>
                <Icon name="camera" size={18} />
              </Btn>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-pine-800/10 bg-white p-4">
            <div className="font-semibold text-pine-900">{t('verifyTitle')}</div>
            <p className="mt-1 text-[calc(13px*var(--fs))] leading-relaxed text-ink-500">{t('verifyHint')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn tone="primary" onClick={() => s().setUi({ verifyFor: id, verifyMode: 'qr' })}><Icon name="qr" size={18} /> {t('scanQR')}</Btn>
              <Btn tone="outline" onClick={() => s().setUi({ verifyFor: id, verifyMode: 'gps' })}><Icon name="gps" size={18} /> {t('gpsCheckin')}</Btn>
            </div>
            {demo && (
              <Btn tone="gold" full className="mt-2" onClick={() => s().unlock(id, 'demo')} disabled={constructing}>
                <Icon name="sparkle" size={18} /> {t('demoUnlock')}
              </Btn>
            )}
            <p className="mt-2 text-[calc(11.5px*var(--fs))] text-ink-500">{lm.visitTip[lang]}</p>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Btn tone="ghost" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().camTo('focus', id)}><Icon name="target" size={16} /> {lang === 'ar' ? 'تركيز الكاميرا' : 'Focus camera'}</Btn>
          <Btn tone="ghost" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ panel: 'ar', arFor: id })}><Icon name="cube" size={16} /> {lang === 'ar' ? 'عرض 3D و AR' : '3D view & AR'}</Btn>
        </div>
        <RoutesFrom id={id} />

        {/* tabs */}
        <div className="scroll-x -mx-5 mt-4 flex gap-1.5 px-5">
          {(['about', 'photos', 'memories', 'quiz'] as SheetTab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`btn-press shrink-0 rounded-full px-3.5 py-2 text-[calc(13px*var(--fs))] font-semibold ${tab === k ? 'bg-pine-800 text-sand-50' : 'bg-ink-900/5 text-ink-700'}`}
            >
              {t(k === 'about' ? 'tabAbout' : k === 'photos' ? 'tabPhotos' : k === 'memories' ? 'tabMemories' : 'tabQuiz')}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {tab === 'about' && <About id={id} />}
          {tab === 'photos' && <Photos id={id} />}
          {tab === 'memories' && <MemoriesTab id={id} unlocked={unlocked} />}
          {tab === 'quiz' && <QuizTab id={id} unlocked={unlocked} />}
        </div>
      </div>
    </div>
  )
}

function RoutesFrom({ id }: { id: LandmarkId }) {
  const lang = useGame((s) => s.lang)
  const routeTo = useGame((s) => s.routeTo)
  const unlockedMap = useGame((s) => s.progress)
  const others = SPOTS.filter((x) => x.id !== id && x.category !== 'transport').map((x) => ({ id: x.id, d: haversine(LANDMARK_MAP[id].coords, x.coords) })).sort((a, b) => a.d - b.d).slice(0, 10)
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[calc(12.5px*var(--fs))] font-semibold text-ink-500"><Icon name="route" size={14} /> {lang === 'ar' ? 'الأقرب إليه' : 'Closest places'}</div>
      <div className="scroll-x -mx-5 flex gap-1.5 px-5">
        {others.map((o) => (
          <button
            key={o.id}
            onClick={() => { const g = useGame.getState(); if (routeTo === o.id) { g.setUi({ routeTo: null }); g.camTo('focus', id) } else { g.setUi({ routeTo: o.id }); g.camTo('route', id) } }}
            className={`btn-press shrink-0 rounded-2xl px-3 py-2 text-start text-[calc(12px*var(--fs))] ring-1 ${routeTo === o.id ? 'bg-gold-400 text-pine-950 ring-gold-500' : 'bg-white text-ink-700 ring-ink-900/8'}`}
          >
            <div className="font-semibold">{SPOT_MAP[o.id].name[lang]} {o.id in LANDMARK_MAP && !unlockedMap[o.id as LandmarkId]?.unlocked ? '?' : ''}</div>
            <div className="text-[calc(11px*var(--fs))] opacity-80">{fmtDistance(o.d, lang)} {lang === 'ar' ? 'خط مستقيم' : 'straight line'}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function About({ id }: { id: LandmarkId }) {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const lm = LANDMARK_MAP[id]
  return (
    <div className="space-y-3">
      <StoryEntry id={id} />
      <div className="grid grid-cols-2 gap-2">
        {id in thenNowJson && <button onClick={() => useGame.getState().setUi({ panel: 'thenNow', thenNowFor: id })} className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-white px-2 py-2.5 text-[calc(12.5px*var(--fs))] font-semibold ring-1 ring-ink-900/8">🕰️ {lang === 'ar' ? 'الماضي والحاضر' : 'Then & Now'}</button>}
        <button onClick={() => useGame.getState().setUi({ panel: 'guide' })} className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-white px-2 py-2.5 text-[calc(12.5px*var(--fs))] font-semibold ring-1 ring-ink-900/8">🧭 {lang === 'ar' ? 'اسأل المرشد' : 'Ask the guide'}</button>
      </div>
      <AudioGuideCard id={id} />
      <p className="font-display text-[calc(17px*var(--fs))] text-gold-600">{lm.tagline[lang]}</p>
      <TruthBadge kind="verified" />
      <div className="grid grid-cols-2 gap-2">
        {lm.facts.map((f, i) => (
          <div key={i} className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink-900/5">
            <div className="text-[calc(11px*var(--fs))] text-ink-500">{f.label[lang]}</div>
            <div className="text-[calc(14.5px*var(--fs))] font-bold text-pine-900">{f.value[lang]}</div>
          </div>
        ))}
      </div>
      {lm.history[lang].map((p, i) => <p key={i} className="text-[calc(14.5px*var(--fs))] leading-[1.85] text-ink-700">{p}</p>)}
      <div className="flex gap-2 rounded-2xl bg-gold-300/20 p-3 text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700 ring-1 ring-gold-500/20">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-600" />
        <div><span className="font-semibold">🎮 {t('modelNote')}: </span>{lm.modelNote[lang]}</div>
      </div>
      <NearbyPlaces id={id} />
      <SourceList sources={LANDMARK_SOURCES[id]} />
    </div>
  )
}

/** Map-only places next to this landmark (e.g. the mosques beside Al-Ghamama). */
function NearbyPlaces({ id }: { id: LandmarkId }) {
  const lang = useGame((s) => s.lang)
  const lm = LANDMARK_MAP[id]
  const near = PLACES.filter((p) => p.near === id || haversine(p.coords, lm.coords) < 700).slice(0, 4)
  if (!near.length) return null
  return (
    <div>
      <div className="mb-1.5 text-[calc(12.5px*var(--fs))] font-semibold text-ink-500">📍 {lang === 'ar' ? 'أماكن قريبة على الخريطة' : 'Nearby on the map'}</div>
      <div className="flex flex-wrap gap-1.5">
        {near.map((p) => <button key={p.id} onClick={() => useGame.getState().openPlace(p.id)} className="btn-press rounded-full bg-white px-3 py-1.5 text-[calc(12.5px*var(--fs))] font-semibold text-pine-900 ring-1 ring-ink-900/10">{p.name[lang]}</button>)}
      </div>
    </div>
  )
}

export function interiorLabel(kind: 'full' | 'simplified' | 'courtyard' | 'none', lang: 'ar' | 'en') {
  const m = { full: ['تجوّل كامل داخل المبنى', 'Full walkable interior'], simplified: ['معاينة داخلية مبسّطة', 'Simplified interior preview'], courtyard: ['تجوّل في الساحات فقط', 'Walk the plazas only'], none: ['بلا مشهد داخلي — نموذج في المدينة', 'No interior — city model only'] }[kind]
  return lang === 'ar' ? m[0] : m[1]
}
export function enterLabel(id: LandmarkId, lang: 'ar' | 'en') {
  if (id === 'uhud') return lang === 'ar' ? 'تجوّل في الموقع' : 'Explore the site'
  if (id === 'haram') return lang === 'ar' ? 'تجوّل في الساحات' : 'Walk the plazas'
  return lang === 'ar' ? 'ادخل المبنى' : 'Enter building'
}

function Photos({ id }: { id: LandmarkId }) {
  const t = useT()
  const renders = rendersFor(id)
  const mems = useGame(useShallow((s) => s.memories.filter((m) => m.landmarkId === id && (m.photoKey || m.samplePhoto))))
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-[calc(13px*var(--fs))] font-semibold text-ink-700">{t('gameRenders')}</div>
        {renders.length ? (
          <div className="scroll-x -mx-5 flex gap-2 px-5">
            {renders.map((u, i) => <img key={i} src={u} alt="" className="h-36 w-52 shrink-0 rounded-2xl object-cover ring-1 ring-ink-900/10" />)}
          </div>
        ) : (
          <div className="grid h-28 place-items-center rounded-2xl bg-pine-800/90 pattern-geo"><LandmarkEmblem id={id} size={56} tone="gold" /></div>
        )}
        <p className="mt-1.5 text-[calc(11.5px*var(--fs))] text-ink-500">{t('gameRendersNote')}</p>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[calc(13px*var(--fs))] font-semibold text-ink-700"><Icon name="lock" size={13} /> {t('myPhotos')}</div>
        {mems.length ? (
          <div className="grid grid-cols-3 gap-2">
            {mems.map((m) => <Thumb key={m.id} m={m} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-900/15 p-4 text-center text-[calc(13px*var(--fs))] text-ink-500">{t('noPhotosYet')}</div>
        )}
      </div>
    </div>
  )
}

export function Thumb({ m, className = 'aspect-square' }: { m: MemoryItem; className?: string }) {
  const url = useMemoryImage(m.photoKey, m.samplePhoto)
  return (
    <button onClick={() => useGame.getState().setUi({ memoryView: m.id })} className={`btn-press relative overflow-hidden rounded-xl bg-sand-200 ${className}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-ink-500"><Icon name="image" /></div>}
      {m.sample && <span className="absolute bottom-1 start-1 rounded-full bg-black/45 px-1.5 text-[calc(9px*var(--fs))] text-white">{useGame.getState().lang === 'ar' ? 'تجريبية' : 'sample'}</span>}
    </button>
  )
}

function MemoriesTab({ id, unlocked }: { id: LandmarkId; unlocked: boolean }) {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const mems = useGame(useShallow((s) => s.memories.filter((m) => m.landmarkId === id)))
  if (!unlocked) return <Locked text={t('unlockToAdd')} />
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 rounded-xl bg-pine-800/6 px-3 py-2 text-[calc(12px*var(--fs))] text-pine-800"><Icon name="lock" size={13} /> {t('privateNote')}</div>
      {[...mems].reverse().map((m) => (
        <button key={m.id} onClick={() => useGame.getState().setUi({ memoryView: m.id })} className="btn-press flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-start ring-1 ring-ink-900/5">
          <Thumb m={m} className="h-14 w-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[calc(13.5px*var(--fs))] text-ink-900">{m.note || '—'}</div>
            <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{fmtDate(m.date, lang)}</div>
          </div>
        </button>
      ))}
      <Btn tone="primary" full onClick={() => useGame.getState().setUi({ composer: { landmarkId: id } })}><Icon name="camera" size={18} /> {t('addMemory')}</Btn>
    </div>
  )
}

function QuizTab({ id, unlocked }: { id: LandmarkId; unlocked: boolean }) {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const quiz = useGame((s) => s.quiz)
  const lm = LANDMARK_MAP[id]
  const answered = lm.quiz.filter((q) => q.id in quiz).length
  const correct = lm.quiz.filter((q) => quiz[q.id]).length
  if (!unlocked) return <Locked text={t('quizLocked')} />
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-900/5">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{t('quizzes')}</div>
        <Pill tone="gold">{num(correct, lang)}/{num(lm.quiz.length, lang)}</Pill>
      </div>
      <p className="mt-1 text-[calc(13px*var(--fs))] text-ink-500">{lang === 'ar' ? `${num(lm.quiz.length, lang)} أسئلة · ٣٠ نقطة لكل إجابة صحيحة` : `${lm.quiz.length} questions · 30 pts each`}</p>
      <Btn tone="primary" className="mt-3" full disabled={answered === lm.quiz.length} onClick={() => useGame.getState().setUi({ quizFor: id })}>
        <Icon name="star" size={18} /> {answered === lm.quiz.length ? `${t('quizScore')}: ${num(correct, lang)}/${num(lm.quiz.length, lang)}` : t('startQuiz')}
      </Btn>
    </div>
  )
}

function Locked({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-900/15 p-4 text-[calc(13.5px*var(--fs))] text-ink-500">
      <Icon name="lock" size={18} /> {text}
    </div>
  )
}

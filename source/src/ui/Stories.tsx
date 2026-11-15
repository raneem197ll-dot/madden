import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/gameStore'
import { Modal, Btn } from './components/Sheet'
import { KindBadge } from './components/Bits'
import { SourceList } from './Collection'
import { STORIES, STORY_MAP, STORY_POINTS, type Story } from '../data/stories'
import { LANDMARK_MAP } from '../data/landmarks'
import { COLLECTIBLE_MAP } from '../data/collectibles'
import { INTERIORS } from '../data/content'
import { enterBuilding, exitBuilding } from '../state/director'
import { num } from '../lib/format'
import type { Bi, InfoContent, LandmarkId } from '../data/types'

/** The verified card a story clue points at (interior info card or collectible). */
function targetCard(key: string): { title: Bi; body: Bi } | null {
  const [kind, lid, id] = key.split(':')
  if (kind === 'hidden') { const c = COLLECTIBLE_MAP[`${lid}:${id}`]; return c ? { title: c.name, body: c.fact } : null }
  const cards = (INTERIORS as unknown as Record<string, Record<string, InfoContent>>)[lid]
  const c = cards?.[id]
  return c ? { title: c.title, body: c.body } : null
}

function StoryList({ onOpen }: { onOpen: (s: Story) => void }) {
  const lang = useGame((s) => s.lang)
  const stories = useGame((s) => s.stories)
  const progress = useGame((s) => s.progress)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  return (
    <div className="space-y-2.5">
      <p className="text-[calc(12px*var(--fs))] leading-relaxed text-ink-500">{L('قصص قصيرة من معلومات موثّقة: تقرأ، وتبحث عن أدلة داخل المعالم، وتجيب عن أسئلة. بلا مؤقّت ولا خسارة — خذ وقتك.', 'Short stories built from verified facts: read, look for clues inside the landmarks and answer questions. No timers and no losing — take your time.')}</p>
      {STORIES.map((s) => {
        const st = stories[s.id]
        const done = !!st?.doneAt
        const un = !!progress[s.landmark]?.unlocked
        return (
          <button key={s.id} onClick={() => onOpen(s)} className="btn-press flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-start ring-1 ring-ink-900/6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pine-800 text-2xl" aria-hidden="true">{s.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[calc(14.5px*var(--fs))] font-semibold text-pine-900">{s.title[lang]}</span>
              <span className="block text-[calc(11.5px*var(--fs))] text-ink-500">{LANDMARK_MAP[s.landmark].name[lang]}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{L(`${num(s.steps.length, lang)} خطوات`, `${s.steps.length} steps`)}{!un ? L(' · يحتاج فتح المعلم', ' · needs the landmark unlocked') : ''}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[calc(11px*var(--fs))] font-bold ${done ? 'bg-pine-700 text-sand-50' : st ? 'bg-gold-400/25 text-gold-600' : 'bg-ink-900/6 text-ink-700'}`}>
              {done ? L('✓ مكتملة', '✓ Done') : st ? L(`${num(st.step + 1, lang)}/${num(s.steps.length, lang)}`, `${st.step + 1}/${s.steps.length}`) : L('ابدأ', 'Start')}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Runner({ story }: { story: Story }) {
  const lang = useGame((s) => s.lang)
  const st = useGame((s) => s.stories[story.id])
  const fb = useGame((s) => s.storyFeedback)
  const disc = useGame((s) => s.discoveries)
  const progress = useGame((s) => s.progress)
  const mode = useGame((s) => s.mode)
  const interiorId = useGame((s) => s.interiorId)
  const g = useGame.getState
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  if (!st) return null
  const i = Math.min(st.step, story.steps.length - 1)
  const step = story.steps[i]
  const lm = LANDMARK_MAP[story.landmark]
  const next = () => g().advanceStory(story.id)
  const pct = Math.round((st.step / story.steps.length) * 100)
  const inside = mode === 'interior' && interiorId === story.landmark

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pine-800 text-2xl" aria-hidden="true">{story.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[calc(17px*var(--fs))] font-semibold text-pine-900">{story.title[lang]}</div>
          <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{lm.name[lang]}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{L(`الخطوة ${num(i + 1, lang)} من ${num(story.steps.length, lang)}`, `Step ${i + 1} of ${story.steps.length}`)}</div>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/8" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} /></div>
      {i === 0 && st.step === 0 && <p className="text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700">{story.intro[lang]}</p>}

      {(step.type === 'read' || step.type === 'reflect') && (
        <div className={`rounded-2xl p-3.5 ${step.type === 'reflect' ? 'bg-pine-900 text-sand-50' : 'bg-white ring-1 ring-ink-900/6'}`}>
          <div className="mb-1.5">{step.type === 'reflect' ? <span className="text-[calc(11px*var(--fs))] font-bold text-gold-300">🤲 {L('لحظة تأمّل', 'A moment to reflect')}</span> : <KindBadge kind="fact" />}</div>
          <p className="text-[calc(14.5px*var(--fs))] leading-[1.85]">{step.text[lang]}</p>
          <Btn tone={step.type === 'reflect' ? 'gold' : 'primary'} full className="mt-3 py-2.5" onClick={next}>{i === story.steps.length - 1 ? L('إنهاء القصة', 'Finish the story') : L('متابعة', 'Continue')}</Btn>
        </div>
      )}

      {step.type === 'question' && (
        <div className="rounded-2xl bg-white p-3.5 ring-1 ring-ink-900/6">
          <div className="mb-2 text-[calc(14.5px*var(--fs))] font-semibold leading-relaxed">{step.q[lang]}</div>
          <div className="space-y-1.5" role="group" aria-label={L('الخيارات', 'Options')}>
            {step.options.map((o, k) => {
              const picked = fb?.step === st.step && fb.choice === k
              const reveal = fb?.step === st.step
              const right = k === step.answer
              return (
                <button key={k} disabled={reveal} onClick={() => g().setUi({ storyFeedback: { step: st.step, choice: k } })}
                  className={`btn-press flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-[calc(13.5px*var(--fs))] font-semibold ring-1 ${reveal && right ? 'bg-pine-700 text-sand-50 ring-pine-700' : picked ? 'bg-gold-300/30 ring-gold-500/40' : 'bg-sand-50 ring-ink-900/10'}`}>
                  {o[lang]} {reveal && right && <span aria-hidden="true">✓</span>}
                </button>
              )
            })}
          </div>
          {fb?.step === st.step && (
            <div className="mt-2.5 space-y-2">
              <div role="status" className={`rounded-xl px-3 py-2 text-[calc(13px*var(--fs))] leading-relaxed ${fb.choice === step.answer ? 'bg-pine-800/10 text-pine-900' : 'bg-gold-300/25 text-ink-900'}`}>
                <b>{fb.choice === step.answer ? L('أحسنت. ', 'Well done. ') : L('ليس تمامًا — ', 'Not quite — ')}</b>{step.explain[lang]}
              </div>
              {step.sources && <SourceList sources={step.sources} />}
              <Btn tone="primary" full className="py-2.5" onClick={next}>{L('متابعة', 'Continue')}</Btn>
            </div>
          )}
        </div>
      )}

      {step.type === 'find' && (() => {
        const found = !!disc[step.target]
        const card = targetCard(step.target)
        return (
          <div className="rounded-2xl bg-gold-300/20 p-3.5 ring-1 ring-gold-500/30">
            <div className="mb-1 text-[calc(11px*var(--fs))] font-bold text-gold-600">🔎 {L('دليل', 'Clue')}</div>
            <p className="text-[calc(14.5px*var(--fs))] font-semibold leading-relaxed">{step.clue[lang]}</p>
            {inside ? (
              <>
                <p className="mt-1 text-[calc(12px*var(--fs))] text-ink-700">{L('تجوّل وافحص ما تراه — سيتقدّم القصّ حين تجده.', "Walk around and inspect what you see — the story moves on when you find it.")}</p>
                <Btn tone="primary" full className="mt-2.5 py-2.5" onClick={() => g().setUi({ panel: null })}>{L('ابدأ البحث', 'Start looking')}</Btn>
              </>
            ) : found && card ? (
              <>
                <div className="mt-2 rounded-xl bg-white p-2.5 text-[calc(12.5px*var(--fs))]"><div className="mb-0.5"><KindBadge kind="fact" /></div><b>{card.title[lang]}</b><p className="mt-0.5 leading-relaxed text-ink-700">{card.body[lang]}</p></div>
                <p className="mt-1 text-[calc(11.5px*var(--fs))] text-ink-500">{L('وجدت هذا في زيارة سابقة.', 'You found this on an earlier visit.')}</p>
                <Btn tone="primary" full className="mt-2 py-2.5" onClick={next}>{L('متابعة', 'Continue')}</Btn>
              </>
            ) : progress[story.landmark]?.unlocked ? (
              <Btn tone="primary" full className="mt-2.5 py-2.5" onClick={async () => { g().setUi({ panel: null }); if (useGame.getState().mode === 'interior') await exitBuilding(); enterBuilding(story.landmark as LandmarkId) }}>
                {L(`ادخل ${lm.name.ar}`, `Enter ${lm.name.en}`)}
              </Btn>
            ) : (
              <>
                <p className="mt-1 text-[calc(12px*var(--fs))] text-ink-700">{L(`الدليل داخل ${lm.name.ar}. افتحه أولًا بزيارته ومسح رمزه.`, `The clue is inside ${lm.name.en}. Unlock it first by visiting and scanning its code.`)}</p>
                <Btn tone="outline" full className="mt-2 py-2.5" onClick={() => { g().setUi({ panel: null, tab: 'city' }); g().openVerify(story.landmark) }}>{L('افتح المعلم', 'Unlock the landmark')}</Btn>
              </>
            )}
          </div>
        )
      })()}
      <button onClick={() => g().setPrefs({ activeStory: null })} className="text-[calc(11.5px*var(--fs))] text-ink-500 underline">{L('كل القصص', 'All stories')}</button>
    </div>
  )
}

function Finished({ story }: { story: Story }) {
  const lang = useGame((s) => s.lang)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const lessons = story.steps.flatMap((s) => (s.type === 'read' || s.type === 'reflect' ? [s.text[lang]] : s.type === 'question' ? [s.explain[lang]] : []))
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-pine-900 p-4 text-center text-sand-50">
        <div className="text-4xl" aria-hidden="true">{story.icon}</div>
        <div className="mt-1 font-display text-[calc(18px*var(--fs))] font-semibold">{L('اكتملت القصة', 'Story complete')}</div>
        <div className="text-[calc(12.5px*var(--fs))] text-sand-100/80">{story.title[lang]}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>+{num(STORY_POINTS, lang)} {L('نقطة', 'points')}</div>
      </div>
      <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/6">
        <div className="mb-1 text-[calc(12.5px*var(--fs))] font-bold text-pine-900">{L('ما تعلّمته', 'What you learned')}</div>
        <ul className="space-y-1.5 text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700">{lessons.map((x, i) => <li key={i}>• {x}</li>)}</ul>
      </div>
    </div>
  )
}

/** Panel: story list, the active story's current step, or a finished story's summary. */
export function StoriesPanel() {
  const open = useGame((s) => s.panel === 'stories')
  const lang = useGame((s) => s.lang)
  const active = useGame((s) => s.activeStory)
  const g = useGame.getState
  const [review, setReview] = useState<string | null>(null)
  const prev = useRef(active)
  useEffect(() => {
    // a story that just finished: show what was learned
    if (prev.current && !active && g().stories[prev.current]?.doneAt) setReview(prev.current)
    prev.current = active
  }, [active, g])
  useEffect(() => { if (!open) setReview(null) }, [open])
  const story = active ? STORY_MAP[active] : null
  const onOpen = (s: Story) => { if (g().stories[s.id]?.doneAt) setReview(s.id); else { setReview(null); g().startStory(s.id) } }
  return (
    <Modal open={open} onClose={() => g().setUi({ panel: null })} title={lang === 'ar' ? 'قصص تفاعلية' : 'Interactive stories'}>
      {story ? <Runner story={story} /> : review && STORY_MAP[review] ? (
        <>
          <Finished story={STORY_MAP[review]} />
          <button onClick={() => setReview(null)} className="mt-3 text-[calc(12px*var(--fs))] text-ink-500 underline">{lang === 'ar' ? 'كل القصص' : 'All stories'}</button>
        </>
      ) : <StoryList onOpen={onOpen} />}
    </Modal>
  )
}

/** Inside an interior: a slim clue banner for the active story (doesn't block walking). */
export function InteriorStoryHud() {
  const lang = useGame((s) => s.lang)
  const active = useGame((s) => s.activeStory)
  const interiorId = useGame((s) => s.interiorId)
  const st = useGame((s) => (s.activeStory ? s.stories[s.activeStory] : undefined))
  const panel = useGame((s) => s.panel)
  const story = active ? STORY_MAP[active] : null
  if (!story || !st || story.landmark !== interiorId || panel) return null
  const step = story.steps[Math.min(st.step, story.steps.length - 1)]
  const text = step.type === 'find' ? step.clue[lang] : lang === 'ar' ? 'القصة تنتظرك — اضغط للمتابعة' : 'Your story continues — tap to go on'
  return (
    <button onClick={() => useGame.getState().setUi({ panel: 'stories' })} className="btn-press pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+64px)] z-20 mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-pine-950/80 px-3 py-2 text-start text-sand-50 shadow-lg backdrop-blur" aria-live="polite">
      <span className="text-xl" aria-hidden="true">{story.icon}</span>
      <span className="min-w-0 flex-1 text-[calc(12.5px*var(--fs))] leading-snug"><b className="text-gold-300">{step.type === 'find' ? (lang === 'ar' ? 'دليل: ' : 'Clue: ') : ''}</b>{text}</span>
    </button>
  )
}

/** Small entry in the landmark panel. */
export function StoryEntry({ id }: { id: LandmarkId }) {
  const lang = useGame((s) => s.lang)
  const stories = useGame((s) => s.stories)
  const list = STORIES.filter((s) => s.landmark === id)
  if (!list.length) return null
  return (
    <div className="space-y-1.5">
      {list.map((s) => {
        const st = stories[s.id]
        return (
          <button key={s.id} onClick={() => { if (!st?.doneAt) useGame.getState().startStory(s.id); useGame.getState().setUi({ panel: 'stories' }) }} className="btn-press flex w-full items-center gap-2.5 rounded-2xl bg-pine-800 px-3 py-2.5 text-start text-sand-50">
            <span className="text-xl" aria-hidden="true">{s.icon}</span>
            <span className="min-w-0 flex-1"><span className="block text-[calc(11px*var(--fs))] text-sand-100/70">{lang === 'ar' ? 'قصة تفاعلية' : 'Interactive story'}</span><span className="block truncate text-[calc(13.5px*var(--fs))] font-semibold">{s.title[lang]}</span></span>
            <span className="rounded-full bg-white/12 px-2 py-0.5 text-[calc(11px*var(--fs))] font-semibold">{st?.doneAt ? '✓' : st ? (lang === 'ar' ? 'تابع' : 'Continue') : lang === 'ar' ? 'ابدأ' : 'Start'}</span>
          </button>
        )
      })}
    </div>
  )
}


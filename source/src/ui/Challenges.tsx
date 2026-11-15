import { useGame } from '../state/gameStore'
import { Modal } from './components/Sheet'
import { CHALLENGES, challengeActive, challengeProgress, goalDone, type Challenge, type Goal } from '../data/challenges'
import { STORY_MAP } from '../data/stories'
import { LANDMARK_MAP } from '../data/landmarks'
import { COLLECTIBLE_MAP } from '../data/collectibles'
import { INTERIORS } from '../data/content'
import { fmtDate, num } from '../lib/format'
import type { InfoContent, Lang, LandmarkId } from '../data/types'

function goalLabel(g: Goal, lang: Lang, found: boolean): string {
  const ar = lang === 'ar'
  if (g.k === 'unlock') return ar ? `افتح ${LANDMARK_MAP[g.id].name.ar}` : `Unlock ${LANDMARK_MAP[g.id].name.en}`
  if (g.k === 'story') return ar ? `أكمل قصة «${STORY_MAP[g.id]?.title.ar}»` : `Finish the story “${STORY_MAP[g.id]?.title.en}”`
  const [kind, lid, id] = g.key.split(':')
  const where = LANDMARK_MAP[lid as LandmarkId].name[lang]
  if (kind === 'hidden') {
    // collectibles keep their name hidden until found
    return found ? `${COLLECTIBLE_MAP[`${lid}:${id}`]?.name[lang]}${ar ? ' — ' : ' · '}${where}` : ar ? `مقتنى مخفي في ${where}` : `A hidden item in ${where}`
  }
  const card = (INTERIORS as unknown as Record<string, Record<string, InfoContent>>)[lid]?.[id]
  return `${card?.title[lang] ?? id}${ar ? ' — ' : ' · '}${where}`
}

function ChallengeCard({ c }: { c: Challenge }) {
  const lang = useGame((s) => s.lang)
  const s = useGame((st) => st)
  const done = s.challenges?.[c.id]
  const [have, need] = challengeProgress(c, s)
  const active = challengeActive(c)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const season = c.season.type === 'always' ? L('متاح دائمًا', 'Always available') : active ? L(`في موسمه الآن، ${c.season.label.ar}`, `In season now · ${c.season.label.en}`) : L(`يعود في: ${c.season.label.ar}`, `Returns: ${c.season.label.en}`)
  return (
    <article className={`rounded-2xl p-3 ring-1 ${done ? 'bg-pine-800/6 ring-pine-700/20' : 'bg-white ring-ink-900/6'}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pine-800 text-2xl" aria-hidden="true">{c.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-[calc(14.5px*var(--fs))] font-semibold text-pine-900">{c.title[lang]}</h4>
            <span className="shrink-0 text-[calc(11px*var(--fs))] font-bold text-gold-600">+{num(c.points, lang)}</span>
          </div>
          <div className={`text-[calc(11px*var(--fs))] font-semibold ${c.season.type === 'always' ? 'text-ink-500' : active ? 'text-pine-700' : 'text-ink-500'}`}>{c.theme === 'seasonal' ? '🗓️ ' : '🗂️ '}{season}</div>
          <p className="mt-1 text-[calc(12px*var(--fs))] leading-relaxed text-ink-700">{c.desc[lang]}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/8" role="progressbar" aria-valuenow={have} aria-valuemin={0} aria-valuemax={need}><div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${(have / need) * 100}%` }} /></div>
        <span className="text-[calc(11px*var(--fs))] font-bold text-ink-700">{num(have, lang)}/{num(need, lang)}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {c.goals.map((g, i) => {
          const ok = goalDone(g, s)
          return <li key={i} className={`flex items-center gap-2 text-[calc(12px*var(--fs))] ${ok ? 'text-pine-800' : 'text-ink-700'}`}><span aria-hidden="true">{ok ? '✅' : '◻️'}</span><span className="sr-only">{ok ? L('تم', 'done') : L('لم يتم', 'not yet')}</span>{goalLabel(g, lang, ok)}</li>
        })}
      </ul>
      {done ? <div className="mt-2 text-[calc(11.5px*var(--fs))] font-semibold text-pine-700">✓ {L('اكتمل', 'Completed')}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{fmtDate(done, lang)}</div>
        : have >= need && !active ? <div className="mt-2 text-[calc(11.5px*var(--fs))] text-ink-500">{L('أنجزت كل الأهداف — تُحتسب الشارة حين يحلّ موسمه.', 'All goals met — the badge is awarded when its season comes round.')}</div> : null}
    </article>
  )
}

export function ChallengeList() {
  const lang = useGame((s) => s.lang)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const seasonal = CHALLENGES.filter((c) => c.theme === 'seasonal').sort((a, b) => Number(challengeActive(b)) - Number(challengeActive(a)))
  const collections = CHALLENGES.filter((c) => c.theme === 'collection')
  return (
    <div className="space-y-4">
      <p className="text-[calc(12px*var(--fs))] leading-relaxed text-ink-500">{L('تحديات اختيارية تُنجز بالاكتشاف الحقيقي داخل المعالم: كل هدف معلومة أو مقتنى أو قصة — لا نقاط على التكرار.', 'Optional challenges completed by real discoveries inside the landmarks: every goal is a fact, an item or a story — no points for repetition.')}</p>
      <section className="space-y-2"><h3 className="text-[calc(13px*var(--fs))] font-bold text-pine-900">{L('تحديات موسمية', 'Seasonal challenges')}</h3>{seasonal.map((c) => <ChallengeCard key={c.id} c={c} />)}</section>
      <section className="space-y-2"><h3 className="text-[calc(13px*var(--fs))] font-bold text-pine-900">{L('مجموعات موضوعية', 'Themed collections')}</h3>{collections.map((c) => <ChallengeCard key={c.id} c={c} />)}</section>
    </div>
  )
}

export function ChallengesPanel() {
  const open = useGame((s) => s.panel === 'challenges')
  const lang = useGame((s) => s.lang)
  return (
    <Modal open={open} onClose={() => useGame.getState().setUi({ panel: null })} title={lang === 'ar' ? 'التحديات والمجموعات' : 'Challenges & collections'}>
      <ChallengeList />
    </Modal>
  )
}

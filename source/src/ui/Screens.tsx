import { useEffect, useState, type ReactNode } from 'react'
import { useGame, usePoints, useT } from '../state/gameStore'
import { LANDMARKS, LANDMARK_IDS, LANDMARK_MAP, ALL_QUIZ } from '../data/landmarks'
import { ACHIEVEMENTS, DECORATIONS, levelFor, LEVELS } from '../data/progression'
import type { LandmarkId } from '../data/types'
import { fmtDate, fmtDistance, num, pct, pctText } from '../lib/format'
import { getPosition, haversine } from '../lib/geo'
import { Icon } from './components/Icon'
import { Btn, Pill, ProgressRing, Toggle } from './components/Sheet'
import { LandmarkEmblem } from './components/LandmarkEmblem'
import { Thumb } from './LandmarkSheet'
import { ChallengeList } from './Challenges'
import { StatsDashboard } from './Stats'
import { CollectionGrid } from './Collection'
import { FriendsSection } from './Social'
import { landmarkProgress } from '../data/progression'
import { PlacesDirectory } from './Places'

function Segments<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex rounded-2xl bg-ink-900/6 p-1">
      {options.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={`btn-press flex-1 rounded-xl py-2 text-[calc(13px*var(--fs))] font-semibold ${value === k ? 'bg-pine-800 text-sand-50 shadow' : 'text-ink-700'}`}>{label}</button>
      ))}
    </div>
  )
}

function Screen({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-sand-100 anim-fade">
      <div className="pattern-geo absolute inset-0 opacity-70" />
      <div className="relative bg-gradient-to-b from-pine-800 to-pine-900 px-5 pb-6 pt-3 text-sand-50 safe-top safe-x">
        <div className="mx-auto flex max-w-3xl items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[calc(28px*var(--fs))] font-semibold leading-tight">{title}</h1>
            {sub && <p className="mt-1 text-[calc(13.5px*var(--fs))] text-sand-200/85">{sub}</p>}
          </div>
          {right}
        </div>
      </div>
      <div className="scroll-y relative -mt-3 flex-1 rounded-t-[26px] bg-sand-50 px-4 pb-[120px] pt-4 safe-x">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------ Explore ------------------------------ */
/** Entry points to the guide, planner, stories, Then & Now, challenges and the travel story. */
function ExploreHub() {
  const lang = useGame((s) => s.lang)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const open = (panel: 'guide' | 'plan' | 'stories' | 'thenNow' | 'challenges' | 'journey') => useGame.getState().setUi({ panel })
  const tiles: [typeof open extends (p: infer P) => void ? P : never, string, string, string][] = [
    ['guide', '🧭', L('المرشد السياحي', 'Tourism guide'), L('اسأل عن المعالم', 'Ask about landmarks')],
    ['plan', '🗺️', L('خطّط زيارتك', 'Plan your visit'), L('قصيرة · نصف يوم · يوم', 'Short · half · full day')],
    ['stories', '📖', L('قصص تفاعلية', 'Interactive stories'), L('أدلة وأسئلة', 'Clues & questions')],
    ['thenNow', '🕰️', L('الماضي والحاضر', 'Then & Now'), L('تواريخ موثّقة', 'Documented eras')],
    ['challenges', '🗓️', L('التحديات', 'Challenges'), L('موسمية ومجموعات', 'Seasonal & themed')],
    ['journey', '🎞️', L('قصة رحلتي', 'My travel story'), L('صورك وتواريخك', 'Your photos & dates')],
  ]
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      {tiles.map(([k, icon, title, sub]) => (
        <button key={k} onClick={() => open(k)} className="btn-press flex min-h-[86px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-pine-800 px-1.5 py-2 text-center text-sand-50 shadow-sm ring-1 ring-pine-900/20">
          <span className="text-[22px]" aria-hidden="true">{icon}</span>
          <span className="text-[calc(12.5px*var(--fs))] font-semibold leading-tight">{title}</span>
          <span className="text-[calc(10px*var(--fs))] leading-tight text-sand-100/75">{sub}</span>
        </button>
      ))}
    </div>
  )
}

export function ExploreScreen() {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const progress = useGame((s) => s.progress)
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const s = useGame.getState
  const locate = async () => {
    setLocating(true)
    const r = await getPosition(8000)
    setLocating(false)
    if (r.ok) setPos(r)
    else s().toast({ kind: 'info', icon: '📍', title: t('gpsDenied') })
  }
  return (
    <Screen title={t('exploreTitle')} sub={t('exploreSub')} right={
      <button onClick={locate} className="btn-press flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-2 text-[calc(12.5px*var(--fs))] font-semibold">
        <Icon name="gps" size={15} /> {locating ? t('gpsLocating') : lang === 'ar' ? 'المسافات' : 'Distances'}
      </button>
    }>
      <ExploreHub />
      <PlacesDirectory pos={pos} />
      <div className="mt-4 space-y-3">
        <div className="rounded-[24px] bg-pine-800 p-4 text-sand-50">
          <div className="font-display text-[calc(18px*var(--fs))] font-semibold">{t('howToPlay')}</div>
          <ol className="mt-2 space-y-1.5 text-[calc(13.5px*var(--fs))] leading-relaxed text-sand-100/90">
            <li>١. {t('onboard1')}</li>
            <li>٢. {t('onboard2')}</li>
            <li>٣. {t('onboard3')}</li>
            <li>٤. {lang === 'ar' ? 'أضف صورك وملاحظاتك، ثم شاهد «أعد عيش رحلتي».' : 'Add photos and notes, then watch “Relive my journey”.'}</li>
          </ol>
        </div>
      </div>
    </Screen>
  )
}

/* ------------------------------ Passport ------------------------------ */
export function PassportScreen() {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const name = useGame((s) => s.profileName)
  const progress = useGame((s) => s.progress)
  const achievements = useGame((s) => s.achievements)
  const points = usePoints()
  const lvl = levelFor(points)
  const unlocked = LANDMARK_IDS.filter((id) => progress[id]?.unlocked).length
  const nextMin = lvl.next?.min ?? lvl.min
  const lvlProgress = lvl.next ? (points - lvl.min) / (nextMin - lvl.min) : 1
  const passTab = useGame((s) => s.passTab)
  if (passTab === 'friends') return (
    <Screen title={t('passportTitle')} sub={lang === 'ar' ? 'شارك مدينتك وزر مدن أصدقائك' : 'Share your city and visit friends’'}>
      <Segments value={passTab} onChange={(v) => useGame.getState().setUi({ passTab: v })} options={[['passport', lang === 'ar' ? 'جوازي' : 'My passport'], ['friends', lang === 'ar' ? 'الأصدقاء والمشاركة' : 'Friends & sharing']]} />
      <FriendsSection />
    </Screen>
  )
  return (
    <Screen title={t('passportTitle')} sub={lang === 'ar' ? 'أختام زياراتك وشاراتك' : 'Your visit stamps and badges'}>
      <Segments value={passTab} onChange={(v) => useGame.getState().setUi({ passTab: v })} options={[['passport', lang === 'ar' ? 'جوازي' : 'My passport'], ['friends', lang === 'ar' ? 'الأصدقاء والمشاركة' : 'Friends & sharing']]} />
      {/* cover */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-pine-700 via-pine-800 to-pine-950 p-5 text-sand-50 shadow-xl">
        <div className="pattern-geo absolute inset-0 opacity-80" />
        <div className="relative flex items-start gap-4">
          <ProgressRing value={lvlProgress} size={74} stroke={6}>
            <span className="font-display text-[calc(22px*var(--fs))] font-bold text-gold-300">{num(lvl.index + 1, lang)}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-[calc(11.5px*var(--fs))] uppercase tracking-wider text-gold-300">{t('passportHolder')}</div>
            <input
              value={name}
              onChange={(e) => useGame.getState().setName(e.target.value)}
              placeholder={t('editName')}
              className="w-full border-b border-white/20 bg-transparent py-1 font-display text-[calc(22px*var(--fs))] font-semibold text-sand-50 outline-none placeholder:text-sand-200/40"
            />
            <div className="mt-1.5 text-[calc(13px*var(--fs))]"><span className="text-sand-200/80">{t('level')}: </span><span className="font-semibold text-gold-300">{lvl.title[lang]}</span></div>
            <div className="text-[calc(12px*var(--fs))] text-sand-200/75">{num(points, lang)} {t('points')}{lvl.next ? ` · ${num(nextMin - points, lang)} → ${lvl.next.title[lang]}` : ''}</div>
          </div>
        </div>
        <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[calc(12px*var(--fs))] text-sand-200/80">
          <span>{t('appName')} · {lang === 'ar' ? 'المدينة المنورة' : 'Al Madinah'}</span>
          <span>{num(unlocked, lang)}/{num(LANDMARK_IDS.length, lang)} {t('stamps')}</span>
        </div>
      </div>

      {/* stamps */}
      <h2 className="mb-2 mt-5 font-display text-[calc(19px*var(--fs))] font-semibold text-pine-900">{t('stamps')}</h2>
      <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-[#f6eedb] p-3 ring-1 ring-sand-300">
        {LANDMARKS.map((l, i) => {
          const p = progress[l.id]
          const rot = [-8, 6, -4, 9][i]
          return (
            <div key={l.id} className="grid aspect-square place-items-center rounded-2xl border border-dashed border-sand-400/70 bg-sand-50/60 p-2">
              {p?.unlocked ? (
                <div className="anim-stamp grid place-items-center text-center" style={{ transform: `rotate(${rot}deg)`, ['--r' as string]: `${rot}deg` }}>
                  <div className="grid h-[104px] w-[104px] place-items-center rounded-full border-[3px] border-double border-pine-700 text-pine-700" style={{ boxShadow: 'inset 0 0 0 4px rgba(20,83,63,.15)' }}>
                    <div>
                      <LandmarkEmblem id={l.id} size={38} tone="dark" className="mx-auto" />
                      <div className="mt-0.5 text-[calc(11px*var(--fs))] font-bold leading-tight">{l.name[lang]}</div>
                      <div className="text-[calc(9.5px*var(--fs))] opacity-80">{fmtDate(p.visitDate, lang)}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-[calc(9.5px*var(--fs))] font-semibold text-ink-500">{p.method === 'qr' ? 'QR' : p.method === 'gps' ? 'GPS' : t('demo')}</div>
                </div>
              ) : (
                <div className="text-center text-ink-500/70">
                  <LandmarkEmblem id={l.id} size={40} tone="dark" className="mx-auto opacity-25" />
                  <div className="mt-1 text-[calc(11.5px*var(--fs))] font-semibold">{l.name[lang]}</div>
                  <div className="text-[calc(10.5px*var(--fs))]">{t('notStamped')}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* badges */}
      <h2 className="mb-2 mt-5 font-display text-[calc(19px*var(--fs))] font-semibold text-pine-900">{t('badges')}</h2>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {ACHIEVEMENTS.map((a) => {
          const got = !!achievements[a.id]
          return (
            <div key={a.id} className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center ${got ? 'bg-white shadow-sm ring-1 ring-gold-400/40' : 'bg-ink-900/4 opacity-55'}`}>
              <div className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${got ? 'bg-gradient-to-b from-gold-300 to-gold-500' : 'bg-ink-900/10 grayscale'}`}>{a.icon}</div>
              <div className="text-[calc(10.5px*var(--fs))] font-semibold leading-tight">{a.title[lang]}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 text-center text-[calc(11.5px*var(--fs))] text-ink-500">{LEVELS.map((l) => l.title[lang]).join(' ← ')}</div>
    </Screen>
  )
}

/* ------------------------------ Memories ------------------------------ */
export function MemoriesScreen() {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const memories = useGame((s) => s.memories)
  const progress = useGame((s) => s.progress)
  const [filter, setFilter] = useState<LandmarkId | 'all'>('all')
  const list = [...memories].filter((m) => filter === 'all' || m.landmarkId === filter).sort((a, b) => b.date.localeCompare(a.date))
  const anyUnlocked = LANDMARK_IDS.some((id) => progress[id]?.unlocked)
  return (
    <Screen title={t('memoriesTitle')} sub={t('privateNote')} right={
      anyUnlocked ? <button onClick={() => useGame.getState().setUi({ composer: { landmarkId: filter === 'all' ? null : filter } })} className="btn-press grid h-11 w-11 place-items-center rounded-2xl bg-gold-400 text-pine-950"><Icon name="camera" size={20} /></button> : undefined
    }>
      <div className="scroll-x -mx-4 mb-3 flex gap-1.5 px-4">
        {(['all', ...LANDMARK_IDS] as const).map((id) => (
          <button key={id} onClick={() => setFilter(id)} className={`btn-press shrink-0 rounded-full px-3.5 py-2 text-[calc(13px*var(--fs))] font-semibold ${filter === id ? 'bg-pine-800 text-sand-50' : 'bg-white text-ink-700 ring-1 ring-ink-900/5'}`}>
            {id === 'all' ? t('all') : LANDMARK_MAP[id].name[lang]}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {list.map((m) => (
            <div key={m.id} className="break-inside-avoid overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-ink-900/5">
              {(m.photoKey || m.samplePhoto) && <Thumb m={m} className="aspect-[4/3] w-full rounded-none" />}
              <button onClick={() => useGame.getState().setUi({ memoryView: m.id })} className="block w-full p-3 text-start">
                <div className="text-[calc(11.5px*var(--fs))] font-semibold text-gold-600">{LANDMARK_MAP[m.landmarkId].name[lang]}</div>
                {m.note && <div className="mt-0.5 line-clamp-4 text-[calc(13.5px*var(--fs))] leading-relaxed text-ink-900">{m.note}</div>}
                <div className="mt-1 text-[calc(11px*var(--fs))] text-ink-500">{fmtDate(m.date, lang)}{m.sample ? ` · ${t('sample')}` : ''}</div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center">
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-pine-800/8 text-pine-800"><Icon name="image" size={34} /></div>
          <p className="mx-auto max-w-xs text-[calc(14px*var(--fs))] text-ink-500">{t('memoriesEmpty')}</p>
          {anyUnlocked && <Btn tone="primary" className="mt-4" onClick={() => useGame.getState().setUi({ composer: { landmarkId: null } })}><Icon name="camera" size={18} /> {t('addMemory')}</Btn>}
        </div>
      )}
    </Screen>
  )
}

/* ------------------------------ Achievements ------------------------------ */
export function AchievementsScreen() {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const state = useGame((s) => s)
  const points = usePoints()
  const total = ACHIEVEMENTS.length
  const got = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length
  const quizCorrect = Object.values(state.quiz).filter(Boolean).length
  const achTab = useGame((s) => s.achTab)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  return (
    <Screen title={t('achTitle')} sub={`${num(got, lang)}/${num(total, lang)}${lang === 'ar' ? '، ' : ' · '}${num(points, lang)} ${t('points')}`} right={
      <ProgressRing value={got / total} size={56} stroke={5}><span className="text-[calc(12px*var(--fs))] font-bold text-sand-50">{pct((got / total) * 100, lang)}</span></ProgressRing>
    }>
      <Segments value={achTab} onChange={(v) => useGame.getState().setUi({ achTab: v })} options={[['stats', L('إحصائياتي', 'My stats')], ['achievements', L('الإنجازات', 'Achievements')], ['collection', L('مقتنياتي', 'Collection')], ['challenges', L('التحديات', 'Challenges')]]} />
      {achTab === 'stats' && <StatsDashboard />}
      {achTab === 'challenges' && <div className="rounded-[24px] bg-sand-50 p-3 text-ink-900"><ChallengeList /></div>}
      {achTab === 'collection' && <CollectionGrid />}
      {achTab === 'achievements' && (<>
      <h2 className="mb-2 font-display text-[calc(19px*var(--fs))] font-semibold text-pine-900">{t('challenges')}</h2>
      <div className="space-y-2">
        {ACHIEVEMENTS.map((a) => {
          const [v, max] = a.progress(state)
          const done = !!state.achievements[a.id]
          return (
            <div key={a.id} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${done ? 'bg-white ring-gold-400/40' : 'bg-white/70 ring-ink-900/5'}`}>
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${done ? 'bg-gradient-to-b from-gold-300 to-gold-500' : 'bg-ink-900/6 grayscale'}`}>{a.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[calc(14.5px*var(--fs))] font-semibold">{a.title[lang]}</div>
                  <span className="shrink-0 text-[calc(11.5px*var(--fs))] font-bold text-gold-600">+{num(a.points, lang)}</span>
                </div>
                <div className="text-[calc(12.5px*var(--fs))] text-ink-500">{a.desc[lang]}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-900/8">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${(Math.min(v, max) / max) * 100}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="mb-1 mt-6 font-display text-[calc(19px*var(--fs))] font-semibold text-pine-900">{t('decorations')}</h2>
      <p className="mb-2 text-[calc(12.5px*var(--fs))] text-ink-500">{t('decorationsHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {DECORATIONS.map((d) => {
          const un = d.isUnlocked(state, points)
          return (
            <div key={d.id} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${un ? 'bg-white ring-pine-700/15' : 'bg-white/60 ring-ink-900/5'}`}>
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${un ? 'bg-pine-800/8' : 'bg-ink-900/5 grayscale opacity-60'}`}>{d.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[calc(14px*var(--fs))] font-semibold">{d.title[lang]}</div>
                <div className="text-[calc(12px*var(--fs))] text-ink-500">{un ? d.desc[lang] : `🔒 ${d.requirement[lang]}`}</div>
              </div>
              {un && <Toggle on={!!state.decorations[d.id]} onChange={() => useGame.getState().toggleDecoration(d.id)} />}
            </div>
          )
        })}
      </div>

      <h2 className="mb-2 mt-6 font-display text-[calc(19px*var(--fs))] font-semibold text-pine-900">{t('quizzes')}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {LANDMARKS.map((l) => {
          const c = l.quiz.filter((q) => state.quiz[q.id]).length
          const a = l.quiz.filter((q) => q.id in state.quiz).length
          const un = state.progress[l.id]?.unlocked
          return (
            <button key={l.id} disabled={!un || a === l.quiz.length} onClick={() => useGame.getState().setUi({ quizFor: l.id })} className="btn-press flex items-center gap-3 rounded-2xl bg-white p-3 text-start ring-1 ring-ink-900/5 disabled:opacity-60">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine-800"><LandmarkEmblem id={l.id} size={30} tone="gold" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[calc(14px*var(--fs))] font-semibold">{l.name[lang]}</div>
                <div className="text-[calc(12px*var(--fs))] text-ink-500">{un ? `${num(c, lang)}/${num(l.quiz.length, lang)} ${t('correct')}` : t('quizLocked')}</div>
              </div>
              {un && a < l.quiz.length && <Icon name={lang === 'ar' ? 'back' : 'chevron'} size={18} className="text-ink-500" />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[calc(12px*var(--fs))] text-ink-500">{num(quizCorrect, lang)}/{num(ALL_QUIZ.length, lang)} {t('correct')}</p>
      </>)}
    </Screen>
  )
}

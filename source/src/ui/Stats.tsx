import { useMemo } from 'react'
import { useGame, usePoints, useCompletion } from '../state/gameStore'
import { LANDMARKS, LANDMARK_IDS, LANDMARK_MAP, ALL_QUIZ } from '../data/landmarks'
import { ACHIEVEMENTS, ACH_MAP, INFO_TOTAL, allHidden, landmarkProgress, levelFor } from '../data/progression'
import { COLLECTIBLES, COLLECTIBLE_MAP } from '../data/collectibles'
import type { Bi } from '../data/types'
import { fmtDate, num, pctText } from '../lib/format'
import { Icon, type IconName } from './components/Icon'
import { ProgressRing } from './components/Sheet'
import { LandmarkEmblem } from './components/LandmarkEmblem'

function dur(sec: number, lang: 'ar' | 'en') {
  const m = Math.round(sec / 60)
  if (m < 60) return lang === 'ar' ? `${num(m, lang)} د` : `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return lang === 'ar' ? `${num(h, lang)} س ${num(r, lang)} د` : `${h}h ${r}m`
}

interface Ev { at: string; icon: string; title: Bi; sub?: Bi; kind: 'visit' | 'memory' | 'achievement' | 'collect' | 'start' }

export function StatsDashboard() {
  const s = useGame((x) => x)
  const lang = s.lang
  const points = usePoints()
  const completion = useCompletion()
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const visited = LANDMARK_IDS.filter((id) => s.progress[id]?.unlocked).length
  const artifacts = allHidden(s)
  const memories = s.memories.filter((m) => !m.sample).length
  const info = Object.keys(s.discoveries).filter((k) => k.startsWith('info:')).length
  const infoTotal = Object.values(INFO_TOTAL).reduce((a, b) => a + b, 0)
  const answered = Object.keys(s.quiz).length
  const correct = Object.values(s.quiz).filter(Boolean).length
  const inside = Object.values(s.insideSeconds).reduce((a, b) => a + b, 0)
  const badges = ACHIEVEMENTS.filter((a) => s.achievements[a.id])
  const lvl = levelFor(points)

  const timeline = useMemo<Ev[]>(() => {
    const ev: Ev[] = [{ at: s.createdAt, icon: '🧭', title: { ar: 'بداية الرحلة', en: 'Journey began' }, kind: 'start' }]
    for (const id of LANDMARK_IDS) {
      const p = s.progress[id]
      if (p?.unlocked && p.visitDate) ev.push({ at: p.visitDate, icon: '🏗️', title: { ar: `زيارة ${LANDMARK_MAP[id].name.ar}`, en: `Visited ${LANDMARK_MAP[id].name.en}` }, sub: { ar: 'أُضيف إلى مدينتك', en: 'Added to your city' }, kind: 'visit' })
    }
    for (const m of s.memories) ev.push({ at: m.date ? `${m.date}T12:00:00` : m.createdAt, icon: '📷', title: { ar: `ذكرى في ${LANDMARK_MAP[m.landmarkId].name.ar}`, en: `Memory at ${LANDMARK_MAP[m.landmarkId].name.en}` }, sub: m.note ? { ar: m.note, en: m.note } : undefined, kind: 'memory' })
    for (const [k, at] of Object.entries(s.achievements)) {
      const a = ACH_MAP[k]
      if (a) ev.push({ at, icon: a.icon, title: { ar: `إنجاز: ${a.title.ar}`, en: `Achievement: ${a.title.en}` }, kind: 'achievement' })
    }
    for (const [k, at] of Object.entries(s.discoveries)) {
      if (typeof at !== 'string' || !k.startsWith('hidden:')) continue
      const [, scene, id] = k.split(':')
      const c = COLLECTIBLE_MAP[`${scene}:${id}`]
      if (c) ev.push({ at, icon: c.icon, title: { ar: `مقتنى: ${c.name.ar}`, en: `Collected: ${c.name.en}` }, kind: 'collect' })
    }
    return ev.filter((e) => !isNaN(new Date(e.at).getTime())).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [s.createdAt, s.progress, s.memories, s.achievements, s.discoveries])

  const Card = ({ icon, label, value, sub }: { icon: IconName | string; label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/5">
      <div className="flex items-center gap-1.5 text-[calc(11.5px*var(--fs))] font-semibold text-ink-500">
        {icon.length <= 2 ? <span>{icon}</span> : <Icon name={icon as IconName} size={14} />} {label}
      </div>
      <div className="mt-1 font-display text-[calc(22px*var(--fs))] font-bold text-pine-900">{value}</div>
      {sub && <div className="text-[calc(11px*var(--fs))] text-ink-500">{sub}</div>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-[24px] bg-gradient-to-br from-pine-800 to-pine-950 p-4 text-sand-50">
        <ProgressRing value={completion / 100} size={86} stroke={7}>
          <div className="text-center"><div className="font-display text-[calc(22px*var(--fs))] font-bold text-gold-300">{pctText(completion, lang)}</div></div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="text-[calc(12px*var(--fs))] text-gold-300">{L('اكتمال مدينتي', 'My city built')}</div>
          <div className="font-display text-[calc(19px*var(--fs))] font-semibold">{lvl.title[lang]}<span className="mx-1.5 opacity-40">|</span>{num(points, lang)} {L('نقطة', 'pts')}</div>
          <div className="mt-1 text-[calc(11.5px*var(--fs))] leading-snug text-sand-200/80">{L('يُحسب من زيارة المعالم واكتشاف معلوماتها ومقتنياتها والإجابة عن اختباراتها', 'Based on visiting landmarks and finding their info, collectibles and quiz answers')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card icon="city" label={L('المعالم المزارة', 'Landmarks visited')} value={`${num(visited, lang)}/${num(LANDMARK_IDS.length, lang)}`} />
        <Card icon="clock" label={L('وقت الاستكشاف', 'Exploration time')} value={dur(s.playSeconds, lang)} sub={`${L('داخل المعالم', 'Inside landmarks')}: ${dur(inside, lang)}`} />
        <Card icon="🗝️" label={L('مقتنيات تاريخية', 'Artifacts found')} value={`${num(artifacts, lang)}/${num(COLLECTIBLES.length, lang)}`} />
        <Card icon="image" label={L('الذكريات', 'Memories saved')} value={num(memories, lang)} />
        <Card icon="💡" label={L('بطاقات معلومات', 'Info cards')} value={`${num(info, lang)}/${num(infoTotal, lang)}`} />
        <Card icon="📜" label={L('دقة الاختبارات', 'Quiz accuracy')} value={answered ? `${pctText(Math.round((correct / answered) * 100), lang)}` : '—'} sub={`${num(correct, lang)}/${num(ALL_QUIZ.length, lang)}`} />
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/5">
        <div className="mb-2 text-[calc(13px*var(--fs))] font-semibold text-ink-700">{L('تقدّم كل معلم', 'Per-landmark progress')}</div>
        <div className="space-y-2">
          {LANDMARKS.map((l) => {
            const v = landmarkProgress(s, l.id)
            return (
              <div key={l.id} className="flex items-center gap-2.5">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${v ? 'bg-pine-800' : 'bg-ink-900/8'}`}><LandmarkEmblem id={l.id} size={26} tone={v ? 'gold' : 'dark'} className={v ? '' : 'opacity-40'} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[calc(12.5px*var(--fs))]"><span className="font-semibold">{l.name[lang]}</span><span className="text-ink-500">{pctText(v, lang)}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-900/8"><div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${v}%` }} /></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 font-display text-[calc(17px*var(--fs))] font-semibold text-pine-900">{L('الشارات', 'Badges')} <span className="text-[calc(14px*var(--fs))] text-ink-500">({num(badges.length, lang)}/{num(ACHIEVEMENTS.length, lang)})</span></div>
        <div className="scroll-x -mx-4 flex gap-2 px-4">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={`flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl p-2 text-center ${s.achievements[a.id] ? 'bg-white ring-1 ring-gold-400/40' : 'bg-ink-900/4 opacity-50'}`}>
              <div className={`grid h-11 w-11 place-items-center rounded-full text-xl ${s.achievements[a.id] ? 'bg-gradient-to-b from-gold-300 to-gold-500' : 'bg-ink-900/10 grayscale'}`}>{a.icon}</div>
              <div className="text-[calc(10px*var(--fs))] font-semibold leading-tight">{a.title[lang]}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 font-display text-[calc(17px*var(--fs))] font-semibold text-pine-900">{L('خط رحلتي الزمني', 'My journey timeline')}</div>
        <ol className="relative space-y-3 ps-6">
          <span className="absolute bottom-2 start-[9px] top-2 w-0.5 rounded-full bg-gold-400/40" />
          {timeline.map((e, i) => (
            <li key={i} className="relative">
              <span className={`absolute -start-6 top-1 grid h-5 w-5 place-items-center rounded-full text-[calc(11px*var(--fs))] ${e.kind === 'visit' ? 'bg-pine-700' : e.kind === 'collect' ? 'bg-gold-400' : 'bg-white ring-1 ring-ink-900/10'}`}>{e.kind === 'visit' ? '✓' : ''}</span>
              <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-ink-900/5">
                <div className="flex items-center gap-2 text-[calc(13.5px*var(--fs))] font-semibold"><span>{e.icon}</span><span className="min-w-0 flex-1 truncate">{e.title[lang]}</span></div>
                {e.sub && <div className="line-clamp-2 text-[calc(12px*var(--fs))] text-ink-500">{e.sub[lang]}</div>}
                <div className="text-[calc(11px*var(--fs))] text-ink-500">{fmtDate(e.at, lang)}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

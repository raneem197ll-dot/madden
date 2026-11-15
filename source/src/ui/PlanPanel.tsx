import { useMemo } from 'react'
import { useGame } from '../state/gameStore'
import { Modal, Btn, Toggle } from './components/Sheet'
import { ChoiceChip, KindBadge, NeedsNet } from './components/Bits'
import { LANDMARKS } from '../data/landmarks'
import { SPOT_MAP } from '../data/places'
import type { PlanBudget, PlanPrefs } from '../data/types'
import { DEFAULT_PLAN, ITINERARY, buildPlan, clockText } from '../lib/planner'
import { fmtDistance, num } from '../lib/format'

const dur = (m: number, ar: boolean) => {
  const h = Math.floor(m / 60), r = Math.round(m % 60)
  if (ar) return h ? `${num(h, 'ar')} س ${r ? `${num(r, 'ar')} د` : ''}` : `${num(r, 'ar')} د`
  return h ? `${h} h ${r ? `${r} min` : ''}` : `${r} min`
}

/** Smart itinerary: time budget + interests + travel mode → an ordered, practical route. */
export function PlanPanel() {
  const open = useGame((s) => s.panel === 'plan')
  const lang = useGame((s) => s.lang)
  const saved = useGame((s) => s.plan)
  const progress = useGame((s) => s.progress)
  const planOrder = useGame((s) => s.planOrder)
  const g = useGame.getState
  const ar = lang === 'ar'
  const L = (a: string, e: string) => (ar ? a : e)
  const p: PlanPrefs = saved ?? DEFAULT_PLAN
  const set = (patch: Partial<PlanPrefs>) => g().setPlan({ ...p, ...patch })
  const visited = useMemo(() => Object.fromEntries(LANDMARKS.map((l) => [l.id, !!progress[l.id]?.unlocked])), [progress])
  const plan = useMemo(() => buildPlan(p, visited), [p, visited])
  const used = Math.min(100, Math.round((plan.totalMin / plan.budgetMin) * 100))
  const onMap = planOrder && planOrder.join() === plan.stops.map((s) => s.id).join()

  const showOnMap = () => {
    g().setPlan(p, plan.stops.map((s) => s.id))
    g().setPrefs({ showRoutes: true })
    g().setUi({ panel: null, tab: 'city', selected: null, sheetOpen: false })
    g().camTo('home')
  }
  const toggleInterest = (k: string) => set({ interests: p.interests.includes(k) ? p.interests.filter((x) => x !== k) : [...p.interests, k] })

  return (
    <Modal open={open} onClose={() => g().setUi({ panel: null })} title={L('خطّط زيارتك', 'Plan your visit')} wide>
      <div className="space-y-4 text-ink-900">
        <section aria-label={L('الوقت المتاح', 'Available time')}>
          <h3 className="mb-1.5 text-[calc(13px*var(--fs))] font-bold text-pine-900">{L('كم لديك من الوقت؟', 'How much time do you have?')}</h3>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ITINERARY.budgets) as PlanBudget[]).map((b) => (
              <button key={b} aria-pressed={p.budget === b} onClick={() => set({ budget: b })} className={`btn-press rounded-2xl px-2 py-2.5 text-center ${p.budget === b ? 'bg-pine-800 text-sand-50' : 'bg-white ring-1 ring-ink-900/10'}`}>
                <div className="text-[calc(13.5px*var(--fs))] font-bold">{ITINERARY.budgets[b].label[lang]}</div>
                <div className={`text-[calc(11px*var(--fs))] ${p.budget === b ? 'text-sand-100/80' : 'text-ink-500'}`}>{ITINERARY.budgets[b].hint[lang]}</div>
              </button>
            ))}
          </div>
        </section>

        <section aria-label={L('اهتماماتك', 'Your interests')}>
          <h3 className="mb-1.5 text-[calc(13px*var(--fs))] font-bold text-pine-900">{L('ما الذي يهمّك؟ (اختياري)', 'What interests you? (optional)')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ITINERARY.interests).map(([k, v]) => <ChoiceChip key={k} on={p.interests.includes(k)} onClick={() => toggleInterest(k)}>{v[lang]}</ChoiceChip>)}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white p-2.5 ring-1 ring-ink-900/5">
            <div className="mb-1 text-[calc(11.5px*var(--fs))] font-semibold text-ink-500">{L('التنقّل', 'Getting around')}</div>
            <div className="flex gap-1.5">
              {(['car', 'walk'] as const).map((m) => <ChoiceChip key={m} on={p.mode === m} onClick={() => set({ mode: m })}>{m === 'car' ? '🚕' : '🚶'} {ITINERARY.modes[m].label[lang]}</ChoiceChip>)}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-2.5 ring-1 ring-ink-900/5">
            <label className="mb-1 block text-[calc(11.5px*var(--fs))] font-semibold text-ink-500" htmlFor="plan-start">{L('الانطلاق', 'Start')}</label>
            <div className="flex gap-1.5">
              <select id="plan-start" value={p.start} onChange={(e) => set({ start: e.target.value })} className="min-w-0 flex-1 rounded-xl bg-sand-100 px-2 py-1.5 text-[calc(12.5px*var(--fs))]">
                {ITINERARY.starts.map((s) => <option key={s.id} value={s.id}>{s.name[lang]}</option>)}
                {LANDMARKS.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}
              </select>
              <select aria-label={L('وقت البدء', 'Start time')} value={p.startHour} onChange={(e) => set({ startHour: Number(e.target.value) })} className="rounded-xl bg-sand-100 px-2 py-1.5 text-[calc(12.5px*var(--fs))]">
                {Array.from({ length: 15 }, (_, i) => i + 6).map((h) => <option key={h} value={h}>{clockText(h * 60, lang)}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="divide-y divide-ink-900/6 rounded-2xl bg-white px-3 ring-1 ring-ink-900/5">
          <div className="flex items-center justify-between gap-3 py-2">
            <div><div className="text-[calc(13px*var(--fs))] font-semibold">{L('زيارة بلا درج', 'Step-free visit')}</div><div className="text-[calc(11px*var(--fs))] text-ink-500">{L('يتجاوز صعود جبل الرماة ويُبرز ملاحظات الوصول', "Skips the Archers' Hill climb and highlights access notes")}</div></div>
            <Toggle label={L('زيارة بلا درج', 'Step-free visit')} on={p.accessible} onChange={(v) => set({ accessible: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="text-[calc(13px*var(--fs))] font-semibold">{L('تخطَّ ما زرته من قبل', "Skip places I've visited")}</div>
            <Toggle label={L('تخطَّ ما زرته', "Skip visited")} on={p.skipVisited} onChange={(v) => set({ skipVisited: v })} />
          </div>
        </section>

        {/* result */}
        <section className="rounded-[22px] bg-pine-900 p-3.5 text-sand-50" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display text-[calc(16px*var(--fs))] font-semibold">{L('مسارك المقترح', 'Your suggested route')}</div>
            <div className="flex gap-1"><KindBadge kind="suggestion" onDark /><KindBadge kind="estimate" onDark /></div>
          </div>
          {plan.stops.length === 0 ? (
            <p className="mt-2 text-[calc(13px*var(--fs))] text-sand-100/85">{L('لا يتسع الوقت المختار لأي محطة بهذه الإعدادات. جرّب وقتًا أطول أو وسيلة أخرى.', 'No stop fits this time with these settings. Try more time or another way of getting around.')}</p>
          ) : (
            <>
              <div className="mt-2 text-[calc(12px*var(--fs))] text-sand-100/80">
                {L(`${num(plan.stops.length, lang)} محطات، نحو ${dur(plan.totalMin, true)} من ${dur(plan.budgetMin, true)}`, `${plan.stops.length} stops · about ${dur(plan.totalMin, false)} of ${dur(plan.budgetMin, false)}`)}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gold-400" style={{ width: `${used}%` }} /></div>
              <ol className="mt-3 space-y-2">
                <li className="flex items-center gap-2 text-[calc(12px*var(--fs))] text-sand-100/80"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">📍</span>{plan.start.name[lang]}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{clockText(p.startHour * 60, lang)}</li>
                {plan.stops.map((s, i) => {
                  const lm = SPOT_MAP[s.id]
                  const info = ITINERARY.places[s.id]
                  return (
                    <li key={s.id} className="rounded-2xl bg-white/8 p-2.5">
                      <div className="text-[calc(11px*var(--fs))] text-sand-100/70">{s.leg.mode === 'car' ? '🚕' : '🚶'} {fmtDistance(s.leg.km * 1000, lang)}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{dur(s.leg.minutes, ar)}{s.leg.switched ? L(' (أجرة — المسافة طويلة للمشي)', ' (taxi — too far to walk)') : ''}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold-400 text-[calc(13px*var(--fs))] font-bold text-pine-950">{num(i + 1, lang)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[calc(14.5px*var(--fs))] font-semibold">{lm.name[lang]}</div>
                          <div className="text-[calc(11.5px*var(--fs))] text-sand-100/75">{clockText(s.arrive, lang)} – {clockText(s.leave, lang)}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{L('زيارة', 'visit')} {dur(s.visit, ar)}</div>
                        </div>
                      </div>
                      {s.why.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{s.why.map((w) => <span key={w} className="rounded-full bg-white/12 px-2 py-0.5 text-[calc(10.5px*var(--fs))]">{ITINERARY.interests[w][lang]}</span>)}</div>}
                      <div className="mt-1.5 space-y-0.5 text-[calc(11.5px*var(--fs))] text-sand-100/85">
                        <div>🕒 {info.bestTime[lang]}</div>
                        <div className={p.accessible ? 'font-semibold text-gold-300' : ''}>♿ {info.access[lang]}</div>
                        {info.status && <div className="text-gold-300">⚠️ {info.status.text[lang]} <a href={info.status.source.url} target="_blank" rel="noopener noreferrer" className="underline" dir="ltr">{info.status.source.title}</a></div>}
                      </div>
                      {i === plan.breakAfter && plan.breakMin > 0 && <div className="mt-2 rounded-xl bg-white/10 px-2 py-1 text-[calc(11.5px*var(--fs))]">☕ {L('استراحة وغداء — ساعة', 'Rest & lunch — 1 hour')}</div>}
                    </li>
                  )
                })}
              </ol>
              {plan.left.length > 0 && <div className="mt-2 text-[calc(11.5px*var(--fs))] text-sand-100/70">{L('لم يتسع الوقت لـ: ', "Didn't fit: ")}{plan.left.slice(0, 8).map((id) => SPOT_MAP[id].name[lang]).join(L('، ', ', '))}</div>}
              {plan.notes.length > 0 && <ul className="mt-2 space-y-1">{plan.notes.map((n, i) => <li key={i} className="rounded-xl bg-gold-400/15 px-2.5 py-1.5 text-[calc(11.5px*var(--fs))] text-gold-300">{n[lang]}</li>)}</ul>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Btn tone="gold" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={showOnMap}>🗺️ {onMap ? L('معروض على خريطتي', 'On my map') : L('اعرضه على خريطتي', 'Show on my map')}</Btn>
                <a href={plan.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-press flex flex-col items-center justify-center rounded-2xl bg-white/12 px-2 py-2 text-center text-[calc(12.5px*var(--fs))] font-semibold">
                  <span>🧭 {L('الاتجاهات في خرائط Google', 'Directions in Google Maps')}</span>
                  <NeedsNet />
                </a>
              </div>
            </>
          )}
        </section>

        <ul className="space-y-1 text-[calc(11.5px*var(--fs))] leading-relaxed text-ink-500">
          {ITINERARY.general.map((n, i) => <li key={i}>• {n[lang]}</li>)}
        </ul>
      </div>
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGame } from '../state/gameStore'
import { CATEGORY_LABEL, LANDMARK_MAP } from '../data/landmarks'
import { PLACE_MAP, SPOTS, isLandmarkId, type Spot } from '../data/places'
import type { Lang, PlaceCategory } from '../data/types'
import { ITINERARY } from '../lib/planner'
import { haversine, kmFromHaram } from '../lib/geo'
import { fmtDistance, num } from '../lib/format'
import { Icon } from './components/Icon'
import { Btn, Pill } from './components/Sheet'
import { ChoiceChip, KindBadge } from './components/Bits'
import { SourceList } from './Collection'
import { LandmarkEmblem } from './components/LandmarkEmblem'

const CATS = Object.keys(CATEGORY_LABEL) as PlaceCategory[]

/** Google Maps search link for a coordinate (opens the user's maps app). */
export const mapsSearchUrl = (c: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${c.lat.toFixed(5)},${c.lng.toFixed(5)}`

/** Lower-case, Arabic-normalised text for search. */
const fold = (s: string) => s.toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ٰٟـ]/g, '')

function spotKeywords(s: Spot) {
  return isLandmarkId(s.id) ? LANDMARK_MAP[s.id].keywords : PLACE_MAP[s.id].keywords
}

/* ---------------- the directory (Explore screen) ---------------- */
export function PlacesDirectory({ pos }: { pos: { lat: number; lng: number } | null }) {
  const lang = useGame((s) => s.lang)
  const visited = useGame(useShallow((s) => Object.fromEntries(Object.entries(s.progress).map(([k, v]) => [k, !!v?.unlocked]))))
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<PlaceCategory | 'all'>('all')
  const [sort, setSort] = useState<'top' | 'near' | 'az'>('top')
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c, SPOTS.filter((s) => s.category === c).length])), [])
  const list = useMemo(() => {
    const needle = fold(q.trim())
    const from = pos ?? { lat: 24.46833, lng: 39.61083 }
    const items = SPOTS.filter((s) => (cat === 'all' || s.category === cat) && (!needle || [s.name.ar, s.name.en, ...spotKeywords(s)].some((w) => fold(w).includes(needle))))
      .map((s) => ({ s, km: haversine(from, s.coords) / 1000, top: ITINERARY.places[s.id]?.tags.includes('highlights') ?? false }))
    if (sort === 'az') items.sort((a, b) => a.s.name[lang].localeCompare(b.s.name[lang], lang))
    else if (sort === 'near') items.sort((a, b) => a.km - b.km)
    else items.sort((a, b) => Number(b.top) - Number(a.top) || Number(b.s.kind === 'landmark') - Number(a.s.kind === 'landmark') || a.km - b.km)
    return items
  }, [q, cat, sort, pos, lang])

  return (
    <section aria-label={L('أماكن المدينة', 'Places in Madinah')} className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-[calc(20px*var(--fs))] font-semibold text-pine-900">{L('أماكن المدينة', 'Places in Madinah')}</h2>
        <span className="text-[calc(12px*var(--fs))] text-ink-500">{L(`${num(SPOTS.length, lang)} مكانًا`, `${SPOTS.length} places`)}</span>
      </div>
      <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink-900/10 focus-within:ring-2 focus-within:ring-pine-600">
        <span aria-hidden="true">🔎</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('ابحث: قباء، تمور، ممشى…', 'Search: Quba, dates, walkway…')} className="min-w-0 flex-1 bg-transparent text-[calc(14px*var(--fs))] outline-none" aria-label={L('بحث في الأماكن', 'Search places')} />
        {q && <button onClick={() => setQ('')} aria-label={L('مسح', 'Clear')} className="text-ink-400"><Icon name="x" size={16} /></button>}
      </label>
      <div className="scroll-x -mx-4 flex gap-1.5 px-4" role="group" aria-label={L('التصنيف', 'Category')}>
        <ChoiceChip on={cat === 'all'} onClick={() => setCat('all')} className="shrink-0">{L('الكل', 'All')}</ChoiceChip>
        {CATS.map((c) => (
          <ChoiceChip key={c} on={cat === c} onClick={() => setCat(c)} className="shrink-0">{CATEGORY_LABEL[c].icon} {CATEGORY_LABEL[c][lang]} <span className="opacity-60">{num(counts[c], lang)}</span></ChoiceChip>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[calc(12px*var(--fs))]" role="group" aria-label={L('الترتيب', 'Sort')}>
        <span className="text-ink-500">{L('ترتيب:', 'Sort:')}</span>
        {([['top', L('الأبرز (اقتراحنا)', 'Top picks (our suggestion)')], ['near', pos ? L('الأقرب إليّ', 'Nearest to me') : L('الأقرب للحرم', 'Nearest the Haram')], ['az', L('أبجديًا', 'A–Z')]] as const).map(([k, label]) => (
          <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)} className={`btn-press rounded-full px-2.5 py-1 font-semibold ${sort === k ? 'bg-gold-400 text-pine-950' : 'bg-ink-900/6 text-ink-700'}`}>{label}</button>
        ))}
      </div>
      {list.length === 0 && <p className="rounded-2xl bg-white p-4 text-center text-[calc(13px*var(--fs))] text-ink-500">{L('لا نتائج. جرّب كلمة أخرى أو تصنيفًا آخر.', 'No results. Try another word or category.')}</p>}
      <ul className="space-y-2">
        {list.map(({ s, km, top }) => <SpotCard key={s.id} s={s} km={km} top={top} fromMe={!!pos} visited={!!visited[s.id]} lang={lang} />)}
      </ul>
      <p className="text-[calc(11.5px*var(--fs))] leading-relaxed text-ink-500">{L('«الأبرز» اقتراح منّا وليس تقييمًا رسميًا. المسافات بخط مستقيم.', '“Top picks” is our suggestion, not an official ranking. Distances are straight-line.')}</p>
    </section>
  )
}

function SpotCard({ s, km, top, fromMe, visited, lang }: { s: Spot; km: number; top: boolean; fromMe: boolean; visited: boolean; lang: Lang }) {
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const lm = isLandmarkId(s.id) ? LANDMARK_MAP[s.id] : null
  const pl = lm ? null : PLACE_MAP[s.id]
  const open = () => {
    const g = useGame.getState()
    if (lm) g.select(lm.id)
    else g.openPlace(s.id)
  }
  return (
    <li>
      <button onClick={open} className="btn-press flex w-full items-center gap-3 rounded-[20px] bg-white p-2.5 text-start shadow-sm ring-1 ring-ink-900/5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl pattern-geo ${lm ? (visited ? 'bg-pine-800' : 'bg-ink-700/85') : 'bg-sand-200'}`}>
          {lm ? <LandmarkEmblem id={lm.id} size={38} tone={visited ? 'gold' : 'light'} /> : <span className="text-[26px]" aria-hidden="true">{CATEGORY_LABEL[s.category].icon}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-pine-900 text-[calc(15px*var(--fs))]">{s.name[lang]}</span>
          <span className="line-clamp-1 block text-[calc(12px*var(--fs))] text-ink-500">{lm ? lm.tagline[lang] : pl!.summary[lang]}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {lm ? <Pill tone={visited ? 'green' : 'sand'}>{visited ? '✓ ' : ''}3D</Pill> : <Pill>📍 {L('على الخريطة', 'Map')}</Pill>}
            {top && <Pill tone="gold">★ {L('الأبرز', 'Top pick')}</Pill>}
            {s.approx && <Pill>≈ {L('موضع تقريبي', 'Approx. spot')}</Pill>}
            <span className="text-[calc(11px*var(--fs))] text-ink-500">{fmtDistance(km * 1000, lang)} {fromMe ? L('منك', 'from you') : L('من الحرم', 'from the Haram')}</span>
          </span>
        </span>
        <Icon name="chevron" size={16} className="shrink-0 text-ink-400 rtl:rotate-180" />
      </button>
    </li>
  )
}

/* ---------------- a map-only place ---------------- */
export function PlaceSheet() {
  const id = useGame((s) => s.placeFor)
  const lang = useGame((s) => s.lang)
  const open = useGame((s) => !!s.placeFor && s.tab === 'city' && s.mode === 'city' && !s.replay.active)
  const [expanded, setExpanded] = useState(false)
  if (!open || !id) return null
  const p = PLACE_MAP[id]
  if (!p) return null
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const info = ITINERARY.places[id]
  const near = p.near ? LANDMARK_MAP[p.near] : null
  const close = () => useGame.getState().openPlace(null)
  return (
    <div
      role="dialog" aria-modal="false" aria-label={p.name[lang]}
      className={`absolute inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[28px] bg-sand-50 shadow-[0_-12px_40px_rgba(8,36,27,.35)] anim-rise md:inset-x-auto md:bottom-4 md:end-4 md:top-[92px] md:w-[400px] md:rounded-[28px] ${expanded ? 'h-[86dvh]' : 'h-[56dvh] [@media(max-height:640px)]:h-[76dvh]'} md:h-auto`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-ink-900/15 md:hidden" onClick={() => setExpanded(!expanded)} aria-label={L('توسيع', 'Expand')} />
      <div className="flex items-start gap-3 px-5 pt-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sand-200 pattern-geo text-[28px]" aria-hidden="true">{CATEGORY_LABEL[p.category].icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[calc(21px*var(--fs))] font-semibold leading-tight text-pine-900">{p.name[lang]}</h2>
          <div className="text-[calc(12.5px*var(--fs))] text-ink-500">{p.name[lang === 'ar' ? 'en' : 'ar']}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{CATEGORY_LABEL[p.category][lang]}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill>📍 {L('مكان على الخريطة (بلا نموذج)', 'Map place (no 3D model)')}</Pill>
            {p.approx && <Pill tone="gold">≈ {L('موضع تقريبي', 'Approximate position')}</Pill>}
          </div>
        </div>
        <button onClick={close} className="btn-press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900/6" aria-label={L('إغلاق', 'Close')}><Icon name="x" size={18} /></button>
      </div>
      <div className="scroll-y min-h-0 flex-1 space-y-3 px-5 pb-6 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <a href={mapsSearchUrl(p.coords)} target="_blank" rel="noopener noreferrer" className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-pine-800 px-2 py-2.5 text-[calc(13px*var(--fs))] font-semibold text-sand-50">🗺️ {L('افتح في الخرائط', 'Open in Maps')}</a>
          <Btn tone="ghost" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => useGame.getState().camTo('focus', id)}><Icon name="target" size={16} /> {L('تركيز الكاميرا', 'Focus camera')}</Btn>
        </div>
        {p.edge && <p className="rounded-2xl bg-ink-900/5 p-2.5 text-[calc(12px*var(--fs))] text-ink-700">↗ {L('يقع أبعد من حافة المجسّم، فرسمناه على الحافة في اتجاهه الصحيح.', 'It lies beyond the edge of the miniature, so it is drawn at the edge in its true direction.')}</p>}
        {near && (
          <button onClick={() => useGame.getState().select(near.id)} className="btn-press flex w-full items-center gap-2 rounded-2xl bg-white p-2.5 text-start text-[calc(13px*var(--fs))] ring-1 ring-ink-900/8">
            <LandmarkEmblem id={near.id} size={26} tone="dark" /> <span>{L('بجواره:', 'Next to:')} <b>{near.name[lang]}</b></span>
          </button>
        )}
        <div className="flex flex-wrap items-center gap-1.5"><KindBadge kind="fact" /></div>
        <p className="text-[calc(14.5px*var(--fs))] leading-[1.85] text-ink-700">{p.summary[lang]}</p>
        {p.facts.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {p.facts.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink-900/5">
                <div className="text-[calc(11px*var(--fs))] text-ink-500">{f.label[lang]}</div>
                <div className="text-[calc(14px*var(--fs))] font-bold text-pine-900">{f.value[lang]}</div>
              </div>
            ))}
          </div>
        )}
        {p.approx && p.approxNote && <p className="rounded-2xl bg-gold-300/20 p-3 text-[calc(12.5px*var(--fs))] text-ink-700 ring-1 ring-gold-500/20">≈ {p.approxNote[lang]}</p>}
        <div className="rounded-2xl bg-sky-700/8 p-3 ring-1 ring-sky-800/15">
          <div className="mb-1"><KindBadge kind="suggestion" /></div>
          <p className="text-[calc(13.5px*var(--fs))] leading-relaxed text-ink-700">{p.tip[lang]}</p>
          {info && (
            <ul className="mt-2 space-y-0.5 text-[calc(12px*var(--fs))] text-ink-700">
              <li>⏱ {L(`مدة مقترحة نحو ${num(info.minutes, lang)} دقيقة`, `Suggested time about ${info.minutes} min`)} <KindBadge kind="estimate" /></li>
              <li>🕒 {info.bestTime[lang]}</li>
              <li>♿ {info.access[lang]}</li>
            </ul>
          )}
          <p className="mt-1.5 text-[calc(11.5px*var(--fs))] text-ink-500">{L(`نحو ${fmtDistance(kmFromHaram(p.coords) * 1000, lang)} من المسجد النبوي بخط مستقيم.`, `About ${fmtDistance(kmFromHaram(p.coords) * 1000, lang)} from the Prophet’s Mosque in a straight line.`)}</p>
        </div>
        <SourceList sources={p.sources} />
      </div>
    </div>
  )
}

/* ---------------- map filter chips (city view) ---------------- */
export function MapFilterBar() {
  const lang = useGame((s) => s.lang)
  const filter = useGame((s) => s.mapFilter)
  const pins = useGame((s) => s.showPins)
  const hidden = useGame((s) => s.sheetOpen || !!s.placeFor || !!s.panel || s.replay.active || !!s.visiting || !!s.constructing || !!s.celebrate)
  if (hidden) return null
  const set = (patch: Partial<{ mapFilter: PlaceCategory | 'all'; showPins: boolean }>) => useGame.getState().setUi(patch)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[100px] z-20 pe-[64px] ps-3 [@media(max-height:520px)]:pe-[250px]">
      <div className="scroll-x pointer-events-auto flex gap-1.5 pb-1" role="group" aria-label={L('تصفية الخريطة', 'Map filter')}>
        <button aria-pressed={pins} onClick={() => set({ showPins: !pins })} className={`btn-press shrink-0 rounded-full px-3 py-1.5 text-[calc(12px*var(--fs))] font-semibold shadow-md ${pins ? 'bg-gold-400 text-pine-950' : 'glass-dark text-sand-50'}`}>📍 {L('الأماكن', 'Places')}</button>
        {(['all', ...CATS] as const).map((c) => (
          <button key={c} aria-pressed={filter === c} onClick={() => set({ mapFilter: c })} className={`btn-press shrink-0 rounded-full px-3 py-1.5 text-[calc(12px*var(--fs))] font-semibold shadow-md ${filter === c ? 'bg-pine-800 text-sand-50 ring-1 ring-gold-400/60' : 'glass-dark text-sand-50'}`}>
            {c === 'all' ? L('الكل', 'All') : `${CATEGORY_LABEL[c].icon} ${CATEGORY_LABEL[c][lang]}`}
          </button>
        ))}
      </div>
    </div>
  )
}

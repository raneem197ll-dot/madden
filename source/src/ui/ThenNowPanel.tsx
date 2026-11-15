import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../state/gameStore'
import { Modal } from './components/Sheet'
import { KindBadge } from './components/Bits'
import { ModelViewer } from './ModelViewer'
import { LANDMARKS, LANDMARK_MAP } from '../data/landmarks'
import { rendersFor } from '../data/renders'
import { useMemoryImage } from '../state/photoStore'
import type { Source } from '../data/collectibles'
import type { Bi, LandmarkId } from '../data/types'
import thenNowJson from '../content/then-now.json'

interface ThenNow {
  visual: 'model-era' | 'description'
  then: { label: Bi; desc: Bi; reconstruction: 'illustrative' | 'none'; photo?: { src: string; credit: string; license: string } }
  now: { label: Bi; desc: Bi }
  eras: { when: Bi; title: Bi; text: Bi; sources: Source[] }[]
}
export const THEN_NOW = thenNowJson as unknown as Record<LandmarkId, ThenNow>

/** Drag-to-compare: the "then" layer is revealed from the start edge up to the slider. */
function CompareSlider({ then, now, value, onChange, label }: { then: React.ReactNode; now: React.ReactNode; value: number; onChange: (v: number) => void; label: string }) {
  const rtl = useGame((s) => s.lang) === 'ar'
  const pct = Math.round(value * 100)
  return (
    <div className="relative h-[38dvh] min-h-[240px] overflow-hidden rounded-3xl ring-1 ring-ink-900/10">
      <div className="absolute inset-0">{now}</div>
      {/* the documented "then" panel grows from the start edge; its text reflows to the visible width */}
      <div className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${pct}%` }}>{pct >= 28 ? then : <div className="h-full bg-[#efe2c4]" />}</div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]" style={rtl ? { right: `${pct}%` } : { left: `${pct}%` }} />
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}
        className="absolute inset-x-4 bottom-3 accent-[#c9a24a]" />
    </div>
  )
}

function DocumentedThen({ t, lang }: { t: ThenNow; lang: 'ar' | 'en' }) {
  return (
    <div className="scroll-y flex h-full flex-col justify-center bg-[#efe2c4] p-4 pb-12 text-[#3b2f1c]" style={{ backgroundImage: 'radial-gradient(rgba(120,90,40,.12) 1px, transparent 1px)', backgroundSize: '6px 6px' }}>
      <div className="font-display text-[calc(17px*var(--fs))] font-semibold">{t.then.label[lang]}</div>
      <p className="mt-2 text-[calc(13px*var(--fs))] leading-[1.85]">{t.then.desc[lang]}</p>
      <div className="mt-2 text-[calc(11px*var(--fs))] opacity-70">{lang === 'ar' ? '📜 وصف موثّق — لا توجد صورة تاريخية مرخّصة مضمّنة' : '📜 Documented description — no licensed historical photo included'}</div>
    </div>
  )
}

function NowImage({ id, lang }: { id: LandmarkId; lang: 'ar' | 'en' }) {
  const mem = useGame((s) => s.memories.find((m) => m.landmarkId === id && m.photoKey && !m.sample))
  const [mine, setMine] = useState(true)
  const photo = useMemoryImage(mem?.photoKey)
  const render = rendersFor(id)[0]
  const useMine = mine && !!photo
  return (
    <div className="relative h-full w-full bg-pine-900">
      {(useMine ? photo : render) && <img src={useMine ? photo : render} alt="" className="h-full w-full object-cover" />}
      <div className="absolute end-2 top-2 flex flex-col items-end gap-1">
        <span className="rounded-full bg-black/55 px-2 py-0.5 text-[calc(10.5px*var(--fs))] font-semibold text-white">{useMine ? (lang === 'ar' ? '📷 صورتك' : '📷 Your photo') : (lang === 'ar' ? '🎮 نموذج اللعبة المبسّط' : '🎮 Simplified game model')}</span>
        {photo && <button onClick={() => setMine(!mine)} className="pointer-events-auto rounded-full bg-white/85 px-2 py-0.5 text-[calc(10.5px*var(--fs))] font-semibold text-ink-900">{mine ? (lang === 'ar' ? 'اعرض النموذج' : 'Show model') : (lang === 'ar' ? 'اعرض صورتي' : 'Show my photo')}</button>}
      </div>
    </div>
  )
}

/** Past vs present for each landmark: documented eras, a comparison slider, honest labels. */
export function ThenNowPanel() {
  const open = useGame((s) => s.panel === 'thenNow')
  const lang = useGame((s) => s.lang)
  const forId = useGame((s) => s.thenNowFor)
  const g = useGame.getState
  const [id, setId] = useState<LandmarkId>('hejaz')
  const [v, setV] = useState(0.6)
  const era = useRef({ current: 1 })
  useEffect(() => { if (open && forId) setId(forId) }, [open, forId])
  useEffect(() => { era.current.current = v >= 0.5 ? 0 : 1 }, [v])
  const t = THEN_NOW[id]
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const lm = LANDMARK_MAP[id]
  const ids = useMemo(() => LANDMARKS.map((l) => l.id).filter((x) => THEN_NOW[x]), [])
  if (!open) return null
  return (
    <Modal open onClose={() => g().setUi({ panel: null, thenNowFor: null })} title={L('الماضي والحاضر', 'Then & Now')} wide>
      <div className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          {ids.map((x) => (
            <button key={x} role="tab" aria-selected={x === id} onClick={() => { setId(x); setV(0.6) }} className={`btn-press shrink-0 rounded-full px-3 py-1.5 text-[calc(12.5px*var(--fs))] font-semibold ${x === id ? 'bg-pine-800 text-sand-50' : 'bg-white ring-1 ring-ink-900/10'}`}>{LANDMARK_MAP[x].name[lang]}</button>
          ))}
        </div>

        {t.visual === 'model-era' ? (
          <div className="space-y-2">
            <div className="relative h-[38dvh] min-h-[220px] overflow-hidden rounded-3xl ring-1 ring-ink-900/10">
              <ModelViewer id={id} era={era.current} background={v >= 0.5 ? '#efe2c4' : '#f4ead7'} />
              <div className="pointer-events-none absolute start-2 top-2 flex flex-wrap gap-1">
                {v >= 0.5 ? <KindBadge kind="illustrative" /> : <span className="rounded-full bg-black/55 px-2 py-0.5 text-[calc(10.5px*var(--fs))] font-semibold text-white">🎮 {L('نموذج اللعبة المبسّط', 'Simplified game model')}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={L('الفترة', 'Period')}>
              <button role="radio" aria-checked={v >= 0.5} onClick={() => setV(1)} className={`btn-press rounded-2xl px-3 py-2 text-[calc(13px*var(--fs))] font-semibold ${v >= 0.5 ? 'bg-[#7a5a26] text-white' : 'bg-white ring-1 ring-ink-900/10'}`}>🕰️ {t.then.label[lang]}</button>
              <button role="radio" aria-checked={v < 0.5} onClick={() => setV(0)} className={`btn-press rounded-2xl px-3 py-2 text-[calc(13px*var(--fs))] font-semibold ${v < 0.5 ? 'bg-pine-800 text-sand-50' : 'bg-white ring-1 ring-ink-900/10'}`}>🏛️ {t.now.label[lang]}</button>
            </div>
            <p className="rounded-2xl bg-gold-300/20 p-3 text-[calc(12.5px*var(--fs))] leading-relaxed">{v >= 0.5 ? t.then.desc[lang] : t.now.desc[lang]}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <CompareSlider value={v} onChange={setV} label={L('اسحب للمقارنة بين الماضي والحاضر', 'Drag to compare then and now')}
              then={<DocumentedThen t={t} lang={lang} />} now={<NowImage id={id} lang={lang} />} />
            <div className="flex justify-between text-[calc(11.5px*var(--fs))] font-semibold text-ink-500"><span>◀ {t.then.label[lang]}</span><span>{t.now.label[lang]} ▶</span></div>
            <p className="rounded-2xl bg-white p-3 text-[calc(12.5px*var(--fs))] leading-relaxed ring-1 ring-ink-900/6"><b>{t.now.label[lang]}: </b>{t.now.desc[lang]}</p>
          </div>
        )}

        <section aria-label={L('الخط الزمني', 'Timeline')}>
          <h3 className="mb-2 text-[calc(14px*var(--fs))] font-bold text-pine-900">{L(`الخط الزمني — ${lm.name.ar}`, `Timeline — ${lm.name.en}`)}</h3>
          <ol className="relative space-y-2.5 border-s-2 border-gold-400/50 ps-4">
            {t.eras.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -start-[23px] top-1.5 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-sand-50" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-1.5"><span className="text-[calc(12px*var(--fs))] font-bold text-gold-600">{e.when[lang]}</span><KindBadge kind="fact" /></div>
                <div className="text-[calc(13.5px*var(--fs))] font-semibold">{e.title[lang]}</div>
                <p className="text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700">{e.text[lang]}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3">{e.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[calc(11px*var(--fs))] text-pine-700 underline" dir="ltr">{s.title}</a>)}</div>
              </li>
            ))}
          </ol>
        </section>
        <p className="text-[calc(11px*var(--fs))] leading-relaxed text-ink-500">{L('لا نعيد بناء عمارة لم توثّقها مصادرنا. «تصوّر توضيحي» يعني أن النموذج يُظهر الفرق الموثّق فقط وما عداه مبسّط.', "We don't rebuild architecture our sources don't document. “Illustrative” means the model shows only the documented difference; everything else is simplified.")}</p>
      </div>
    </Modal>
  )
}

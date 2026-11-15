import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGame, viewUnlocked } from '../state/gameStore'
import { LANDMARKS, LANDMARK_MAP } from '../data/landmarks'
import { landmarkProgress } from '../data/progression'
import type { LandmarkId } from '../data/types'
import { MODELS } from '../three/models'
import { SUGGESTED_TOUR, routePoints, tourOrder } from '../three/city/NavPaths'
import { SPOT_MAP } from '../data/places'
import { haversine } from '../lib/geo'
import { fmtDistance, num, pctText } from '../lib/format'
import { anchorRef } from './anchors'
import { PLACES } from '../data/places'
import { CATEGORY_LABEL } from '../data/landmarks'

function MiniRing({ v }: { v: number }) {
  const r = 7, c = 2 * Math.PI * r
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={9} cy={9} r={r} stroke="rgba(255,255,255,.25)" strokeWidth={2.6} fill="none" />
      <circle cx={9} cy={9} r={r} stroke="#ecd594" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
    </svg>
  )
}

/** Landmark labels (with per-landmark progress) and route-distance chips. */
export function LandmarkLabels() {
  const lang = useGame((s) => s.lang)
  const unlocked = useGame(useShallow((s) => viewUnlocked(s)))
  const visiting = useGame((s) => !!s.visiting)
  const progressById = useGame(useShallow((s) => Object.fromEntries(LANDMARKS.map((l) => [l.id, landmarkProgress(s, l.id)])) as Record<LandmarkId, number>))
  const constructing = useGame((s) => s.constructing?.id)
  const selected = useGame((s) => (s.sheetOpen ? s.selected : null))
  const showRoutes = useGame((s) => s.showRoutes)
  const routeTo = useGame((s) => s.routeTo)
  const placeFor = useGame((s) => s.placeFor)
  const filter = useGame((s) => s.mapFilter)
  const showPins = useGame((s) => s.showPins && !s.visiting && !s.replay.active)

  const tour = useMemo(() => tourOrder(SUGGESTED_TOUR), [])
  const planOrder = useGame((s) => s.planOrder)
  const path = planOrder && planOrder.length > 1 ? planOrder : tour
  const routes: [string, string, boolean][] = []
  if (showRoutes) path.slice(1).forEach((id, i) => routes.push([path[i], id, !!planOrder]))
  if (selected && routeTo && selected !== routeTo) routes.push([selected, routeTo, true])

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {LANDMARKS.map((l) => {
        const state = constructing === l.id ? 'building' : unlocked[l.id] || l.alwaysBuilt ? 'built' : 'locked'
        const visited = !!unlocked[l.id]
        const pct = progressById[l.id]
        const off = filter !== 'all' && l.category !== filter
        const pri = selected === l.id ? 20 : off ? 2 : l.id === 'haram' ? 9 : visited ? 6 : 5
        return (
          <button
            key={l.id}
            ref={anchorRef(`lm:${l.id}`, [l.cityPos[0], MODELS[l.id].labelY, l.cityPos[1]], { pri, compactDist: 95 })}
            onClick={() => { const s = useGame.getState(); if (!s.replay.active && !s.constructing) s.select(l.id) }}
            className={`lm-label group btn-press pointer-events-auto absolute left-0 top-0 will-change-transform ${off ? 'opacity-45' : ''}`}
            style={{ transform: 'translate(-9999px,-9999px)' }}
            aria-label={l.name[lang]}
          >
            <span className={`flex items-center gap-1.5 rounded-full py-1.5 pe-3 ps-2 text-[calc(12px*var(--fs))] font-semibold shadow-lg backdrop-blur group-data-[compact='1']:py-1 group-data-[compact='1']:text-[calc(11px*var(--fs))] ${state === 'built' ? 'bg-pine-800/90 text-sand-50' : 'bg-sand-50/90 text-ink-700'} ${selected === l.id ? 'ring-2 ring-gold-400' : ''}`}>
              {visited && !visiting ? <MiniRing v={pct} /> : <span aria-hidden className="w-[18px] text-center">{state === 'building' ? '⚒' : state === 'built' ? '✦' : '?'}</span>}
              <span>{l.name[lang]}</span>
              {visited && !visiting && <span className="text-[calc(10.5px*var(--fs))] font-bold text-gold-300 group-data-[compact='1']:hidden">{pctText(pct, lang)}</span>}
              {state === 'locked' && <span className="text-[calc(10.5px*var(--fs))] font-medium text-ink-500 group-data-[compact='1']:hidden">{lang === 'ar' ? 'لم يُكتشف' : 'undiscovered'}</span>}
            </span>
          </button>
        )
      })}
      {showPins && PLACES.map((p) => {
        if (filter !== 'all' && p.category !== filter) return null
        const sel = placeFor === p.id
        return (
          <button
            key={p.id}
            ref={anchorRef(`pin:${p.id}`, [p.cityPos[0], 1.1, p.cityPos[1]], { pri: sel ? 20 : 3, compactDist: 60, maxDist: 190 })}
            onClick={() => { const s = useGame.getState(); if (!s.replay.active && !s.constructing) s.openPlace(p.id) }}
            className="group btn-press pointer-events-auto absolute left-0 top-0 will-change-transform"
            style={{ transform: 'translate(-9999px,-9999px)' }}
            aria-label={p.name[lang]}
          >
            <span className={`flex items-center gap-1 rounded-full bg-white/92 py-1 pe-2.5 ps-1 text-[calc(11px*var(--fs))] font-semibold text-pine-900 shadow-md ring-1 ring-ink-900/10 group-data-[compact='1']:pe-1 ${sel ? 'ring-2 ring-gold-500' : ''}`}>
              <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-sand-100 text-[12px]">{CATEGORY_LABEL[p.category].icon}</span>
              <span className="group-data-[compact='1']:hidden">{p.name[lang]}{p.approx ? <span className="ms-1 text-ink-400" title={lang === 'ar' ? 'موضع تقريبي' : 'approximate position'}>≈</span> : null}</span>
            </span>
          </button>
        )
      })}
      {routes.map(([a, b, strong]) => {
        const pts = routePoints(a, b)
        const mid = pts[Math.floor(pts.length / 2)]
        if (!pts.length) return null
        const km = haversine(SPOT_MAP[a].coords, SPOT_MAP[b].coords)
        return (
          <span
            key={`${a}-${b}-${strong}`}
            ref={anchorRef(`route:${a}-${b}-${strong}`, [mid.x, 0.6, mid.z], { pri: strong ? 12 : 4 })}
            className={`absolute left-0 top-0 rounded-full px-2.5 py-1 text-[calc(11px*var(--fs))] font-bold shadow-md will-change-transform ${strong ? 'bg-gold-400 text-pine-950' : 'bg-pine-900/85 text-gold-300'}`}
            style={{ transform: 'translate(-9999px,-9999px)' }}
          >
            {fmtDistance(km, lang)}
          </span>
        )
      })}
    </div>
  )
}

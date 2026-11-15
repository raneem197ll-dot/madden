import { LANDMARKS, LANDMARK_MAP, LANDMARK_IDS } from '../../data/landmarks'
import { PLACE_MAP } from '../../data/places'
import { MODELS } from '../models'
import { rng } from '../shared/env'
import { projectToCity } from '../../lib/geo'
import type { Bi, LandmarkId } from '../../data/types'

/**
 * Deterministic layout of the miniature city, laid out on the real map: every landmark
 * and place sits on its real bearing from the Prophet's Mosque (distances compressed, see
 * lib/geo.ts). Ring roads follow Madinah's three rings (King Faisal, King Abdullah and King
 * Khalid roads) in a simplified, idealised form; terrain features (lava fields, Mount Ayr,
 * Wadi al-Aqiq) are placed from approximate real positions and drawn symbolically.
 */
export const CITY_RADIUS = 64

type P2 = [number, number]
export type RoadKind = 'ring' | 'avenue' | 'access' | 'walk'
/** A road is a polyline; `landmark` roads appear when that landmark is unlocked, others after `need` unlocks. */
export interface Road { pts: P2[]; cum: number[]; len: number; w: number; kind: RoadKind; closed?: boolean; landmark?: LandmarkId; need?: number; name?: Bi }
export type District = LandmarkId | 'core' | 'outer'
export interface House { x: number; z: number; w: number; d: number; h: number; rot: number; floors: 1 | 2 | 3 | 5 | 9; tint: number; district: District; reveal: number; delay: number }

/* ---------------- plots (keep-out areas around landmarks) ---------------- */
interface Plot { id: LandmarkId; x: number; z: number; r: number; box?: [number, number] }
export const PLOTS: Plot[] = LANDMARKS.map((l) => ({ id: l.id, x: l.cityPos[0], z: l.cityPos[1], r: MODELS[l.id].clearRadius, box: MODELS[l.id].clearBox }))

/** Signed distance from a plot's edge (negative inside). */
function plotSd(x: number, z: number, p: Plot) {
  if (p.box) {
    const dx = Math.abs(x - p.x) - p.box[0], dz = Math.abs(z - p.z) - p.box[1]
    return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0)
  }
  return Math.hypot(x - p.x, z - p.z) - p.r
}
function pushOut(x: number, z: number, pad: number, skip?: Set<string>): P2 {
  for (let it = 0; it < 4; it++) {
    let moved = false
    for (const p of PLOTS) {
      if (skip?.has(p.id)) continue
      const sd = plotSd(x, z, p)
      if (sd >= pad) continue
      // numeric gradient of the SDF
      const e = 0.05
      let gx = plotSd(x + e, z, p) - plotSd(x - e, z, p), gz = plotSd(x, z + e, p) - plotSd(x, z - e, p)
      const gl = Math.hypot(gx, gz) || 1
      gx /= gl; gz /= gl
      x += gx * (pad - sd); z += gz * (pad - sd); moved = true
    }
    if (!moved) break
  }
  return [x, z]
}

/** Densify a polyline, keep it out of plots and smooth it a little. */
function avoid(pts: P2[], pad: number, skip: Set<string>, closed = false, step = 0.9): P2[] {
  const dense: P2[] = []
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step))
    for (let j = 0; j < k; j++) dense.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k])
  }
  if (!closed) dense.push(pts[pts.length - 1])
  let out = dense
  for (let pass = 0; pass < 3; pass++) {
    out = out.map((p, i) => (!closed && (i === 0 || i === out.length - 1) ? p : pushOut(p[0], p[1], pad, skip)))
    out = out.map((p, i) => {
      if (!closed && (i === 0 || i === out.length - 1)) return p
      const a = out[(i - 1 + out.length) % out.length], b = out[(i + 1) % out.length]
      return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4] as P2
    })
  }
  return out.map((p, i) => (!closed && (i === 0 || i === out.length - 1) ? p : pushOut(p[0], p[1], pad * 0.8, skip)))
}

function makeRoad(pts: P2[], opts: Omit<Road, 'pts' | 'cum' | 'len'>): Road {
  const all = opts.closed ? [...pts, pts[0]] : pts
  const cum = [0]
  for (let i = 1; i < all.length; i++) cum.push(cum[i - 1] + Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]))
  return { ...opts, pts: all, cum, len: cum[cum.length - 1] }
}

/** Point and unit direction at fraction t (0–1) along a road. */
export function pointAt(r: Road, t: number): { x: number; z: number; ux: number; uz: number } {
  const d = Math.min(Math.max(t, 0), 1) * r.len
  let i = 1
  while (i < r.cum.length - 1 && r.cum[i] < d) i++
  const a = r.pts[i - 1], b = r.pts[i]
  const seg = r.cum[i] - r.cum[i - 1] || 1
  const k = (d - r.cum[i - 1]) / seg
  return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, ux: (b[0] - a[0]) / seg, uz: (b[1] - a[1]) / seg }
}

/* ---------------- roads ---------------- */
const ring = (R: number): P2[] => Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return [Math.cos(a) * R, Math.sin(a) * R] as P2 })
export const RINGS = [
  { r: 15.8, need: 0, w: 1.05, name: { ar: 'طريق الملك فيصل — الدائري الأول', en: 'King Faisal Road — 1st ring' } },
  { r: 31, need: 2, w: 1.15, name: { ar: 'طريق الملك عبد الله — الدائري الثاني', en: 'King Abdullah Road — 2nd ring' } },
  { r: 47.5, need: 5, w: 1.25, name: { ar: 'طريق الملك خالد — الدائري الثالث', en: 'King Khalid Road — 3rd ring' } },
]
const roads: Road[] = RINGS.map((g) => makeRoad(avoid(ring(g.r), 0.8, new Set(), true, 1.2), { w: g.w, kind: 'ring', closed: true, need: g.need, name: g.name }))
const ringRoads = roads.slice()

function nearestOnRoad(r: Road, x: number, z: number): P2 {
  let best: P2 = r.pts[0], bd = Infinity
  for (const p of r.pts) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = p } }
  return best
}
function segBlocked(a: P2, b: P2, skip: Set<string>, pad: number) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6)
  let worst = 0
  for (let i = 1; i < n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, z = a[1] + ((b[1] - a[1]) * i) / n
    for (const p of PLOTS) if (!skip.has(p.id)) worst = Math.max(worst, pad - plotSd(x, z, p))
  }
  return worst
}
/** The Haram plaza edge point nearest to (x, z). */
function plazaEdge(x: number, z: number): P2 {
  const [hx, hz] = MODELS.haram.clearBox!
  const t = Math.max(Math.abs(x) / hx, Math.abs(z) / hz)
  return [x / t, z / t]
}

// access road for every landmark: from the nearest ring inside it (or the Haram plaza) to its plot
for (const l of LANDMARKS) {
  if (l.id === 'haram') continue
  const [cx, cz] = l.cityPos
  const R = Math.hypot(cx, cz)
  const clr = MODELS[l.id].clearRadius
  const inner = [...RINGS.keys()].filter((k) => RINGS[k].r < R - clr - 0.5).pop()
  const base = Math.atan2(cz, cx)
  let best: { a: P2; b: P2; cost: number } | null = null
  for (const off of [0, 0.07, -0.07, 0.14, -0.14, 0.22, -0.22, 0.32, -0.32]) {
    const th = base + off
    const target: P2 = inner === undefined ? plazaEdge(Math.cos(th) * R, Math.sin(th) * R) : nearestOnRoad(ringRoads[inner], Math.cos(th) * RINGS[inner].r, Math.sin(th) * RINGS[inner].r)
    const dx = target[0] - cx, dz = target[1] - cz, dl = Math.hypot(dx, dz) || 1
    const end: P2 = [cx + (dx / dl) * (clr - 0.4), cz + (dz / dl) * (clr - 0.4)]
    const cost = segBlocked(target, end, new Set(['haram', l.id]), 0.6) * 10 + Math.abs(off)
    if (!best || cost < best.cost) best = { a: target, b: end, cost }
    if (cost < 0.4) break
  }
  const pts = avoid([best!.a, best!.b], 0.6, new Set(['haram', l.id]))
  roads.push(makeRoad(pts, { w: 0.95, kind: 'access', landmark: l.id }))
}

// the Quba walkway: a palm-lined pedestrian route from the Haram plaza to Quba (always shown)
const qubaDoor = (() => { const [x, z] = LANDMARK_MAP.quba.cityPos; return [x, z - MODELS.quba.clearRadius + 0.6] as P2 })()
export const QUBA_WALK = makeRoad(avoid([plazaEdge(qubaDoor[0] * 0.2, 10), [qubaDoor[0] * 0.5, (10 + qubaDoor[1]) / 2], qubaDoor], 0.9, new Set(['haram', 'quba'])), { w: 0.8, kind: 'walk', need: 0, name: { ar: 'ممشى قباء', en: 'Quba Walkway' } })
roads.push(QUBA_WALK)

// main avenues to the city edge (approximate directions of major roads, e.g. the airport road to the NE)
const AVENUES: [number, number, Bi?][] = [
  [-Math.PI / 4, 1, { ar: 'طريق المطار (طريق الأمير محمد بن سلمان)', en: 'Airport road (Prince Mohammed bin Salman Rd)' }],
  [0.17, 1], [0.95, 2], [2.05, 3], [3.0, 2], [-2.45, 4], [-1.85, 3],
]
for (const [a, need, name] of AVENUES) {
  const start = plazaEdge(Math.cos(a) * 20, Math.sin(a) * 20)
  const end: P2 = [Math.cos(a) * (CITY_RADIUS - 3), Math.sin(a) * (CITY_RADIUS - 3)]
  roads.push(makeRoad(avoid([start, end], 0.7, new Set(['haram'])), { w: 1.05, kind: 'avenue', need, name }))
}
export const ROADS = roads

/** A smooth guide line between two points that bends around landmark plots (used for routes). */
export function routeLine(a: P2, b: P2, skip: string[]): P2[] {
  return avoid([a, b], 0.6, new Set(['haram', ...skip]), false, 0.8)
}
const unlockedCount = (u: Partial<Record<LandmarkId, boolean>>) => Object.values(u).filter(Boolean).length
export function roadVisible(r: Road, unlocked: Partial<Record<LandmarkId, boolean>>) {
  if (r.landmark) return !!unlocked[r.landmark] || !!LANDMARK_MAP[r.landmark].alwaysBuilt
  return unlockedCount(unlocked) >= (r.need ?? 0)
}

/* ---------------- terrain features ---------------- */
const P = (lat: number, lng: number): P2 => { const p = projectToCity({ lat, lng }); return [p.x, p.z] }
const clampR = ([x, z]: P2, max = CITY_RADIUS - 5): P2 => { const r = Math.hypot(x, z); return r > max ? [(x / r) * max, (z / r) * max] : [x, z] }

/** Wadi al-Aqiq: approximate course from south of the Miqat to al-Jurf in the north-west. */
export const WADI = makeRoad(avoid([
  P(24.402, 39.552), P(24.418, 39.548), P(24.445, 39.556), P(24.466, 39.562), P(24.479, 39.568), P(24.497, 39.577), P(24.515, 39.585), P(24.535, 39.595),
].map((p) => clampR(p)), 1.0, new Set(['aqiq', 'miqat'])), { w: 2.0, kind: 'walk' })

/** Lava fields (harrat): east (Harrat Waqim), west (Harrat al-Wabra) and south of Quba (Harrat Shawran). */
export const HARRAT: { x: number; z: number; s: number; rot: number }[] = (() => {
  const r = rng(5)
  const out: { x: number; z: number; s: number; rot: number }[] = []
  const fields: [number, number, number, number, number][] = [
    // [bearing from north (deg) min, max, km min, km max, count]
    [60, 118, 5.5, 13, 26], [250, 292, 5, 10, 16], [160, 205, 6.5, 12, 18],
  ]
  for (const [b0, b1, k0, k1, n] of fields) for (let i = 0; i < n; i++) {
    const b = ((b0 + r() * (b1 - b0)) * Math.PI) / 180
    const km = k0 + r() * (k1 - k0)
    const lat = 24.46833 + (Math.cos(b) * km) / 111.32, lng = 39.61083 + (Math.sin(b) * km) / (111.32 * 0.91)
    const [x, z] = clampR(P(lat, lng), CITY_RADIUS - 2.5)
    out.push({ x, z, s: 1.8 + r() * 2.6, rot: r() * 6.28 })
  }
  return out.filter((h) => PLOTS.every((p) => plotSd(h.x, h.z, p) > h.s * 0.6))
})()

/** Mount Ayr, the southern boundary of the haram of Madinah (ridge drawn symbolically). */
export const AYR = (() => { const [x, z] = clampR(P(24.39944, 39.55694), CITY_RADIUS - 5.5); return { x, z } })()

/* ---------------- occupancy grid (fast "is this spot free?") ---------------- */
const CELL = 0.8
const N = Math.ceil((CITY_RADIUS * 2) / CELL)
const occ = new Uint8Array(N * N)
const cellOf = (v: number) => Math.floor((v + CITY_RADIUS) / CELL)
function stamp(x: number, z: number, rad: number) {
  const c0 = cellOf(x - rad), c1 = cellOf(x + rad), r0 = cellOf(z - rad), r1 = cellOf(z + rad)
  for (let i = Math.max(0, c0); i <= Math.min(N - 1, c1); i++) for (let j = Math.max(0, r0); j <= Math.min(N - 1, r1); j++) {
    const cx = -CITY_RADIUS + (i + 0.5) * CELL, cz = -CITY_RADIUS + (j + 0.5) * CELL
    if (Math.hypot(cx - x, cz - z) <= rad + CELL * 0.5) occ[j * N + i] = 1
  }
}
function stampRoad(r: Road, pad: number) {
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], b = r.pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL * 0.6)))
    for (let k = 0; k <= n; k++) stamp(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, r.w / 2 + pad)
  }
}
for (const r of ROADS) stampRoad(r, 0.3)
stampRoad(WADI, 0.3)
for (const h of HARRAT) stamp(h.x, h.z, h.s * 0.75)
stamp(AYR.x, AYR.z, 5)

/** The Hejaz railway line, drawn from Madinah station out to the north-west edge (its approach from the north). */
export const RAIL_LINE = (() => {
  const [hx, hz] = LANDMARK_MAP.hejaz.cityPos
  const a = Math.atan2(hz, hx) - 0.2
  const start: P2 = [hx - 1.5, hz - MODELS.hejaz.clearRadius * 0.6]
  const pts: P2[] = [start, [hx - 6, hz - 12], [Math.cos(-2.15) * 40, Math.sin(-2.15) * 40], [Math.cos(-2.2) * (CITY_RADIUS - 2.5), Math.sin(-2.2) * (CITY_RADIUS - 2.5)]]
  void a
  return makeRoad(avoid(pts, 0.8, new Set(['hejaz'])), { w: 0.7, kind: 'walk' })
})()
stampRoad(RAIL_LINE, 0.3)


export const DECOR_ZONES = (() => {
  const free = (x: number, z: number, rad: number) => PLOTS.every((p) => plotSd(x, z, p) > rad + 0.4)
  const near = (id: string, dx: number, dz: number) => { const [x, z] = PLACE_MAP[id].cityPos; return { x: x + dx, z: z + dz } }
  const pick = (cands: { x: number; z: number }[], rad: number) => cands.find((c) => free(c.x, c.z, rad)) ?? cands[0]
  return {
    oasis: { ...pick([{ x: 24, z: 14 }, { x: 22, z: 18 }, { x: 27, z: 9 }], 3.4), r: 3.4 },
    market: { ...pick([near('datesMarket', -1.6, 1.2), near('datesMarket', -2.4, -1.4)], 2.4), r: 2.4 },
    fountain: { ...pick([{ x: -11.8, z: -6.8 }, { x: -12, z: -9 }, { x: 10.5, z: -10.5 }], 1.8), r: 1.8 },
  }
})()
for (const z of Object.values(DECOR_ZONES)) stamp(z.x, z.z, z.r)

export const PARKS = (() => {
  const kf = PLACE_MAP.kingFahdPark.cityPos
  return [
    { x: kf[0], z: kf[1], r: 3.0 },
    { x: 20, z: -20, r: 1.7 }, { x: -20, z: -6, r: 1.6 }, { x: 25, z: 30, r: 2.0 }, { x: -28, z: 36, r: 1.8 }, { x: 38, z: -6, r: 2.2 }, { x: -9, z: 26, r: 1.7 },
  ].filter((p) => PLOTS.every((q) => plotSd(p.x, p.z, q) > p.r + 0.3) && Math.hypot(p.x, p.z) < CITY_RADIUS - 4)
    .map((p, i) => ({ ...p, district: districtOf(p.x, p.z), reveal: (i * 0.37) % 1 }))
})()
for (const p of PARKS) stamp(p.x, p.z, p.r)

export function isFree(x: number, z: number, pad: number) {
  if (Math.hypot(x, z) > CITY_RADIUS - 3 - pad) return false
  for (const p of PLOTS) if (plotSd(x, z, p) < pad) return false
  const c0 = cellOf(x - pad), c1 = cellOf(x + pad), r0 = cellOf(z - pad), r1 = cellOf(z + pad)
  for (let i = Math.max(0, c0); i <= Math.min(N - 1, c1); i++) for (let j = Math.max(0, r0); j <= Math.min(N - 1, r1); j++) if (occ[j * N + i]) return false
  return true
}

/** Which part of the city a point grows with: the old core, a landmark's district, or the outskirts. */
export function districtOf(x: number, z: number): District {
  if (Math.hypot(x, z) < 17) return 'core'
  let best: LandmarkId | null = null, bd = 12
  for (const l of LANDMARKS) {
    const d = Math.hypot(x - l.cityPos[0], z - l.cityPos[1]) - MODELS[l.id].clearRadius
    if (d < bd) { bd = d; best = l.id }
  }
  return best ?? 'outer'
}

/** Is a growth item visible for the given unlocked set? The centre is dense from the start. */
export function grows(district: District, reveal: number, unlocked: Partial<Record<LandmarkId, boolean>>) {
  const f = unlockedCount(unlocked) / LANDMARK_IDS.length
  if (district === 'core') return reveal < 0.85 + f * 0.15
  if (district === 'outer') return reveal < 0.45 + f * 0.55
  return unlocked[district] || LANDMARK_MAP[district].alwaysBuilt ? true : reveal < 0.35
}

/* ---------------- houses ---------------- */
function genHouses(): House[] {
  const r = rng(2024)
  const out: House[] = []
  const step = 1.42
  for (let gx = -CITY_RADIUS; gx <= CITY_RADIUS; gx += step) {
    for (let gz = -CITY_RADIUS; gz <= CITY_RADIUS; gz += step) {
      const x = gx + (r() - 0.5) * 0.55
      const z = gz + (r() - 0.5) * 0.55
      const dist = Math.hypot(x, z)
      const downtown = dist < 17.5
      const density = downtown ? 1 : dist < 31 ? 0.8 : dist < 47 ? 0.55 : 0.28
      if (r() > density) continue
      const w = downtown ? 1.15 + r() * 0.6 : 0.85 + r() * 0.65
      const d = downtown ? 1.1 + r() * 0.6 : 0.85 + r() * 0.65
      if (!isFree(x, z, Math.max(w, d) * 0.4)) continue
      // hotel towers ring the Haram; mid-rise inside the 2nd ring; low houses further out
      const floors = (downtown ? (r() > 0.4 ? 9 : 5) : dist < 31 ? (r() > 0.55 ? 3 : 2) : dist < 47 ? (r() > 0.7 ? 2 : 1) : 1) as House['floors']
      const h = floors * 0.42 + 0.1 + r() * (floors === 9 ? 0.9 : 0.08)
      const district = districtOf(x, z)
      const lm = district !== 'core' && district !== 'outer' ? LANDMARK_MAP[district] : null
      const delay = lm ? Math.hypot(x - lm.cityPos[0], z - lm.cityPos[1]) * 90 : dist * 30
      out.push({ x, z, w, d, h, rot: Math.atan2(x, z) + (r() - 0.5) * 0.12, floors, tint: r(), district, reveal: r(), delay })
    }
  }
  return out
}
export const HOUSES = genHouses()

/* ---------------- palms ---------------- */
export interface PalmPt { x: number; z: number; h: number; s: number; rot: number; road?: number; district?: District; reveal?: number; delay?: number }
function genPalms() {
  const r = rng(77)
  const pts: PalmPt[] = []
  // along avenues and the Quba walkway
  ROADS.forEach((road, ri) => {
    if (road.kind === 'ring' || road.kind === 'access') return
    const gap = road.kind === 'walk' ? 1.5 : 2.6
    for (let d = 1.4; d < road.len - 0.8; d += gap) {
      const p = pointAt(road, d / road.len)
      for (const side of [-1, 1]) {
        const off = road.w / 2 + 0.32
        const x = p.x - p.uz * off * side, z = p.z + p.ux * off * side
        if (PLOTS.some((q) => plotSd(x, z, q) < 0.2)) continue
        pts.push({ x, z, h: 0.95 + r() * 0.45, s: 0.52 + r() * 0.2, rot: r() * 6.28, road: ri, delay: d * 90 })
      }
    }
  })
  // palm groves: Quba & the south (al-Awali), the Aqiq valley and around Bir Rumah, plus scattered orchards
  const groves: [number, number, number, number][] = [[178, 30, 46, 60], [140, 24, 40, 40], [292, 32, 52, 50], [320, 34, 46, 30]]
  for (const [bearing, r0, r1, n] of groves) for (let i = 0; i < n; i++) {
    const a = ((bearing - 90 + (r() - 0.5) * 40) * Math.PI) / 180
    const d = r0 + r() * (r1 - r0)
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (!isFree(x, z, 0.25)) continue
    pts.push({ x, z, h: 0.9 + r() * 0.8, s: 0.55 + r() * 0.3, rot: r() * 6.28, district: districtOf(x, z), reveal: r() * 0.6, delay: r() * 900 })
  }
  for (let i = 0; i < 140; i++) {
    const a = r() * Math.PI * 2
    const d = 18 + r() * (CITY_RADIUS - 22)
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (!isFree(x, z, 0.25)) continue
    pts.push({ x, z, h: 0.9 + r() * 0.8, s: 0.55 + r() * 0.3, rot: r() * 6.28, district: districtOf(x, z), reveal: r(), delay: r() * 900 })
  }
  // along the wadi
  for (let d = 1; d < WADI.len; d += 1.7) {
    const p = pointAt(WADI, d / WADI.len)
    const side = r() > 0.5 ? 1 : -1
    const x = p.x - p.uz * 1.5 * side, z = p.z + p.ux * 1.5 * side
    if (!PLOTS.every((q) => plotSd(x, z, q) > 0.3)) continue
    pts.push({ x, z, h: 0.9 + r() * 0.6, s: 0.5 + r() * 0.25, rot: r() * 6.28, district: districtOf(x, z), reveal: r() * 0.5, delay: r() * 600 })
  }
  return pts
}
export const PALMS = genPalms()

/** Lamp posts along the first ring road (King Faisal Road). */
export const RING_LAMPS = (() => {
  const r1 = ROADS[0]
  const out: { x: number; z: number; a: number }[] = []
  for (let d = 0; d < r1.len; d += 2.6) {
    const p = pointAt(r1, d / r1.len)
    const nx = -p.uz, nz = p.ux
    const sgn = nx * p.x + nz * p.z > 0 ? 1 : -1
    out.push({ x: p.x + nx * sgn * (r1.w / 2 + 0.25), z: p.z + nz * sgn * (r1.w / 2 + 0.25), a: Math.atan2(p.z, p.x) })
  }
  return out
})()

/** Hills on the rim (none where the lava fields or Mount Ayr already sit). */
export function genRim() {
  const r = rng(5)
  const hills: { x: number; z: number; s: number; h: number; dark: boolean }[] = []
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + r() * 0.08
    const d = CITY_RADIUS - 1.8 + r() * 0.8
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (ROADS.some((rd) => rd.kind === 'avenue' && Math.hypot(rd.pts[rd.pts.length - 1][0] - x, rd.pts[rd.pts.length - 1][1] - z) < 4)) continue
    if (PLOTS.some((p) => plotSd(x, z, p) < 3)) continue
    hills.push({ x, z, s: 1.8 + r() * 2.4, h: 0.8 + r() * 2.6, dark: r() > 0.45 })
  }
  return { hills, harrat: HARRAT }
}
export const RIM = genRim()

/** Street lamps along avenues, access roads and the walkway (they grow with their road). */
export const ROAD_LAMPS = ROADS.flatMap((road, ri) => {
  if (road.kind === 'ring') return []
  const out: { x: number; z: number; road: number; delay: number }[] = []
  let k = 0
  for (let d = 2.0; d < road.len - 0.4; d += road.kind === 'walk' ? 2.2 : 3.4) {
    const p = pointAt(road, d / road.len)
    const side = k++ % 2 ? 1 : -1
    const off = road.w / 2 + 0.16
    out.push({ x: p.x - p.uz * off * side, z: p.z + p.ux * off * side, road: ri, delay: d * 110 })
  }
  return out
})

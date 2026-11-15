import itineraryJson from '../content/itinerary.json'
import { SPOTS, SPOT_MAP } from '../data/places'
import type { Bi, PlanBudget, PlanPrefs } from '../data/types'
import { haversine } from './geo'

/**
 * Smart itinerary: picks and orders places to fit the visitor's time, interests and
 * travel mode. Every number here is an ESTIMATE (straight-line distance × detour factor,
 * average speeds, suggested visit lengths) and is labelled as such in the UI.
 * With ~30 places a brute-force search is impossible, so it uses greedy insertion by
 * value-per-minute followed by 2-opt to shorten the route — fast and deterministic.
 */
interface PlaceInfo { minutes: number; tags: string[]; bestTime: Bi; access: Bi; status?: { text: Bi; source: { title: string; url: string } } }
interface ItineraryData {
  starts: { id: string; name: Bi; coords: { lat: number; lng: number } }[]
  modes: Record<'walk' | 'car', { label: Bi; kmh: number; maxLegKm: number }>
  detourFactor: number
  budgets: Record<PlanBudget, { label: Bi; minutes: number; hint: Bi }>
  interests: Record<string, Bi>
  places: Record<string, PlaceInfo>
  general: Bi[]
}
export const ITINERARY = itineraryJson as unknown as ItineraryData

export const DEFAULT_PLAN: PlanPrefs = { budget: 'half', interests: [], mode: 'car', accessible: false, start: 'haram', startHour: 8, skipVisited: false }

type LatLng = { lat: number; lng: number }
export interface Leg { km: number; minutes: number; mode: 'walk' | 'car'; switched: boolean }
export interface PlanStop { id: string; leg: Leg; arrive: number; leave: number; visit: number; why: string[] }
export interface PlanResult {
  stops: PlanStop[]
  travelMin: number
  visitMin: number
  breakMin: number
  /** index of the stop after which the rest/lunch break goes (-1 = none) */
  breakAfter: number
  totalMin: number
  budgetMin: number
  left: string[]
  notes: Bi[]
  start: { name: Bi; coords: LatLng }
  mapsUrl: string
}

const CAR_BUFFER = 8 // minutes to find a taxi / park
/** Below this (after the detour factor) a leg is walked even in car mode. */
const WALK_ANYWAY_KM = 0.9

export function startPoint(id: string): { name: Bi; coords: LatLng } {
  const s = ITINERARY.starts.find((x) => x.id === id)
  if (s) return { name: s.name, coords: s.coords }
  const l = SPOT_MAP[id]
  if (l) return { name: l.name, coords: l.coords }
  return { name: ITINERARY.starts[0].name, coords: ITINERARY.starts[0].coords }
}

export function legBetween(a: LatLng, b: LatLng, mode: 'walk' | 'car'): Leg {
  const km = (haversine(a, b) / 1000) * ITINERARY.detourFactor
  let m = mode
  let switched = false
  if (m === 'walk' && km > ITINERARY.modes.walk.maxLegKm) { m = 'car'; switched = true }
  if (m === 'car' && km < WALK_ANYWAY_KM) m = 'walk'
  const minutes = Math.round((km / ITINERARY.modes[m].kmh) * 60 + (m === 'car' ? CAR_BUFFER : 0))
  return { km, minutes, mode: m, switched }
}

const visitMinutes = (id: string, p: PlanPrefs) => {
  const base = ITINERARY.places[id]?.minutes ?? 20
  // step-free visit at Uhud skips the climb
  return id === 'uhud' && p.accessible ? Math.max(30, base - 15) : base
}

export function interestScore(id: string, interests: string[]) {
  const tags = ITINERARY.places[id]?.tags ?? []
  const base = 1 + interests.filter((i) => tags.includes(i)).length * 2
  // with no interests chosen, lean towards our suggested highlights
  return base + (!interests.length && tags.includes('highlights') ? 1.5 : 0)
}

/** Places that make sense as stops (not arrival points, and with itinerary info). */
export const PLANNABLE = SPOTS.filter((s) => s.category !== 'transport' && ITINERARY.places[s.id]).map((s) => s.id)

function routeCost(start: LatLng, order: string[], p: PlanPrefs) {
  let at = start
  const legs: Leg[] = []
  for (const id of order) { const c = SPOT_MAP[id].coords; legs.push(legBetween(at, c, p.mode)); at = c }
  const travel = legs.reduce((a, l) => a + l.minutes, 0)
  const visits = order.reduce((a, id) => a + visitMinutes(id, p), 0)
  const brk = p.budget === 'full' && order.length >= 3 ? 60 : 0
  return { legs, travel, total: travel + visits + brk }
}

/** 2-opt (reverse a segment) + or-opt (move one stop elsewhere) while that shortens the route. */
function twoOpt(start: LatLng, order: string[], p: PlanPrefs) {
  let best = [...order]
  let bestT = routeCost(start, best, p).travel
  let improved = true
  for (let guard = 0; improved && guard < 30; guard++) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) for (let j = i + 1; j < best.length; j++) {
      const cand = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)]
      const t = routeCost(start, cand, p).travel
      if (t < bestT) { best = cand; bestT = t; improved = true }
    }
    for (let i = 0; i < best.length; i++) for (let j = 0; j < best.length; j++) {
      if (i === j) continue
      const rest = [...best.slice(0, i), ...best.slice(i + 1)]
      const cand = [...rest.slice(0, j), best[i], ...rest.slice(j)]
      const t = routeCost(start, cand, p).travel
      if (t < bestT) { best = cand; bestT = t; improved = true }
    }
  }
  return best
}

export function buildPlan(p: PlanPrefs, visited: Partial<Record<string, boolean>> = {}): PlanResult {
  const start = startPoint(p.start)
  const budgetMin = ITINERARY.budgets[p.budget].minutes
  let pool = PLANNABLE.filter((id) => id !== p.start)
  if (p.skipVisited) pool = pool.filter((id) => !visited[id])
  // with interests chosen, leave out places that match none of them
  if (p.interests.length) {
    const matching = pool.filter((id) => interestScore(id, p.interests) > 1)
    if (matching.length) pool = matching
  }

  // greedy insertion: repeatedly add the place with the best value per extra minute
  let order: string[] = []
  let cost = routeCost(start.coords, order, p)
  for (;;) {
    let pick: { id: string; at: number; total: number; ratio: number } | null = null
    for (const id of pool) {
      if (order.includes(id)) continue
      const score = interestScore(id, p.interests)
      for (let at = 0; at <= order.length; at++) {
        const cand = [...order.slice(0, at), id, ...order.slice(at)]
        const c = routeCost(start.coords, cand, p)
        if (c.total > budgetMin) continue
        const ratio = score / Math.max(5, c.total - cost.total)
        if (!pick || ratio > pick.ratio + 1e-9) pick = { id, at, total: c.total, ratio }
      }
    }
    if (!pick) break
    order = twoOpt(start.coords, [...order.slice(0, pick.at), pick.id, ...order.slice(pick.at)], p)
    cost = routeCost(start.coords, order, p)
  }

  const legs = cost.legs
  const stops: PlanStop[] = []
  let clock = p.startHour * 60
  // lunch / rest: after the first stop that ends past 12:00 (or mid-route), only on a full day
  let breakAfter = -1
  if (p.budget === 'full' && order.length >= 3) {
    let t = p.startHour * 60
    for (let i = 0; i < order.length; i++) { t += legs[i].minutes + visitMinutes(order[i], p); if (t >= 12 * 60 && i < order.length - 1) { breakAfter = i; break } }
    if (breakAfter < 0) breakAfter = Math.floor((order.length - 1) / 2)
  }
  order.forEach((id, i) => {
    clock += legs[i].minutes
    const visit = visitMinutes(id, p)
    const why = p.interests.filter((t) => ITINERARY.places[id]?.tags.includes(t))
    stops.push({ id, leg: legs[i], arrive: clock, leave: clock + visit, visit, why })
    clock += visit
    if (i === breakAfter) clock += 60
  })

  const notes: Bi[] = []
  const month = new Date().getMonth() + 1
  const hot = month >= 5 && month <= 9
  const OUTDOOR = new Set(['uhud', 'sabaa', 'rumah', 'aqiq', 'qubaWalk', 'kingFahdPark'])
  const midday = stops.filter((s) => OUTDOOR.has(s.id) && s.arrive >= 11 * 60 && s.arrive <= 15.5 * 60)
  if (hot && midday.length) notes.push({ ar: `تصل إلى ${midday.map((s) => SPOT_MAP[s.id].name.ar).join('، ')} وقت الظهيرة في أشهر الحر — يُفضّل الصباح الباكر أو قبيل الغروب.`, en: `You reach ${midday.map((s) => SPOT_MAP[s.id].name.en).join(', ')} at midday in a hot month — early morning or near sunset is better.` })
  if (stops.some((s) => s.id === 'uhud') && p.accessible) notes.push(ITINERARY.places.uhud.access)
  if (stops.some((s) => s.leg.switched)) notes.push({ ar: 'بعض المسافات طويلة للمشي، فاقترحنا سيارة أجرة لها.', en: 'Some legs are long to walk, so a taxi is suggested for them.' })
  if (p.mode === 'car' && stops.some((s) => s.leg.mode === 'walk')) notes.push({ ar: 'المحطات المتقاربة جدًا اقترحنا المشي بينها بدل السيارة.', en: 'Stops that are very close together are walked rather than driven.' })
  if (stops.some((s) => SPOT_MAP[s.id].approx)) notes.push({ ar: 'بعض المحطات موضعها تقريبي — تحقّق منه في تطبيق الخرائط.', en: 'Some stops have approximate positions — check them in a maps app.' })

  const left = pool.filter((id) => !order.includes(id) && interestScore(id, p.interests) > 1)
  const travelMin = legs.reduce((a, l) => a + l.minutes, 0)
  const visitMin = stops.reduce((a, s) => a + s.visit, 0)
  const breakMin = breakAfter >= 0 ? 60 : 0
  return {
    stops, travelMin, visitMin, breakMin, breakAfter, totalMin: travelMin + visitMin + breakMin, budgetMin, left, notes, start,
    mapsUrl: mapsLink(start.coords, stops.map((s) => SPOT_MAP[s.id].coords), p.mode),
  }
}

export function mapsLink(origin: LatLng, stops: LatLng[], mode: 'walk' | 'car') {
  if (!stops.length) return ''
  const f = (c: LatLng) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`
  const dest = stops[stops.length - 1]
  const wp = stops.slice(0, -1).slice(0, 9).map(f).join('|')
  const q = new URLSearchParams({ api: '1', origin: f(origin), destination: f(dest), travelmode: mode === 'walk' ? 'walking' : 'driving' })
  if (wp) q.set('waypoints', wp)
  return `https://www.google.com/maps/dir/?${q.toString()}`
}

export const clockText = (minutes: number, lang: 'ar' | 'en') => {
  const h = Math.floor(minutes / 60) % 24
  const m = Math.round(minutes % 60)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: 'numeric', minute: '2-digit' })
}

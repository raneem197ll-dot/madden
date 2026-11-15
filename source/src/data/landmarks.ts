import type { Landmark, LandmarkId, PlaceCategory } from './types'
import landmarksJson from '../content/landmarks.json'
import { MAP_MAX_R, projectToCity } from '../lib/geo'

/**
 * Landmark content. Historical statements are kept to well-documented facts.
 * Every 3D model in the game is a simplified, stylised representation and is
 * labelled as such in the UI (see `modelNote`).
 */
type LandmarkJson = Omit<Landmark, 'cityPos'>
const raw = landmarksJson as unknown as LandmarkJson[]

/** Plot radius each model needs in the miniature (kept in sync with three/models). */
const clearance = (l: LandmarkJson) => l.footprint * (l.scale ?? 1) + 1.2

/**
 * Positions come from the real coordinates (see projectToCity). Where two plots would
 * overlap in the compressed miniature they are nudged apart along the line between them,
 * so relative directions stay right. The Haram stays fixed at the centre.
 */
function layout(list: LandmarkJson[]): Landmark[] {
  const pts = list.map((l) => {
    const p = l.id === 'haram' ? { x: 0, z: 0 } : projectToCity(l.coords)
    return { x: p.x, z: p.z, r: clearance(l), fixed: l.id === 'haram' }
  })
  for (let it = 0; it < 40; it++) {
    let moved = false
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j]
      const dx = b.x - a.x, dz = b.z - a.z
      const d = Math.hypot(dx, dz) || 0.001
      const need = a.r + b.r + 0.4
      if (d >= need) continue
      const push = (need - d) / 2
      const ux = dx / d, uz = dz / d
      if (!a.fixed) { a.x -= ux * push * (b.fixed ? 2 : 1); a.z -= uz * push * (b.fixed ? 2 : 1) }
      if (!b.fixed) { b.x += ux * push * (a.fixed ? 2 : 1); b.z += uz * push * (a.fixed ? 2 : 1) }
      moved = true
    }
    if (!moved) break
  }
  // far landmarks (the Miqat, the Quran complex) keep their direction but stay on the table
  for (const p of pts) {
    const r = Math.hypot(p.x, p.z), max = MAP_MAX_R - p.r - 1
    if (r > max) { p.x *= max / r; p.z *= max / r }
  }
  return list.map((l, i) => ({ ...l, cityPos: [+pts[i].x.toFixed(2), +pts[i].z.toFixed(2)] as [number, number] }))
}

export const LANDMARKS = layout(raw)

export const LANDMARK_MAP = Object.fromEntries(LANDMARKS.map((l) => [l.id, l])) as Record<LandmarkId, Landmark>
export const LANDMARK_IDS = LANDMARKS.map((l) => l.id)
export const ALL_QUIZ = LANDMARKS.flatMap((l) => l.quiz.map((q) => ({ ...q, landmarkId: l.id })))
/** Landmarks you can walk around inside (interior or courtyard scene). */
export const hasInterior = (id: LandmarkId) => LANDMARK_MAP[id].interior !== 'none'
/** Landmarks with a construction-site / build animation (everything not always shown). */
export const buildable = (id: LandmarkId) => !LANDMARK_MAP[id].alwaysBuilt

export const CATEGORY_LABEL: Record<PlaceCategory, { ar: string; en: string; icon: string }> = {
  mosque: { ar: 'مساجد', en: 'Mosques', icon: '🕌' },
  history: { ar: 'مواقع تاريخية', en: 'Historic sites', icon: '📜' },
  museum: { ar: 'متاحف ومعارض', en: 'Museums', icon: '🏛️' },
  market: { ar: 'أسواق ووسط المدينة', en: 'Markets & downtown', icon: '🛍️' },
  nature: { ar: 'طبيعة وحدائق وممشى', en: 'Nature, parks & walks', icon: '🌴' },
  transport: { ar: 'وصول ومواصلات', en: 'Getting here', icon: '🚆' },
}

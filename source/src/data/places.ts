import type { Bi, LandmarkId, Place, PlaceCategory } from './types'
import placesJson from '../content/places.json'
import { MAP_MAX_R, projectToCity } from '../lib/geo'
import { LANDMARKS, LANDMARK_MAP } from './landmarks'

/** Map-only places: no 3D model, a verified summary + sources and a clearly separate tip. */
type PlaceJson = Omit<Place, 'cityPos' | 'edge'>
/** Half-extents of the Haram plazas in the miniature (see three/models HaramModel). */
const HARAM_BOX = [7.6, 9.7]
export const PLACES: Place[] = (placesJson as unknown as PlaceJson[]).map((p) => {
  let { x, z, r } = projectToCity(p.coords)
  let edge = false
  if (r > MAP_MAX_R) { x *= MAP_MAX_R / r; z *= MAP_MAX_R / r; edge = true }
  // keep the pin off a neighbouring 3D landmark's plot (the Haram plazas are a rectangle)
  if (Math.abs(x) < HARAM_BOX[0] && Math.abs(z) < HARAM_BOX[1]) {
    const px = HARAM_BOX[0] - Math.abs(x), pz = HARAM_BOX[1] - Math.abs(z)
    if (px < pz) x = Math.sign(x || 1) * HARAM_BOX[0]
    else z = Math.sign(z || 1) * HARAM_BOX[1]
  }
  for (const l of LANDMARKS) {
    if (l.id === 'haram') continue
    const dx = x - l.cityPos[0], dz = z - l.cityPos[1]
    const d = Math.hypot(dx, dz)
    const need = l.footprint * (l.scale ?? 1) + 0.9
    if (d < need) {
      const ux = d > 0.01 ? dx / d : 1, uz = d > 0.01 ? dz / d : 0
      x = l.cityPos[0] + ux * need; z = l.cityPos[1] + uz * need
    }
  }
  return { ...p, cityPos: [+x.toFixed(2), +z.toFixed(2)] as [number, number], edge }
})
export const PLACE_MAP = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<string, Place>

/** Anything you can point at on the map: a 3D landmark or a map-only place. */
export interface Spot {
  id: string
  kind: 'landmark' | 'place'
  name: Bi
  category: PlaceCategory
  coords: { lat: number; lng: number }
  cityPos: [number, number]
  approx?: boolean
}
export const SPOTS: Spot[] = [
  ...LANDMARKS.map((l) => ({ id: l.id, kind: 'landmark' as const, name: l.name, category: l.category, coords: l.coords, cityPos: l.cityPos, approx: l.approx })),
  ...PLACES.map((p) => ({ id: p.id, kind: 'place' as const, name: p.name, category: p.category, coords: p.coords, cityPos: p.cityPos, approx: p.approx })),
]
export const SPOT_MAP = Object.fromEntries(SPOTS.map((s) => [s.id, s])) as Record<string, Spot>
export const isLandmarkId = (id: string): id is LandmarkId => id in LANDMARK_MAP

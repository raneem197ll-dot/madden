export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export type GeoResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout' }

export function getPosition(timeoutMs = 10000): Promise<GeoResult> {
  return new Promise((resolve) => {
    try {
      if (!('geolocation' in navigator)) return resolve({ ok: false, reason: 'unsupported' })
      const timer = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs + 1500)
      navigator.geolocation.getCurrentPosition(
        (p) => {
          clearTimeout(timer)
          resolve({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })
        },
        (err) => {
          clearTimeout(timer)
          resolve({ ok: false, reason: err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable' })
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
      )
    } catch {
      resolve({ ok: false, reason: 'unavailable' })
    }
  })
}

/* ---------------- real map → miniature city ---------------- */

/** Centre of the miniature: the Prophet's Mosque. */
export const CITY_CENTER = { lat: 24.46833, lng: 39.61083 }
const MAP_K = 24
const MAP_D0 = 0.8 // km
/** Outermost radius anything is drawn at (the diorama edge is a little further). */
export const MAP_MAX_R = 61

/**
 * Bearing-true, distance-compressed projection: directions from the Haram are real,
 * distances shrink logarithmically (r = 24·ln(1 + km/0.8)) so the dense centre gets room
 * and places 10+ km out still fit on the table. North is −z, east is +x.
 */
export function projectToCity(c: { lat: number; lng: number }): { x: number; z: number; km: number; r: number } {
  const n = (c.lat - CITY_CENTER.lat) * 111.32
  const e = (c.lng - CITY_CENTER.lng) * 111.32 * Math.cos((CITY_CENTER.lat * Math.PI) / 180)
  const km = Math.hypot(n, e)
  if (km < 0.02) return { x: 0, z: 0, km, r: 0 }
  const r = MAP_K * Math.log(1 + km / MAP_D0)
  return { x: (e / km) * r, z: (-n / km) * r, km, r }
}

/** Inverse of the radial compression: miniature radius → real km from the Haram (for scale bars). */
export const cityRadiusToKm = (r: number) => MAP_D0 * (Math.exp(r / MAP_K) - 1)

/** Straight-line km from the Prophet's Mosque. */
export const kmFromHaram = (c: { lat: number; lng: number }) => haversine(CITY_CENTER, c) / 1000

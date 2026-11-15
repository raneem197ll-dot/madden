import * as THREE from 'three'

/**
 * Frame-shared environment values. Mutated inside useFrame, read by other
 * useFrame callbacks — never by React render, so there are no re-renders.
 */
export const env = {
  /** 0 = full day, 1 = full night (smoothed glow factor) */
  night: 0,
  time: 0,
  /** current displayed hour 0–24 */
  hour: 10.5,
  weather: 'clear' as 'clear' | 'cloudy' | 'rain',
}

/** Materials whose glow follows the day/night cycle. */
export const glowMaterials = new Set<{ m: THREE.MeshStandardMaterial; day: number; night: number }>()

export function registerGlow(m: THREE.MeshStandardMaterial, day: number, night: number) {
  const entry = { m, day, night }
  glowMaterials.add(entry)
  return () => { glowMaterials.delete(entry) }
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** deterministic pseudo random */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

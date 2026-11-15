import * as THREE from 'three'
import type { Weather } from '../../data/types'

/** Lighting keyframes across a Madinah day (hour → look). */
interface Key { h: number; top: string; bot: string; sun: string; si: number; hs: string; hg: string; hi: number; fog: string; glow: number }
const K: Key[] = [
  { h: 0, top: '#06102a', bot: '#1b2340', sun: '#9fb4ff', si: 0.6, hs: '#2d3a66', hg: '#14141e', hi: 0.55, fog: '#151c36', glow: 1 },
  { h: 4.8, top: '#0b1838', bot: '#2a2f52', sun: '#9fb4ff', si: 0.55, hs: '#33416e', hg: '#191a26', hi: 0.55, fog: '#1c2440', glow: 1 },
  { h: 5.7, top: '#3b4f86', bot: '#e9a27a', sun: '#ffb07a', si: 0.9, hs: '#8a90b8', hg: '#6b4d3c', hi: 0.65, fog: '#c99b84', glow: 0.7 },
  { h: 6.6, top: '#6f9fd0', bot: '#f6c48f', sun: '#ffc08a', si: 1.6, hs: '#b9cde6', hg: '#b08a62', hi: 0.85, fog: '#efc9a0', glow: 0.25 },
  { h: 8.5, top: '#7fb6d9', bot: '#f6dfb7', sun: '#fff1d6', si: 2.5, hs: '#cfe6f5', hg: '#d9b98a', hi: 1.1, fog: '#f1dcb8', glow: 0 },
  { h: 12, top: '#6aaee0', bot: '#f3e2c0', sun: '#fff6e6', si: 2.8, hs: '#d5ebf8', hg: '#dcbf92', hi: 1.15, fog: '#f2e0bf', glow: 0 },
  { h: 15.5, top: '#7fb2d6', bot: '#f5d9ae', sun: '#ffe9c4', si: 2.5, hs: '#cfe2f0', hg: '#d6b385', hi: 1.05, fog: '#f0d6ae', glow: 0 },
  { h: 17.3, top: '#6b86b8', bot: '#f2a868', sun: '#ff9f5a', si: 1.9, hs: '#c7a9a8', hg: '#a5704a', hi: 0.85, fog: '#e8a877', glow: 0.3 },
  { h: 18.3, top: '#2e3b6e', bot: '#d9785a', sun: '#ff7f50', si: 0.9, hs: '#7a6a90', hg: '#4a3530', hi: 0.6, fog: '#8e5d5a', glow: 0.75 },
  { h: 19.5, top: '#0a1534', bot: '#2b3254', sun: '#9fb4ff', si: 0.6, hs: '#33406e', hg: '#1c1d2a', hi: 0.55, fog: '#1c2440', glow: 1 },
  { h: 24, top: '#06102a', bot: '#1b2340', sun: '#9fb4ff', si: 0.6, hs: '#2d3a66', hg: '#14141e', hi: 0.55, fog: '#151c36', glow: 1 },
]
const KC = K.map((k) => ({ ...k, cTop: new THREE.Color(k.top), cBot: new THREE.Color(k.bot), cSun: new THREE.Color(k.sun), cHs: new THREE.Color(k.hs), cHg: new THREE.Color(k.hg), cFog: new THREE.Color(k.fog) }))

export interface EnvSample {
  top: THREE.Color; bot: THREE.Color; sun: THREE.Color; hs: THREE.Color; hg: THREE.Color; fog: THREE.Color
  si: number; hi: number; glow: number; sunDir: THREE.Vector3; isMoon: boolean
}

const out: EnvSample = {
  top: new THREE.Color(), bot: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), fog: new THREE.Color(),
  si: 1, hi: 1, glow: 0, sunDir: new THREE.Vector3(0, 1, 0), isMoon: false,
}
const GREY_TOP = new THREE.Color('#9aa5b1'), GREY_BOT = new THREE.Color('#d6d1c8'), RAIN_TOP = new THREE.Color('#6f7a86'), RAIN_BOT = new THREE.Color('#a9a69f')

export function sampleEnv(hour: number, weather: Weather): EnvSample {
  const h = ((hour % 24) + 24) % 24
  let i = 0
  while (i < KC.length - 2 && KC[i + 1].h <= h) i++
  const a = KC[i], b = KC[i + 1]
  const t = THREE.MathUtils.smoothstep(h, a.h, b.h)
  out.top.lerpColors(a.cTop, b.cTop, t)
  out.bot.lerpColors(a.cBot, b.cBot, t)
  out.sun.lerpColors(a.cSun, b.cSun, t)
  out.hs.lerpColors(a.cHs, b.cHs, t)
  out.hg.lerpColors(a.cHg, b.cHg, t)
  out.fog.lerpColors(a.cFog, b.cFog, t)
  out.si = THREE.MathUtils.lerp(a.si, b.si, t)
  out.hi = THREE.MathUtils.lerp(a.hi, b.hi, t)
  out.glow = THREE.MathUtils.lerp(a.glow, b.glow, t)

  // sun arcs east (+x) → west (−x); the moon takes over at night
  const theta = ((h - 6) / 12) * Math.PI
  out.isMoon = theta < 0.05 || theta > Math.PI - 0.05
  const ang = out.isMoon ? theta - Math.PI : theta
  const el = Math.max(0.16, Math.sin(ang))
  out.sunDir.set(Math.cos(ang) * 0.9, el, 0.42).normalize()

  if (weather !== 'clear') {
    const k = weather === 'rain' ? 0.62 : 0.32
    out.top.lerp(weather === 'rain' ? RAIN_TOP : GREY_TOP, k * (1 - out.glow * 0.6))
    out.bot.lerp(weather === 'rain' ? RAIN_BOT : GREY_BOT, k * (1 - out.glow * 0.6))
    out.fog.lerp(weather === 'rain' ? RAIN_BOT : GREY_BOT, k * 0.8 * (1 - out.glow * 0.6))
    out.si *= weather === 'rain' ? 0.45 : 0.7
    out.glow = Math.min(1, out.glow + (weather === 'rain' ? 0.18 : 0.05))
  }
  return out
}

/** Current hour in Madinah (Asia/Riyadh) for "live" mode. */
export function madinahHour(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
    const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 12)
    const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
    return (hh % 24) + mm / 60
  } catch {
    const d = new Date()
    return (d.getUTCHours() + 3 + d.getUTCMinutes() / 60) % 24
  }
}

export const PHASES = [
  { id: 'sunrise', hour: 6.4, icon: '🌅', ar: 'شروق', en: 'Sunrise' },
  { id: 'day', hour: 11, icon: '☀️', ar: 'نهار', en: 'Day' },
  { id: 'sunset', hour: 17.6, icon: '🌇', ar: 'غروب', en: 'Sunset' },
  { id: 'night', hour: 21.5, icon: '🌙', ar: 'ليل', en: 'Night' },
] as const

export function phaseOf(h: number) {
  if (h >= 5.5 && h < 8) return PHASES[0]
  if (h >= 8 && h < 16.5) return PHASES[1]
  if (h >= 16.5 && h < 19) return PHASES[2]
  return PHASES[3]
}

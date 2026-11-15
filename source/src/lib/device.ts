import type { QualityMode, Tier } from '../data/types'

/**
 * Device capability → graphics tier. Uses only what the browser exposes:
 * GPU renderer string (when allowed), CPU cores, device memory, screen size and pixel ratio.
 */
export interface DeviceInfo {
  tier: Tier
  gpu: string
  cores: number
  memory: number | null
  dpr: number
  reason: string
}

const LOW_GPU = /swiftshader|llvmpipe|software|mali-4|mali-t[6-8]|adreno \(tm\) [2-4]\d\d|powervr sgx|intel\(r\) hd graphics [2-4]\d{3}|gma/i

let cached: DeviceInfo | null = null
export function detectDevice(): DeviceInfo {
  if (cached) return cached
  let gpu = ''
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    gpu = (ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '') || ''
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* not exposed */ }
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? null
  const dpr = window.devicePixelRatio ?? 1
  const minSide = Math.min(window.innerWidth, window.innerHeight)
  let tier: Tier = 'high'
  let reason = 'capable device'
  if (LOW_GPU.test(gpu)) { tier = 'low'; reason = 'software or older GPU' }
  else if (cores <= 4 && (memory ?? 4) <= 3) { tier = 'low'; reason = 'few cores / little memory' }
  else if (minSide < 500 && !((memory ?? 0) >= 6 && cores >= 8)) { tier = 'medium'; reason = 'phone-class device' }
  cached = { tier, gpu, cores, memory, dpr, reason }
  return cached
}

export const TIER_ORDER: Tier[] = ['low', 'medium', 'high']

/** What each tier turns on. */
export const TIER_SETTINGS: Record<Tier, { shadows: boolean; maxDpr: number; life: number; birds: boolean; rain: number }> = {
  high: { shadows: true, maxDpr: 1.75, life: 1, birds: true, rain: 1 },
  medium: { shadows: false, maxDpr: 1.5, life: 0.75, birds: true, rain: 0.7 },
  low: { shadows: false, maxDpr: 1, life: 0.45, birds: false, rain: 0.45 },
}

export function resolveTier(mode: QualityMode): Tier {
  return mode === 'auto' ? detectDevice().tier : mode
}

export function dprFor(tier: Tier) {
  return Math.min(window.devicePixelRatio ?? 1, TIER_SETTINGS[tier].maxDpr)
}

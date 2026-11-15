import type { Bi, LandmarkId } from '../data/types'
import { LANDMARK_MAP } from '../data/landmarks'
import { NARRATION } from '../data/narration'

/**
 * AR integration — ARCHITECTURE ONLY (not active).
 *
 * The game keeps AR behind this module so a real implementation can be added
 * without touching gameplay code:
 *   1. `detectAR()` reports what the current device/browser/frame supports.
 *   2. `arContentFor()` describes what an AR session would show for a landmark:
 *      the same 3D model used in the city, its real-world geo anchor, and
 *      information overlays (all derived from verified landmark content).
 *   3. `AR_ADAPTERS` lists the planned back-ends. None is enabled yet; each
 *      declares what it needs. `start()` deliberately throws until implemented.
 */

export interface ARSupport {
  webxrAR: boolean | 'unknown'
  hitTest: boolean | 'unknown'
  camera: boolean
  secureContext: boolean
  inFrame: boolean
  platform: 'ios' | 'android' | 'desktop'
}

export async function detectAR(): Promise<ARSupport> {
  const nav = navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }
  let webxrAR: ARSupport['webxrAR'] = 'unknown'
  try {
    webxrAR = nav.xr ? await Promise.race([nav.xr.isSessionSupported('immersive-ar'), new Promise<boolean>((r) => setTimeout(() => r(false), 2000))]) : false
  } catch {
    webxrAR = false
  }
  const ua = navigator.userAgent
  let inFrame = false
  try { inFrame = window.self !== window.top } catch { inFrame = true }
  return {
    webxrAR,
    hitTest: webxrAR === true ? 'unknown' : false,
    camera: !!navigator.mediaDevices?.getUserMedia,
    secureContext: window.isSecureContext,
    inFrame,
    platform: /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop',
  }
}

export interface GeoAnchor { lat: number; lng: number; radiusM: number }
export interface AROverlay { id: string; title: Bi; body: Bi }
export interface ARContent {
  landmark: LandmarkId
  /** in-game model id (same procedural model as the city) */
  model: LandmarkId
  /** suggested real-world size of the tabletop model, in metres */
  tabletopSizeM: number
  anchor: GeoAnchor
  overlays: AROverlay[]
  narration: Bi
}

export function arContentFor(id: LandmarkId): ARContent {
  const lm = LANDMARK_MAP[id]
  return {
    landmark: id,
    model: id,
    tabletopSizeM: id === 'uhud' ? 0.8 : 0.5,
    anchor: { lat: lm.coords.lat, lng: lm.coords.lng, radiusM: lm.radiusM },
    overlays: lm.facts.map((f, i) => ({ id: `${id}-fact-${i}`, title: f.label, body: f.value })),
    narration: NARRATION[id],
  }
}

export interface ARAdapter {
  id: 'webxr-tabletop' | 'native-viewer' | 'geo-overlay'
  name: Bi
  needs: Bi
  status: 'planned'
  start(content: ARContent): Promise<never>
}

const notYet = async (): Promise<never> => { throw new Error('AR adapter not implemented yet') }

export const AR_ADAPTERS: ARAdapter[] = [
  {
    id: 'webxr-tabletop', status: 'planned', start: notYet,
    name: { ar: 'مجسّم على الطاولة (WebXR)', en: 'Tabletop model (WebXR)' },
    needs: { ar: 'متصفح يدعم WebXR AR (مثل كروم على أندرويد) وصفحة غير مضمّنة في إطار', en: 'A browser with WebXR AR (e.g. Chrome on Android) and a page not embedded in a frame' },
  },
  {
    id: 'native-viewer', status: 'planned', start: notYet,
    name: { ar: 'عارض الجهاز (Quick Look / Scene Viewer)', en: 'Device viewer (Quick Look / Scene Viewer)' },
    needs: { ar: 'تصدير النماذج إلى ملفات glTF/USDZ', en: 'Exporting the models to glTF/USDZ files' },
  },
  {
    id: 'geo-overlay', status: 'planned', start: notYet,
    name: { ar: 'معلومات فوق الموقع الحقيقي', en: 'Information over the real site' },
    needs: { ar: 'إذن الكاميرا والموقع وتتبّع الاتجاه في تطبيق مستقل', en: 'Camera, location and orientation access in a standalone app' },
  },
]

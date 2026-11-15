import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../state/gameStore'
import { CityWorld } from './city/CityWorld'
import { InteriorWorld } from './interior/InteriorWorld'
import { TIER_ORDER, detectDevice, dprFor } from '../lib/device'

/** In "auto" quality, step the tier down when frames drop and back up (to the device's cap) when there's headroom. */
function AdaptiveQuality() {
  const cap = useMemo(() => TIER_ORDER.indexOf(detectDevice().tier), [])
  const step = (dir: -1 | 1) => {
    const g = useGame.getState()
    if (g.quality !== 'auto') return
    const i = TIER_ORDER.indexOf(g.tier) + dir
    if (i < 0 || i > cap) return
    const tier = TIER_ORDER[i]
    g.setUi({ tier, dpr: dprFor(tier) })
  }
  return <PerformanceMonitor flipflops={4} onDecline={() => step(-1)} onIncline={() => step(1)} onFallback={() => step(-1)} />
}

/** One WebGL context for the whole game; scenes swap inside it. */
export function GameCanvas() {
  const mode = useGame((s) => s.mode)
  const interiorId = useGame((s) => s.interiorId)
  const nonce = useGame((s) => s.interiorNonce)
  const paused = useGame((s) => (s.mode === 'city' && s.tab !== 'city' && !s.replay.active) || s.panel === 'ar' || s.panel === 'thenNow')
  const dpr = useGame((s) => s.dpr)
  // antialiasing is fixed when the context is created: skip it on low-tier devices
  const antialias = useMemo(() => detectDevice().tier !== 'low', [])
  return (
    <Canvas
      shadows="percentage"
      dpr={dpr}
      frameloop={paused ? 'demand' : 'always'}
      gl={{ antialias, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 38, near: 0.1, far: 900, position: [20, 60, 70] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__gl = gl
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <AdaptiveQuality />
      <Suspense fallback={null}>
        {mode === 'city' ? <CityWorld /> : interiorId ? <InteriorWorld key={`${interiorId}-${nonce}`} id={interiorId} /> : null}
      </Suspense>
    </Canvas>
  )
}

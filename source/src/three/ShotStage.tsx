import { useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGame } from '../state/gameStore'
import { LANDMARK_IDS, LANDMARK_MAP } from '../data/landmarks'
import type { LandmarkId } from '../data/types'
import { MODELS } from './models'
import { DayNight } from './city/DayNight'
import { CityEnvironment } from './city/CityEnvironment'
import { LandmarkSlot } from './city/LandmarkSlot'

/** Dev-only stage used at build time to capture the in-game model snapshots. */
const AZ: Partial<Record<LandmarkId, number[]>> = {
  quba: [0.7, -0.6, 2.5],
  hejaz: [0.35, -0.45, 0.8],
  qiblatain: [3.5, 0.6, 2.7],
  uhud: [0.15, -0.4, 0.55],
}

function Rig({ id, view }: { id: LandmarkId; view: number }) {
  const { camera } = useThree()
  useFrame(() => {
    const lm = LANDMARK_MAP[id]
    const base = new THREE.Vector3(lm.cityPos[0], MODELS[id].focusY * 0.8, lm.cityPos[1])
    const dist = (lm.footprint * 2.5 + 6) * (view === 1 ? 1.25 : 1)
    const polar = view === 1 ? 0.62 : view === 2 ? 1.12 : 1.02
    const az = AZ[id]?.[view] ?? 0.5 + view * 1.3
    camera.position.set(base.x + Math.sin(polar) * Math.sin(az) * dist, base.y + Math.cos(polar) * dist, base.z + Math.sin(polar) * Math.cos(az) * dist)
    camera.lookAt(base)
  })
  return null
}

export function ShotStage({ id, view }: { id: LandmarkId; view: number }) {
  useEffect(() => {
    const progress = Object.fromEntries(LANDMARK_IDS.map((k) => [k, { unlocked: true, visitDate: new Date().toISOString() }]))
    useGame.setState({ progress: progress as never, night: view === 2, hour: view === 2 ? 21.5 : 10.5, timeMode: 'manual', weather: 'clear', onboarded: true })
  }, [view])
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows="percentage" dpr={1} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: 40, near: 0.1, far: 900 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
        <DayNight />
        <CityEnvironment />
        {LANDMARK_IDS.map((k) => <LandmarkSlot key={k} lm={LANDMARK_MAP[k]} />)}
        <Rig id={id} view={view} />
      </Canvas>
    </div>
  )
}

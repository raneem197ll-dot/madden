import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { LANDMARK_MAP } from '../data/landmarks'
import { MODELS } from '../three/models'
import { HejazEra } from '../three/models/HejazModel'
import { reducedMotion } from '../lib/a11y'

/** Interactive 3D model viewer (AR preview, Then & Now). `era` drives the Hejaz 1908 ↔ today view. */
export function ModelViewer({ id, era, background = '#f4ead7' }: { id: keyof typeof MODELS; era?: { current: number }; background?: string }) {
  const M = MODELS[id].Component
  const r = LANDMARK_MAP[id].footprint
  const model = <group position={[0, 0, id === 'uhud' ? 2 : 0]}><M /></group>
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 35, position: [r * 2.6, r * 2.2, r * 3.2] }} gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping }} style={{ touchAction: 'none' }}
      aria-label="3D model">
      <color attach="background" args={[background]} />
      <hemisphereLight args={['#dfeefa', '#c9a77a', 1.1]} />
      <directionalLight position={[8, 12, 6]} intensity={2.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[r * 1.8, 48]} />
        <meshStandardMaterial color="#e2cc9f" />
      </mesh>
      {era ? <HejazEra.Provider value={era}>{model}</HejazEra.Provider> : model}
      <OrbitControls makeDefault autoRotate={!reducedMotion()} autoRotateSpeed={0.8} enablePan={false} minDistance={r * 1.2} maxDistance={r * 7} maxPolarAngle={1.45} target={[0, 1, 0]} />
    </Canvas>
  )
}

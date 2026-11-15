import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../../state/gameStore'
import { LANDMARK_MAP } from '../../data/landmarks'
import type { LandmarkId } from '../../data/types'
import { clamp01, easeInOut } from '../shared/env'

const point = (id: LandmarkId | 'start') =>
  id === 'start' ? new THREE.Vector3(0, 0.3, 0) : new THREE.Vector3(LANDMARK_MAP[id].cityPos[0], 0.3, LANDMARK_MAP[id].cityPos[1])

const routeMat = new THREE.MeshStandardMaterial({ color: '#e8c25f', emissive: '#e0a93a', emissiveIntensity: 0.9, roughness: 0.4 })
const headMat = new THREE.MeshBasicMaterial({ color: '#fff4cf' })

function Segment({ from, to, t0 }: { from: LandmarkId | 'start'; to: LandmarkId; t0: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const head = useRef<THREE.Mesh>(null)
  const { geo, curve } = useMemo(() => {
    const a = point(from), b = point(to)
    const mid = a.clone().lerp(b, 0.5)
    mid.y = 1.5 + a.distanceTo(b) * 0.28
    const c = new THREE.QuadraticBezierCurve3(a, mid, b)
    return { geo: new THREE.TubeGeometry(c, 80, 0.13, 6, false), curve: c }
  }, [from, to])
  useFrame(() => {
    const t = easeInOut(clamp01((performance.now() - t0) / 1300))
    const total = geo.index ? geo.index.count : 0
    geo.setDrawRange(0, Math.floor((total * t) / 36) * 36)
    if (head.current) {
      head.current.visible = t > 0 && t < 1
      head.current.position.copy(curve.getPoint(t))
    }
  })
  return (
    <group>
      <mesh ref={mesh} geometry={geo} material={routeMat} frustumCulled={false} />
      <mesh ref={head} material={headMat}><sphereGeometry args={[0.32, 12, 8]} /></mesh>
    </group>
  )
}

export function ReplayRoute() {
  const route = useGame((s) => s.replay.route)
  const active = useGame((s) => s.replay.active)
  if (!active) return null
  return (
    <group>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.95, 32]} />
        <meshBasicMaterial color="#e8c25f" />
      </mesh>
      {route.map((s, i) => <Segment key={i} {...s} />)}
    </group>
  )
}

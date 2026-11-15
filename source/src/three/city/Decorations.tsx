import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { useGame, usePoints } from '../../state/gameStore'
import { DECORATIONS } from '../../data/progression'
import { DECOR_ZONES, RAIL_LINE, ROADS, pointAt } from './layout'
import { ribbonGeometry } from './CityEnvironment'
import { MAT } from '../shared/materials'
import { env, registerGlow, rng } from '../shared/env'
import { PalmInstances } from './CityEnvironment'
import { Carriage, Locomotive } from '../models/Train'

function Oasis() {
  const { x, z, r } = DECOR_ZONES.oasis
  const palms = useMemo(() => {
    const rr = rng(31)
    return Array.from({ length: 16 }, () => {
      const a = rr() * 6.28, d = r * (0.55 + rr() * 0.45)
      return { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, h: 1.0 + rr() * 0.7, s: 0.6 + rr() * 0.25, rot: rr() * 6.28 }
    })
  }, [x, z, r])
  return (
    <group>
      <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.grass} receiveShadow>
        <circleGeometry args={[r, 32]} />
      </mesh>
      <mesh position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.water}>
        <circleGeometry args={[r * 0.42, 28]} />
      </mesh>
      <PalmInstances points={palms} />
    </group>
  )
}

function Fountain() {
  const jets = useRef<THREE.Group>(null)
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bfe6f0', transparent: true, opacity: 0.55, roughness: 0.1, emissive: '#5fb7cf', emissiveIntensity: 0.1 }), [])
  useEffect(() => registerGlow(water, 0.05, 0.8), [water])
  useFrame(() => {
    jets.current?.children.forEach((c, i) => {
      const s = 1 + Math.sin(env.time * 4 + i) * 0.12
      c.scale.set(1, s, 1)
    })
  })
  const { x: fx, z: fz } = DECOR_ZONES.fountain
  return (
    <group position={[fx, 0, fz]} scale={0.8}>
      <mesh position={[0, 0.12, 0]} material={MAT.marble} castShadow receiveShadow><cylinderGeometry args={[1.5, 1.6, 0.24, 32]} /></mesh>
      <mesh position={[0, 0.25, 0]} material={MAT.water}><cylinderGeometry args={[1.35, 1.35, 0.04, 32]} /></mesh>
      <mesh position={[0, 0.55, 0]} material={MAT.marble} castShadow><cylinderGeometry args={[0.18, 0.28, 0.7, 12]} /></mesh>
      <mesh position={[0, 0.92, 0]} material={MAT.marble} castShadow><cylinderGeometry args={[0.7, 0.5, 0.12, 24]} /></mesh>
      <mesh position={[0, 1.06, 0]} material={MAT.gold}><sphereGeometry args={[0.12, 12, 8]} /></mesh>
      <group ref={jets}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.95, 0.5, Math.sin(a) * 0.95]} material={water}>
              <coneGeometry args={[0.06, 0.55, 6]} />
            </mesh>
          )
        })}
        <mesh position={[0, 1.45, 0]} material={water}><coneGeometry args={[0.1, 0.8, 8]} /></mesh>
      </group>
      <Sparkles count={20} scale={[2.4, 1.6, 2.4]} position={[0, 0.9, 0]} size={2.5} speed={0.6} color="#dff6ff" />
    </group>
  )
}

/** A small steam train running back and forth on the Hejaz line out of Madinah station. */
function MiniTrain() {
  const train = useRef<THREE.Group>(null)
  const smoke = useRef<THREE.Group>(null)
  const smokeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1ece3', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }), [])
  const bed = useMemo(() => ribbonGeometry(RAIL_LINE.pts, 0.9), [])
  const rails = useMemo(() => [ribbonGeometry(RAIL_LINE.pts.map(([x, z], i, a) => { const n = a[Math.min(i + 1, a.length - 1)], q = a[Math.max(i - 1, 0)]; const dx = n[0] - q[0], dz = n[1] - q[1], l = Math.hypot(dx, dz) || 1; return [x - (dz / l) * 0.13, z + (dx / l) * 0.13] }), 0.04),
    ribbonGeometry(RAIL_LINE.pts.map(([x, z], i, a) => { const n = a[Math.min(i + 1, a.length - 1)], q = a[Math.max(i - 1, 0)]; const dx = n[0] - q[0], dz = n[1] - q[1], l = Math.hypot(dx, dz) || 1; return [x + (dz / l) * 0.13, z - (dx / l) * 0.13] }), 0.04)], [])
  const sleepers = useMemo(() => Array.from({ length: Math.floor(RAIL_LINE.len / 0.5) }, (_, i) => pointAt(RAIL_LINE, (i * 0.5) / RAIL_LINE.len)), [])
  const t = useRef(0.02)
  const dir = useRef(1)
  useFrame((_, dt) => {
    t.current += (dt * 1.1 * dir.current) / RAIL_LINE.len
    if (t.current > 0.97) dir.current = -1
    if (t.current < 0.02) dir.current = 1
    const cars = train.current?.children ?? []
    cars.forEach((c, i) => {
      const p = pointAt(RAIL_LINE, Math.max(0, t.current - (i * 0.95 * dir.current) / RAIL_LINE.len))
      c.position.set(p.x, 0.08, p.z)
      c.rotation.y = Math.atan2(-p.uz, p.ux) + (dir.current < 0 ? Math.PI : 0)
    })
    smoke.current?.children.forEach((s, i) => {
      const k = ((env.time * 0.7 + i / 6) % 1)
      const p = pointAt(RAIL_LINE, t.current)
      s.position.set(p.x - p.ux * k * 0.4 * dir.current, 1.0 + k * 1.2, p.z - p.uz * k * 0.4 * dir.current)
      s.scale.setScalar(0.12 + k * 0.35)
    })
  })
  return (
    <group>
      <mesh geometry={bed} position={[0, 0.03, 0]} material={MAT.sandDark} receiveShadow />
      <instancedMesh
        ref={(im) => {
          if (!im) return
          const o = new THREE.Object3D()
          sleepers.forEach((p, i) => { o.position.set(p.x, 0.05, p.z); o.rotation.set(0, Math.atan2(-p.uz, p.ux) + Math.PI / 2, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix) })
          im.instanceMatrix.needsUpdate = true
          im.computeBoundingSphere()
        }}
        args={[undefined, MAT.woodDark, sleepers.length]}
      >
        <boxGeometry args={[0.5, 0.04, 0.09]} />
      </instancedMesh>
      {rails.map((g, i) => <mesh key={i} geometry={g} position={[0, 0.08, 0]} material={MAT.iron} />)}
      <group ref={train}>
        <group><group rotation={[0, Math.PI / 2, 0]} scale={0.13}><Locomotive /></group></group>
        <group><group rotation={[0, Math.PI / 2, 0]} scale={0.13}><Carriage /></group></group>
        <group><group rotation={[0, Math.PI / 2, 0]} scale={0.13}><Carriage /></group></group>
      </group>
      <group ref={smoke}>
        {Array.from({ length: 6 }).map((_, i) => <mesh key={i} material={smokeMat}><icosahedronGeometry args={[1, 0]} /></mesh>)}
      </group>
    </group>
  )
}

function Lanterns() {
  const lanterns = useRef<THREE.InstancedMesh>(null)
  const posts = useRef<THREE.InstancedMesh>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5c463', emissive: '#ffb347', emissiveIntensity: 0.3, roughness: 0.6 }), [])
  useEffect(() => registerGlow(mat, 0.25, 4), [mat])
  // festive lanterns along the inner side of the first ring road (King Faisal Road)
  const pts = useMemo(() => {
    const r1 = ROADS[0]
    return Array.from({ length: 64 }, (_, i) => {
      const p = pointAt(r1, i / 64)
      const nx = -p.uz, nz = p.ux
      const sgn = nx * p.x + nz * p.z > 0 ? -1 : 1
      return { x: p.x + nx * sgn * (r1.w / 2 + 0.3), z: p.z + nz * sgn * (r1.w / 2 + 0.3) }
    })
  }, [])
  useEffect(() => {
    const o = new THREE.Object3D()
    pts.forEach((p, i) => {
      o.position.set(p.x, 0.32, p.z); o.updateMatrix(); posts.current?.setMatrixAt(i, o.matrix)
      o.position.set(p.x, 0.7, p.z); o.updateMatrix(); lanterns.current?.setMatrixAt(i, o.matrix)
    })
    for (const im of [posts.current, lanterns.current]) if (im) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }
  }, [pts])
  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, MAT.brass, pts.length]}><cylinderGeometry args={[0.02, 0.025, 0.64, 5]} /></instancedMesh>
      <instancedMesh ref={lanterns} args={[undefined, mat, pts.length]}><octahedronGeometry args={[0.11, 0]} /></instancedMesh>
    </group>
  )
}

function Market() {
  const { x, z } = DECOR_ZONES.market
  const colors = ['#b5402f', '#1f6b4f', '#c9a24a', '#2d5b8a', '#8a3d6b']
  return (
    <group position={[x, 0, z]} rotation={[0, 0.6, 0]}>
      {[-1.6, -0.55, 0.5, 1.55].map((sx, i) => (
        <group key={i} position={[sx, 0, 0]}>
          <mesh position={[0, 0.2, 0]} material={MAT.wood} castShadow><boxGeometry args={[0.85, 0.4, 0.6]} /></mesh>
          {[-0.38, 0.38].map((px) => <mesh key={px} position={[px, 0.5, -0.25]} material={MAT.woodDark}><boxGeometry args={[0.04, 0.9, 0.04]} /></mesh>)}
          <mesh position={[0, 0.95, 0]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.95, 0.03, 0.8]} />
            <meshStandardMaterial color={colors[i % colors.length]} roughness={0.9} />
          </mesh>
          {[-0.22, 0, 0.22].map((bx) => (
            <mesh key={bx} position={[bx, 0.45, 0.1]} material={MAT.woodDark}><cylinderGeometry args={[0.09, 0.07, 0.08, 10]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function Decorations() {
  const enabled = useGame((s) => s.decorations)
  const snapshot = useGame((s) => s)
  const points = usePoints()
  const replay = useGame((s) => s.replay.active)
  const visiting = useGame((s) => s.visiting)
  const on = (id: string) => {
    if (visiting) return visiting.decorations.includes(id)
    const d = DECORATIONS.find((x) => x.id === id)!
    return !!enabled[id] && d.isUnlocked(snapshot, points)
  }
  if (replay) return null
  return (
    <group>
      {on('palms') && <Oasis />}
      {on('fountain') && <Fountain />}
      {on('train') && <MiniTrain />}
      {on('lanterns') && <Lanterns />}
      {on('market') && <Market />}
    </group>
  )
}

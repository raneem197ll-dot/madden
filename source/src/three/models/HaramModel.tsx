import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ArchRow, Box, BuildPart, Cyl, Dome, DomeField, Minaret } from '../shared/parts'
import { useMats } from '../shared/materials'
import { clamp01, env } from '../shared/env'

export const HARAM_PARTS = 5

type V3 = [number, number, number]

/** Plaza umbrella positions: bands around the building (the model shows fewer than the real 250). */
export const UMBRELLA_POINTS: [number, number][] = (() => {
  const pts: [number, number][] = []
  const step = 1.15
  for (let x = -6.3; x <= 6.35; x += step) for (let z = -8.6; z <= 8.65; z += step) {
    const inBuilding = Math.abs(x) < 4.05 && z > -5.45 && z < 5.75
    if (inBuilding) continue
    if (Math.abs(x) < 0.7 && z < -5.4) continue // main north gate approach stays open
    pts.push([+x.toFixed(2), +z.toFixed(2)])
  }
  return pts
})()

/** Retractable umbrellas as two instanced meshes; they fold at night. */
export function Umbrellas({ points, scale = 1, pole = 0.95, poleR = 0.04 }: { points: [number, number][]; scale?: number; pole?: number; poleR?: number }) {
  const M = useMats()
  const canopy = useRef<THREE.InstancedMesh>(null)
  const poles = useRef<THREE.InstancedMesh>(null)
  const open = useRef(-1)
  const canopyGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.72 * scale, 0.26 * scale, 4, 1, true)
    g.rotateY(Math.PI / 4)
    return g
  }, [scale])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const target = 1 - clamp01((env.night - 0.35) / 0.4)
    const cur = open.current < 0 ? target : open.current + (target - open.current) * 0.05
    if (Math.abs(cur - open.current) < 0.0005) return
    open.current = cur
    const c = canopy.current, p = poles.current
    if (!c || !p) return
    const s = 0.12 + cur * 0.88
    points.forEach(([x, z], i) => {
      o.position.set(x, pole * scale + 0.1 * scale * cur, z); o.rotation.set(0, 0, 0)
      o.scale.set(s, 1 + (1 - cur) * 2.4, s); o.updateMatrix(); c.setMatrixAt(i, o.matrix)
      o.position.set(x, (pole * scale) / 2, z); o.scale.set(1, 1, 1); o.updateMatrix(); p.setMatrixAt(i, o.matrix)
    })
    c.instanceMatrix.needsUpdate = true
    p.instanceMatrix.needsUpdate = true
    c.computeBoundingSphere(); p.computeBoundingSphere()
  })
  return (
    <group>
      <instancedMesh ref={canopy} args={[canopyGeo, M.canopy as THREE.Material, points.length]} castShadow receiveShadow />
      <instancedMesh ref={poles} args={[undefined, M.white as THREE.Material, points.length]} castShadow>
        <cylinderGeometry args={[poleR * 0.85 * scale, poleR * 1.2 * scale, pole * scale, 8]} />
      </instancedMesh>
    </group>
  )
}

/**
 * Very simplified Prophet's Mosque for the city view: the long hall with its sliding-dome
 * roof grid, the old southern section with the Green Dome (south-east), ten minarets
 * (six tall ones of the second Saudi expansion), and plazas shaded by umbrellas.
 * Sizes and positions are approximate; no interior is modelled.
 */
export function HaramModel() {
  const roofDomes = useMemo(() => {
    const pts: V3[] = []
    for (let i = 0; i < 3; i++) for (let j = 0; j < 9; j++) pts.push([-2.3 + i * 2.3, 1.28, -4.5 + j * 0.78])
    return pts
  }, [])
  const tall: V3[] = [[-3.75, 0.2, -5.25], [3.75, 0.2, -5.25], [-1.05, 0.2, -5.45], [1.05, 0.2, -5.45], [-3.75, 0.2, 5.5], [3.75, 0.2, 5.5]]
  const old: V3[] = [[-2.0, 1.22, 2.2], [2.0, 1.22, 2.2], [-2.0, 1.22, 4.9], [0.2, 1.22, 5.35]]
  return (
    <group>
      {/* marble plazas */}
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[14.0, 0.12, 18.2]} m="marble" />
        <Box p={[0, 0.13, 0]} s={[8.4, 0.04, 11.6]} m="whiteWarm" />
      </BuildPart>

      {/* the main hall */}
      <BuildPart order={1}>
        <Box p={[0, 0.72, 0.15]} s={[7.8, 1.15, 10.9]} />
        <ArchRow p={[-3.91, 0.2, 0.15]} w={10.4} count={18} aw={0.34} ah={0.7} rotY={-Math.PI / 2} m="openingWarm" />
        <ArchRow p={[3.91, 0.2, 0.15]} w={10.4} count={18} aw={0.34} ah={0.7} rotY={Math.PI / 2} m="openingWarm" />
        <ArchRow p={[0, 0.2, -5.26]} w={7.2} count={12} aw={0.34} ah={0.7} rotY={Math.PI} m="openingWarm" />
        <ArchRow p={[0, 0.2, 5.61]} w={7.2} count={12} aw={0.34} ah={0.7} m="openingWarm" />
        <Box p={[0, 1.33, 0.15]} s={[8.0, 0.08, 11.1]} m="stoneTrim" />
        {/* main northern gate */}
        <Box p={[0, 0.85, -5.42]} s={[1.6, 1.4, 0.36]} m="whiteWarm" />
        <ArchRow p={[0, 0.2, -5.61]} w={1.2} count={1} aw={0.6} ah={1.0} rotY={Math.PI} m="openingWarm" />
      </BuildPart>

      {/* roof: sliding domes (north) and the old section with the Green Dome (south-east) */}
      <BuildPart order={2}>
        <DomeField points={roofDomes} r={0.33} m="silverDome" />
        {old.map((p, i) => <Dome key={i} p={p} r={0.42} m="silverDome" finial={false} seg={14} />)}
        <Cyl p={[1.45, 1.42, 4.25]} r={0.55} h={0.3} seg={18} m="whiteWarm" />
        <Dome p={[1.45, 1.56, 4.25]} r={0.6} m="greenDome" seg={18} squash={1.15} />
      </BuildPart>

      {/* ten minarets: six tall (second Saudi expansion) + four older ones */}
      <BuildPart order={3} drop={3}>
        {tall.map((p, i) => <Minaret key={i} p={p} h={6.4} r={0.2} />)}
        {([[-2.75, 1.36, 1.45], [2.75, 1.36, 1.45], [-2.75, 1.36, 5.1], [2.75, 1.36, 5.1]] as V3[]).map((p, i) => <Minaret key={`o${i}`} p={p} h={3.5} r={0.16} />)}
      </BuildPart>

      <BuildPart order={4}>
        <Umbrellas points={UMBRELLA_POINTS} />
      </BuildPart>
    </group>
  )
}

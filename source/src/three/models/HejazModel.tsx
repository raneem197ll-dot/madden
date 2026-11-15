import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ArchRow, Box, BuildPart, Cyl, Palm, WindowRow } from '../shared/parts'
import { useMats } from '../shared/materials'
import { Carriage, Locomotive } from './Train'

export const HEJAZ_PARTS = 7

/** Instanced railway sleepers + two rails along x. */
export function Track({ p, length, gauge = 0.4, sleeper = 0.26, scale = 1 }: { p: [number, number, number]; length: number; gauge?: number; sleeper?: number; scale?: number }) {
  const M = useMats()
  const count = Math.floor(length / sleeper)
  return (
    <group position={p} scale={scale}>
      <instancedMesh
        ref={(im) => {
          if (!im) return
          const o = new THREE.Object3D()
          for (let i = 0; i < count; i++) { o.position.set(-length / 2 + i * sleeper + sleeper / 2, 0, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix) }
          im.instanceMatrix.needsUpdate = true
          im.computeBoundingSphere()
        }}
        args={[undefined, M.woodDark as THREE.Material, count]}
        receiveShadow
      >
        <boxGeometry args={[sleeper * 0.45, 0.04, gauge * 1.9]} />
      </instancedMesh>
      <Box p={[0, 0.04, gauge / 2]} s={[length, 0.04, 0.035]} m="iron" />
      <Box p={[0, 0.04, -gauge / 2]} s={[length, 0.04, 0.035]} m="iron" />
    </group>
  )
}

/** 1 = today (two storeys); 0 = at opening in 1908 (single storey). Provided by the Then & Now viewer. */
export const HejazEra = createContext<{ current: number }>({ current: 1 })

function SecondStorey({ y, children }: { y: number; children: ReactNode }) {
  const era = useContext(HejazEra)
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!g.current) return
    const t = THREE.MathUtils.clamp(era.current, 0, 1)
    const cur = g.current.scale.y
    const k = cur + (Math.max(t, 0.0001) - cur) * Math.min(1, dt * 6)
    g.current.scale.set(1, k, 1)
    g.current.visible = k > 0.002
  })
  // scale from the top of the ground storey so the upper floor "rises" out of it
  return <group position={[0, y, 0]}><group ref={g}><group position={[0, -y, 0]}>{children}</group></group></group>
}

/**
 * Simplified Hejaz Railway Madinah station: a two-storey basalt building whose
 * façade has 17 arches, a platform and track with a 2-8-0 locomotive, the
 * four-tank water tower and a turntable.
 */
export function HejazModel() {
  const M = useMats()
  const pave = M.stoneTrim
  const y0 = 0.1
  const tanks = useMemo(() => [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]], [])
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <mesh position={[0, 0.05, 0]} receiveShadow material={pave as THREE.Material}>
          <boxGeometry args={[12, 0.1, 7.4]} />
        </mesh>
      </BuildPart>

      {/* ground storey with the 17-arch façade */}
      <BuildPart order={1}>
        <Box p={[0, y0 + 0.65, -1.4]} s={[9.4, 1.3, 2.4]} m="basalt" />
        <ArchRow p={[0, y0 + 0.08, -0.19]} w={9.2} count={17} aw={0.34} ah={0.9} m="openingWarm" />
        <Box p={[0, y0 + 0.05, -0.17]} s={[9.5, 0.1, 0.06]} m="stoneTrim" />
        <Box p={[0, y0 + 1.33, -0.16]} s={[9.6, 0.09, 0.1]} m="stoneTrim" />
        <ArchRow p={[-4.71, y0 + 0.1, -1.4]} w={2} count={3} aw={0.32} ah={0.8} rotY={-Math.PI / 2} m="openingWarm" />
        <ArchRow p={[4.71, y0 + 0.1, -1.4]} w={2} count={3} aw={0.32} ah={0.8} rotY={Math.PI / 2} m="openingWarm" />
      </BuildPart>

      {/* second storey (added 1914) — hidden in the Then & Now "1908" view */}
      <BuildPart order={2}>
        <SecondStorey y={y0 + 1.33}>
          <Box p={[0, y0 + 1.95, -1.4]} s={[9.4, 1.2, 2.4]} m="basalt" />
          <WindowRow p={[0, y0 + 1.95, -0.19]} w={9.2} count={17} ww={0.2} wh={0.5} m="windowGlow" />
          <Box p={[0, y0 + 2.6, -1.4]} s={[9.7, 0.1, 2.7]} m="stoneTrim" />
          <Box p={[0, y0 + 2.72, -1.4]} s={[9.5, 0.14, 2.5]} m="basaltLight" />
        </SecondStorey>
      </BuildPart>

      {/* platform & track */}
      <BuildPart order={3} drop={0.5}>
        <Box p={[0, 0.17, 0.75]} s={[10.6, 0.14, 1.5]} m="stoneTrim" />
        <Track p={[0, 0.12, 2.1]} length={11.6} />
        <Track p={[-1.5, 0.12, 3.05]} length={8.4} />
        {[-3.5, 0, 3.5].map((x) => <Cyl key={x} p={[x, 0.75, 1.35]} r={0.035} h={1.2} seg={6} m="iron" />)}
        <Box p={[0, 1.36, 0.95]} s={[8.2, 0.05, 1.1]} m="iron" />
      </BuildPart>

      <BuildPart order={4}>
        <group position={[1.4, 0.16, 2.1]} scale={0.21} rotation={[0, 0, 0]}>
          <Locomotive />
        </group>
        <group position={[-2.1, 0.16, 3.05]} scale={0.21}>
          <Carriage />
        </group>
      </BuildPart>

      {/* four-tank water tower */}
      <BuildPart order={5} drop={2.5}>
        <group position={[-5.0, 0, -0.1]}>
          {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => (
            <Box key={`${x}${z}`} p={[x * 0.9, 0.75, z * 0.9]} s={[0.08, 1.5, 0.08]} m="iron" />
          ))}
          <Box p={[0, 1.52, 0]} s={[1.3, 0.08, 1.3]} m="iron" />
          {tanks.map(([x, z]) => <Cyl key={`${x}${z}`} p={[x, 1.85, z]} r={0.27} h={0.58} seg={12} m="ironRed" />)}
        </group>
      </BuildPart>

      {/* turntable */}
      <BuildPart order={6}>
        <group position={[5.1, 0, 2.7]}>
          <Cyl p={[0, 0.11, 0]} r={0.85} h={0.04} seg={24} m="basalt" />
          <Box p={[0, 0.16, 0]} s={[1.7, 0.07, 0.34]} m="iron" />
        </group>
        <Palm p={[-5.6, 0, -2.8]} h={1.6} rotY={0.3} />
        <Palm p={[5.6, 0, -2.9]} h={1.8} rotY={1.9} lean={0.06} />
        <Palm p={[-3.4, 0, 3.4]} h={1.3} rotY={2.6} />
      </BuildPart>
    </group>
  )
}

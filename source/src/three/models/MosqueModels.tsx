import { useMemo } from 'react'
import * as THREE from 'three'
import { ArchRow, Box, BuildPart, Cyl, Dome, DomeField, Minaret, Palm, WindowRow } from '../shared/parts'
import { useMats } from '../shared/materials'

type V3 = [number, number, number]

/* All models face Makkah: the qibla wall is on the south (+z), entrances on the north (−z). */

/* ---------------- Al-Ghamama: basalt hall, five portico domes + the large mihrab dome ---------------- */
export const GHAMAMA_PARTS = 4
export function GhamamaModel() {
  const portico: V3[] = [-1.9, -0.95, 0, 0.95, 1.9].map((x) => [x, 1.32, -0.75])
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[6.4, 0.12, 4.6]} m="marble" />
      </BuildPart>
      <BuildPart order={1}>
        <Box p={[0, 0.72, 0.25]} s={[5.2, 1.2, 2.9]} m="basalt" />
        {/* white lime bands and arcade */}
        <Box p={[0, 1.36, 0.25]} s={[5.3, 0.1, 3.0]} m="white" />
        <Box p={[0, 0.2, 0.25]} s={[5.3, 0.1, 3.0]} m="white" />
        <ArchRow p={[0, 0.25, -1.21]} w={4.8} count={5} aw={0.6} ah={0.85} rotY={Math.PI} m="white" />
        <ArchRow p={[0, 0.27, -1.22]} w={4.8} count={5} aw={0.42} ah={0.7} rotY={Math.PI} m="openingWarm" />
      </BuildPart>
      <BuildPart order={2}>
        <DomeField points={portico} r={0.42} m="white" />
        <Cyl p={[0, 1.5, 0.75]} r={0.78} h={0.3} seg={18} m="basaltLight" />
        <Dome p={[0, 1.64, 0.75]} r={0.8} seg={18} />
      </BuildPart>
      <BuildPart order={3} drop={2.5}>
        <Minaret p={[2.35, 0.12, -1.6]} h={3.4} r={0.16} m="basalt" />
        <Palm p={[-2.8, 0, -1.9]} h={1.3} rotY={0.4} />
        <Palm p={[2.9, 0, 1.9]} h={1.4} rotY={2.2} />
      </BuildPart>
    </group>
  )
}

/* ---------------- Al-Jumu'ah: main dome + four small domes, one slender minaret ---------------- */
export const JUMUAH_PARTS = 4
export function JumuahModel() {
  const small: V3[] = [[-1.15, 1.35, -1.15], [1.15, 1.35, -1.15], [-1.15, 1.35, 1.15], [1.15, 1.35, 1.15]]
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[5.4, 0.12, 5.4]} m="marble" />
      </BuildPart>
      <BuildPart order={1}>
        <Box p={[0, 0.72, 0]} s={[3.8, 1.25, 3.8]} />
        <ArchRow p={[0, 0.2, -1.91]} w={3.4} count={5} aw={0.36} ah={0.72} rotY={Math.PI} m="openingWarm" />
        <ArchRow p={[-1.91, 0.2, 0]} w={3.4} count={5} aw={0.36} ah={0.72} rotY={-Math.PI / 2} m="openingWarm" />
        <ArchRow p={[1.91, 0.2, 0]} w={3.4} count={5} aw={0.36} ah={0.72} rotY={Math.PI / 2} m="openingWarm" />
        <Box p={[0, 1.38, 0]} s={[3.95, 0.08, 3.95]} m="stoneTrim" />
      </BuildPart>
      <BuildPart order={2}>
        <Cyl p={[0, 1.55, 0]} r={0.92} h={0.36} seg={20} />
        <WindowRow p={[0, 1.56, 0.93]} w={1.4} count={4} ww={0.14} wh={0.2} m="windowGlow" />
        <Dome p={[0, 1.72, 0]} r={0.95} seg={20} />
        <DomeField points={small} r={0.36} />
      </BuildPart>
      <BuildPart order={3} drop={3}>
        <Minaret p={[2.15, 0.12, -2.15]} h={4.4} r={0.15} />
        <Palm p={[-2.5, 0, -2.4]} h={1.4} rotY={1.1} />
        <Palm p={[-2.4, 0, 2.5]} h={1.2} rotY={3.1} lean={0.06} />
      </BuildPart>
    </group>
  )
}

/* ---------------- Al-Manaratain: hall with twin entrance minarets, between two hills ---------------- */
export const MANARATAIN_PARTS = 4
export function ManaratainModel() {
  const M = useMats()
  const hill = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[4.6, 0.12, 4.6]} m="marble" />
        <mesh geometry={hill} position={[-3.3, 0, 0.6]} scale={[1.25, 0.95, 1.8]} material={M.sandDark as THREE.Material} castShadow receiveShadow />
        <mesh geometry={hill} position={[3.3, 0, 0.4]} scale={[1.2, 0.85, 1.7]} rotation={[0, 0.6, 0]} material={M.sandDark as THREE.Material} castShadow receiveShadow />
      </BuildPart>
      <BuildPart order={1}>
        <Box p={[0, 0.68, 0.35]} s={[3.4, 1.15, 2.9]} />
        <ArchRow p={[0, 0.2, -1.11]} w={2.4} count={4} aw={0.36} ah={0.7} rotY={Math.PI} m="openingWarm" />
        <Box p={[0, 1.29, 0.35]} s={[3.5, 0.07, 3.0]} m="stoneTrim" />
      </BuildPart>
      <BuildPart order={2}>
        <Cyl p={[0, 1.42, 0.55]} r={0.62} h={0.24} seg={16} />
        <Dome p={[0, 1.53, 0.55]} r={0.64} seg={16} />
      </BuildPart>
      <BuildPart order={3} drop={3}>
        <Minaret p={[-1.35, 0.12, -1.45]} h={4.0} r={0.17} />
        <Minaret p={[1.35, 0.12, -1.45]} h={4.0} r={0.17} />
      </BuildPart>
    </group>
  )
}

/* ---------------- Al-Ijabah: small mosque, one dome, one minaret ---------------- */
export const IJABAH_PARTS = 3
export function IjabahModel() {
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[4.0, 0.12, 3.8]} m="marble" />
      </BuildPart>
      <BuildPart order={1}>
        <Box p={[0, 0.62, 0.2]} s={[2.9, 1.05, 2.6]} m="whiteWarm" />
        <ArchRow p={[0, 0.2, -1.11]} w={2.2} count={3} aw={0.4} ah={0.68} rotY={Math.PI} m="openingWarm" />
        <Box p={[0, 1.17, 0.2]} s={[3.0, 0.07, 2.7]} m="stoneTrim" />
        <Cyl p={[0, 1.3, 0.35]} r={0.6} h={0.22} seg={16} />
        <Dome p={[0, 1.41, 0.35]} r={0.62} seg={16} />
      </BuildPart>
      <BuildPart order={2} drop={3}>
        <Minaret p={[1.3, 0.12, -1.25]} h={3.6} r={0.15} />
        <Palm p={[-1.7, 0, -1.5]} h={1.2} rotY={0.8} />
      </BuildPart>
    </group>
  )
}

/** El-Wakil's tall Miqat minaret, simplified as a tapering triangular shaft. */
function TriMinaret({ p, h }: { p: V3; h: number }) {
  return (
    <group position={p}>
      <Box p={[0, h * 0.12, 0]} s={[0.8, h * 0.24, 0.8]} m="whiteWarm" />
      <Cyl p={[0, h * 0.24 + h * 0.25, 0]} r={0.36} rTop={0.27} h={h * 0.5} seg={3} m="whiteWarm" />
      <Cyl p={[0, h * 0.75, 0]} r={0.42} h={0.1} seg={3} m="stoneTrim" />
      <Cyl p={[0, h * 0.75 + h * 0.08, 0]} r={0.24} rTop={0.2} h={h * 0.16} seg={3} m="whiteWarm" />
      <Dome p={[0, h * 0.91, 0]} r={0.22} squash={1.4} seg={10} m="whiteWarm" />
    </group>
  )
}

/* ---------------- Dhu al-Hulayfah (Miqat): square arcaded complex, 13 domes, 5 minarets ---------------- */
export const MIQAT_PARTS = 5
export function MiqatModel() {
  const domes: V3[] = useMemo(() => {
    const pts: V3[] = []
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) pts.push([-2.1 + i * 1.4, 1.22, 0.8 + j * 0.95])
    return pts
  }, [])
  const palms: [number, number][] = [[-2.0, -2.0], [-0.7, -2.3], [0.7, -2.3], [2.0, -2.0], [-2.3, -0.7], [2.3, -0.7]]
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[7.4, 0.12, 7.4]} m="marble" />
        <Box p={[0, 0.13, -1.2]} s={[5.2, 0.03, 3.6]} m="sand" />
      </BuildPart>
      <BuildPart order={1}>
        {/* arcaded perimeter */}
        {([[0, -3.25, 6.6, 0.5, Math.PI], [-3.25, 0, 0.5, 6.6, -Math.PI / 2], [3.25, 0, 0.5, 6.6, Math.PI / 2]] as [number, number, number, number, number][]).map(([x, z, w, d, ry], i) => (
          <group key={i}>
            <Box p={[x, 0.45, z]} s={[w, 0.7, d]} m="whiteWarm" />
            <ArchRow p={[x + (i === 1 ? -0.26 : i === 2 ? 0.26 : 0), 0.14, z + (i === 0 ? -0.26 : 0)]} w={6.2} count={11} aw={0.34} ah={0.46} rotY={ry} m="openingWarm" />
          </group>
        ))}
      </BuildPart>
      <BuildPart order={2}>
        {/* prayer hall in the south half */}
        <Box p={[0, 0.62, 1.75]} s={[6.5, 1.05, 3.0]} m="whiteWarm" />
        <ArchRow p={[0, 0.16, 0.24]} w={6.0} count={9} aw={0.36} ah={0.62} rotY={Math.PI} m="openingWarm" />
        <Box p={[0, 1.16, 1.75]} s={[6.6, 0.06, 3.1]} m="stoneTrim" />
      </BuildPart>
      <BuildPart order={3}>
        <DomeField points={domes} r={0.34} m="whiteWarm" />
        <Dome p={[0, 1.22, 1.75]} r={0.62} seg={16} m="whiteWarm" />
      </BuildPart>
      <BuildPart order={4} drop={3}>
        <TriMinaret p={[0, 0.12, -3.6]} h={8.2} />
        {([[-3.25, 0.12, -3.25], [3.25, 0.12, -3.25], [-3.25, 0.12, 3.25], [3.25, 0.12, 3.25]] as V3[]).map((p, i) => <Minaret key={i} p={p} h={3.4} r={0.15} m="whiteWarm" />)}
        {palms.map(([x, z], i) => <Palm key={i} p={[x, 0.13, z]} h={1.0 + (i % 3) * 0.15} rotY={i * 1.3} />)}
      </BuildPart>
    </group>
  )
}

import { useMemo } from 'react'
import * as THREE from 'three'
import { ArchRow, Box, BuildPart, Cyl, Dome, Minaret, Palm, WindowRow } from '../shared/parts'
import { useMats } from '../shared/materials'
import { rng } from '../shared/env'

type V3 = [number, number, number]

/* ---------------- Al-Baqi: only the outer wall and the entrance (no graves, out of respect) ---------------- */
export const BAQI_PARTS = 2
const BAQI_OUTLINE: [number, number][] = [[-3.3, -2.4], [-0.6, -3.1], [2.9, -2.7], [3.6, 0.2], [3.0, 2.8], [-0.4, 3.2], [-3.2, 2.5], [-3.6, 0.1]]
export function BaqiModel() {
  const M = useMats()
  const ground = useMemo(() => {
    const s = new THREE.Shape()
    BAQI_OUTLINE.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  const walls = BAQI_OUTLINE.map(([x, z], i) => {
    const [x2, z2] = BAQI_OUTLINE[(i + 1) % BAQI_OUTLINE.length]
    return { x: (x + x2) / 2, z: (z + z2) / 2, len: Math.hypot(x2 - x, z2 - z), rot: Math.atan2(-(z2 - z), x2 - x) }
  })
  return (
    <group>
      <BuildPart order={0} drop={0.2}>
        <mesh geometry={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={M.sand as THREE.Material} receiveShadow />
        {walls.map((w, i) => (
          <mesh key={i} position={[w.x, 0.24, w.z]} rotation={[0, w.rot, 0]} castShadow receiveShadow material={M.wallStone as THREE.Material}>
            <boxGeometry args={[w.len + 0.14, 0.48, 0.16]} />
          </mesh>
        ))}
      </BuildPart>
      {/* the gate faces the Prophet's Mosque (west) */}
      <BuildPart order={1}>
        <group position={[-3.45, 0, 0.1]} rotation={[0, Math.PI / 2, 0]}>
          <Box p={[0, 0.48, 0]} s={[1.5, 0.96, 0.4]} m="wallStone" />
          <ArchRow p={[0, 0.03, -0.21]} w={0.9} count={1} aw={0.5} ah={0.7} rotY={Math.PI} m="opening" />
          <Box p={[0, 1.0, 0]} s={[1.6, 0.08, 0.5]} m="stoneTrim" />
        </group>
      </BuildPart>
    </group>
  )
}

/* ---------------- The Seven Mosques: small mosques at the western foot of Mount Sala‘ ---------------- */
export const SABAA_PARTS = 4
function SmallMosque({ p, s = 1, rotY = 0, minaret = false }: { p: V3; s?: number; rotY?: number; minaret?: boolean }) {
  return (
    <group position={p} rotation={[0, rotY, 0]} scale={s}>
      <Box p={[0, 0.35, 0]} s={[0.9, 0.7, 0.8]} />
      <ArchRow p={[0, 0.06, -0.41]} w={0.6} count={2} aw={0.18} ah={0.34} rotY={Math.PI} m="openingWarm" />
      <Dome p={[0, 0.7, 0.05]} r={0.32} seg={12} />
      {minaret && <Minaret p={[0.42, 0, -0.36]} h={1.8} r={0.08} />}
    </group>
  )
}
export function SabaaModel() {
  const M = useMats()
  const hill = useMemo(() => {
    // a smooth rocky rise for the foot of Mount Sala‘ (gentle noise, no spikes)
    const g = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const n = 1 + 0.07 * Math.sin(x * 7.1 + z * 3.3) + 0.05 * Math.sin(z * 9.7 - x * 2.1)
      pos.setXYZ(i, x * n, y * (0.9 + 0.1 * n), z * n)
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <mesh geometry={hill} position={[2.5, 0, 0]} scale={[2.0, 1.7, 3.3]} material={M.rock as THREE.Material} castShadow receiveShadow />
        <Box p={[-0.6, 0.04, 0]} s={[4.4, 0.08, 6.2]} m="sand" />
      </BuildPart>
      <BuildPart order={1}>
        {/* Al-Fath on a small rise at the foot of the hill */}
        <Box p={[0.6, 0.25, -1.6]} s={[1.6, 0.5, 1.4]} m="wallStone" />
        <SmallMosque p={[0.6, 0.5, -1.6]} s={1.15} minaret />
      </BuildPart>
      <BuildPart order={2}>
        <SmallMosque p={[-0.5, 0.08, -0.1]} s={0.95} />
        <SmallMosque p={[0.3, 0.08, 1.1]} s={0.9} />
        <SmallMosque p={[-1.2, 0.08, 1.9]} s={0.85} rotY={0.2} />
        <SmallMosque p={[-1.6, 0.08, -1.5]} s={0.85} rotY={-0.2} />
        <SmallMosque p={[0.9, 0.08, 2.6]} s={0.8} />
      </BuildPart>
      <BuildPart order={3}>
        <Palm p={[-2.2, 0, 0.4]} h={1.3} rotY={0.3} />
        <Palm p={[-2.4, 0, -2.6]} h={1.1} rotY={2.3} />
        <Palm p={[-1.8, 0, 3.1]} h={1.2} rotY={4.3} />
      </BuildPart>
    </group>
  )
}

/* ---------------- King Fahd Quran Printing Complex: symbolic campus ---------------- */
export const QURAN_PARTS = 4
export function QuranComplexModel() {
  return (
    <group>
      <BuildPart order={0} drop={0.3}>
        <Box p={[0, 0.06, 0]} s={[7.6, 0.12, 7.2]} m="marble" />
        <Box p={[0, 0.13, -2.6]} s={[6.8, 0.03, 1.4]} m="grass" />
      </BuildPart>
      <BuildPart order={1}>
        {/* long press & warehouse halls */}
        {[-1.0, 0.6, 2.2].map((z) => (
          <group key={z}>
            <Box p={[-1.1, 0.5, z]} s={[4.6, 0.85, 1.1]} />
            <WindowRow p={[-1.1, 0.55, z - 0.56]} w={4.2} count={9} ww={0.22} wh={0.26} rotY={Math.PI} m="windowGlow" />
            <Box p={[-1.1, 0.95, z]} s={[4.7, 0.06, 1.2]} m="green" />
          </group>
        ))}
      </BuildPart>
      <BuildPart order={2}>
        {/* entrance building with arcade */}
        <Box p={[2.3, 0.7, -0.4]} s={[2.4, 1.25, 2.0]} m="whiteWarm" />
        <ArchRow p={[2.3, 0.15, -1.41]} w={2.1} count={5} aw={0.26} ah={0.7} rotY={Math.PI} m="openingWarm" />
        <Box p={[2.3, 1.36, -0.4]} s={[2.5, 0.07, 2.1]} m="green" />
      </BuildPart>
      <BuildPart order={3} drop={3}>
        {/* the complex mosque */}
        <Box p={[2.4, 0.5, 2.1]} s={[1.8, 0.85, 1.6]} />
        <Dome p={[2.4, 0.93, 2.1]} r={0.55} seg={14} m="green" />
        <Minaret p={[3.35, 0.12, 1.3]} h={3.3} r={0.14} />
        {[-3.2, -1.6, 0, 1.6, 3.2].map((x, i) => <Palm key={i} p={[x, 0.14, -2.6]} h={1.0 + (i % 2) * 0.25} rotY={i} />)}
      </BuildPart>
    </group>
  )
}

/* ---------------- Bir Rumah: the well inside an endowed palm farm ---------------- */
export const RUMAH_PARTS = 3
export function RumahModel() {
  const palms = useMemo(() => {
    const r = rng(14)
    const pts: { p: V3; h: number; rot: number }[] = []
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      if (Math.abs(i) <= 0 && Math.abs(j) <= 0) continue
      pts.push({ p: [i * 1.15 + (r() - 0.5) * 0.3, 0, j * 1.15 + (r() - 0.5) * 0.3], h: 1.1 + r() * 0.6, rot: r() * 6.28 })
    }
    return pts
  }, [])
  return (
    <group>
      <BuildPart order={0} drop={0.2}>
        <Box p={[0, 0.03, 0]} s={[6.4, 0.06, 6.4]} m="grass" />
        {([[0, -3.2, 6.6, 0.14], [0, 3.2, 6.6, 0.14], [-3.2, 0, 0.14, 6.6], [3.2, 0, 0.14, 6.6]] as [number, number, number, number][]).map(([x, z, w, d], i) => (
          <Box key={i} p={[x, 0.2, z]} s={[w, 0.4, d]} m="wallStone" />
        ))}
      </BuildPart>
      <BuildPart order={1}>
        {/* the well: a stone ring with a simple frame */}
        <Cyl p={[0, 0.22, 0]} r={0.42} h={0.36} seg={18} m="wallStone" />
        <Cyl p={[0, 0.39, 0]} r={0.32} h={0.04} seg={18} m="water" />
        <Box p={[-0.38, 0.6, 0]} s={[0.06, 0.8, 0.06]} m="woodDark" />
        <Box p={[0.38, 0.6, 0]} s={[0.06, 0.8, 0.06]} m="woodDark" />
        <Box p={[0, 1.0, 0]} s={[0.86, 0.06, 0.06]} m="woodDark" />
      </BuildPart>
      <BuildPart order={2}>
        {palms.map((t, i) => <Palm key={i} p={t.p} h={t.h} rotY={t.rot} />)}
      </BuildPart>
    </group>
  )
}

/* ---------------- Wadi al-Aqiq walkway: valley bed, paved lit path, palms, a palace ruin ---------------- */
export const AQIQ_PARTS = 4
export function AqiqModel() {
  const M = useMats()
  const bed = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.5, 0, 4), new THREE.Vector3(-0.6, 0, 1.4), new THREE.Vector3(-1.0, 0, -1.4), new THREE.Vector3(0.2, 0, -4)])
    return { curve, geo: new THREE.TubeGeometry(curve, 40, 0.9, 6, false) }
  }, [])
  const lamps = useMemo(() => Array.from({ length: 7 }, (_, i) => bed.curve.getPointAt(0.06 + i * 0.145)), [bed])
  return (
    <group>
      <BuildPart order={0} drop={0.2}>
        <Box p={[0, 0.03, 0]} s={[6.4, 0.06, 8.2]} m="sand" />
        <mesh geometry={bed.geo} scale={[1, 0.05, 1]} position={[0, 0.05, 0]} material={M.sandDark as THREE.Material} receiveShadow />
      </BuildPart>
      <BuildPart order={1}>
        {/* paved walkway on the east bank */}
        <Box p={[1.35, 0.08, 0]} s={[1.0, 0.06, 7.8]} m="marble" />
        {lamps.map((p, i) => (
          <group key={i} position={[1.95, 0, p.z]}>
            <Box p={[0, 0.4, 0]} s={[0.04, 0.8, 0.04]} m="iron" />
            <mesh position={[0, 0.84, 0]} material={M.glowWarm as THREE.Material}><sphereGeometry args={[0.07, 8, 6]} /></mesh>
          </group>
        ))}
      </BuildPart>
      <BuildPart order={2}>
        {/* ruin of a historic palace (e.g. Qasr Urwa) */}
        <group position={[-2.4, 0, -1.6]}>
          <Box p={[0, 0.3, -0.6]} s={[1.6, 0.6, 0.18]} m="basaltLight" />
          <Box p={[-0.72, 0.22, 0]} s={[0.18, 0.44, 1.3]} m="basaltLight" />
          <Box p={[0.72, 0.16, 0.1]} s={[0.18, 0.32, 1.0]} m="basaltLight" />
          <Box p={[0.1, 0.12, 0.55]} s={[0.8, 0.24, 0.16]} m="basaltLight" />
        </group>
      </BuildPart>
      <BuildPart order={3}>
        {[-3.4, -2.2, -1.0, 0.2, 1.4, 2.6, 3.6].map((z, i) => <Palm key={i} p={[0.75, 0.1, z]} h={1.1 + (i % 3) * 0.2} rotY={i * 0.9} />)}
        {[-2.8, 0.6, 3.0].map((z, i) => <Palm key={`w${i}`} p={[-2.6, 0.05, z]} h={1.3} rotY={i * 2} lean={0.05} />)}
        <Cyl p={[2.7, 0.2, 2.2]} r={0.5} h={0.04} m="marble" seg={14} />
      </BuildPart>
    </group>
  )
}

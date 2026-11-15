import { ArchRow, Box, BuildPart, Cyl, Dome, Minaret, Palm, WindowRow } from '../shared/parts'
import { useMats } from '../shared/materials'
import * as THREE from 'three'

export const QIBLATAIN_PARTS = 7

/** Half-cylinder vault running along x. */
function Vault({ p, r, len }: { p: [number, number, number]; r: number; len: number }) {
  const M = useMats()
  return (
    <mesh position={p} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={M.white as THREE.Material}>
      <cylinderGeometry args={[r, r, len, 14, 1, false, 0, Math.PI]} />
    </mesh>
  )
}

/**
 * Simplified Qiblatain Mosque: symmetrical hall, barrel vaults parallel to the
 * qibla wall, two domes on the axis towards Makkah (south), twin minarets
 * flanking the northern entrance.
 */
export function QiblatainModel() {
  const y0 = 0.28
  return (
    <group>
      <BuildPart order={0} drop={0.4}>
        <Box p={[0, 0.06, 0]} s={[7.4, 0.12, 7.8]} m="marble" />
        <Box p={[0, 0.2, 0]} s={[6.6, 0.16, 7.0]} m="basalt" />
      </BuildPart>

      <BuildPart order={1}>
        <Box p={[0, y0 + 0.95, 0.6]} s={[6, 1.9, 4.6]} />
        <ArchRow p={[-3.01, y0 + 0.15, 0.6]} w={4} count={5} aw={0.4} ah={0.95} rotY={-Math.PI / 2} />
        <ArchRow p={[3.01, y0 + 0.15, 0.6]} w={4} count={5} aw={0.4} ah={0.95} rotY={Math.PI / 2} />
        <WindowRow p={[0, y0 + 1.45, 2.91]} w={5} count={6} ww={0.2} wh={0.3} />
        <Box p={[0, y0 + 1.92, 0.6]} s={[6.12, 0.08, 4.72]} m="whiteWarm" />
      </BuildPart>

      {/* entrance block with twin-minaret frontage (north) */}
      <BuildPart order={2}>
        <Box p={[0, y0 + 0.75, -2.3]} s={[3.2, 1.5, 1.2]} />
        <ArchRow p={[0, y0 + 0.1, -2.91]} w={2.4} count={3} aw={0.5} ah={1.0} rotY={Math.PI} />
        <Box p={[0, y0 + 1.52, -2.3]} s={[3.3, 0.06, 1.3]} m="stoneTrim" />
      </BuildPart>

      {/* barrel vaults parallel to the qibla wall */}
      <BuildPart order={3}>
        {[-0.85, 0.6, 2.05].map((z) => (
          <group key={z}>
            <Vault p={[-1.95, y0 + 1.96, z]} r={0.68} len={2.0} />
            <Vault p={[1.95, y0 + 1.96, z]} r={0.68} len={2.0} />
          </group>
        ))}
      </BuildPart>

      {/* two domes on the axis towards Makkah: main dome raised on a windowed drum */}
      <BuildPart order={4}>
        <Cyl p={[0, y0 + 2.2, 1.75]} r={0.95} h={0.5} seg={20} />
        <WindowRing y={y0 + 2.2} z={1.75} r={0.96} />
        <Dome p={[0, y0 + 2.45, 1.75]} r={0.95} seg={20} />
        <Cyl p={[0, y0 + 2.04, -0.6]} r={0.74} h={0.18} seg={18} />
        <Dome p={[0, y0 + 2.13, -0.6]} r={0.72} seg={16} />
      </BuildPart>

      <BuildPart order={5} drop={3}>
        <Minaret p={[-1.95, y0, -2.65]} h={4.1} r={0.24} />
        <Minaret p={[1.95, y0, -2.65]} h={4.1} r={0.24} />
      </BuildPart>

      <BuildPart order={6}>
        <Palm p={[-3.4, 0, -3.4]} h={1.5} rotY={0.6} />
        <Palm p={[3.5, 0, -3.3]} h={1.7} rotY={2.6} lean={0.07} />
        <Palm p={[-3.5, 0, 3.4]} h={1.6} rotY={1.2} lean={-0.07} />
        <Palm p={[3.4, 0, 3.5]} h={1.4} rotY={4.1} />
      </BuildPart>
    </group>
  )
}

function WindowRing({ y, z, r }: { y: number; z: number; r: number }) {
  const M = useMats()
  const n = 12
  return (
    <group position={[0, y, z]}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * r, 0, Math.cos(a) * r]} rotation={[0, a, 0]} material={M.windowGlow as THREE.Material}>
            <planeGeometry args={[0.16, 0.28]} />
          </mesh>
        )
      })}
    </group>
  )
}

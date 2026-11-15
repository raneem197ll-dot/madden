import { useMemo } from 'react'
import * as THREE from 'three'
import { ArchRow, Box, BuildPart, Cyl, Dome, DomeField, Minaret, Palm, WindowRow } from '../shared/parts'
import { useMats, GHOST } from '../shared/materials'
import { marbleTex } from '../shared/textures'

export const QUBA_PARTS = 9

/**
 * Simplified Quba Mosque: central courtyard, prayer hall to the south (qibla side)
 * with six main domes, small domes over the arcades, four corner minarets.
 */
export function QubaModel() {
  const M = useMats()
  const ghost = M.white === GHOST
  const marble = useMemo(() => new THREE.MeshStandardMaterial({ map: marbleTex([3, 3]), roughness: 0.45 }), [])
  const y0 = 0.32
  const smallDomes = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let x = -3.05; x <= 3.06; x += 0.61) { pts.push([x, y0 + 1.36, -3.1]); pts.push([x, y0 + 1.36, -2.35]) }
    for (let z = -1.55; z <= 0.1; z += 0.55) { pts.push([-2.78, y0 + 1.36, z]); pts.push([2.78, y0 + 1.36, z]); pts.push([-3.2, y0 + 1.36, z]); pts.push([3.2, y0 + 1.36, z]) }
    return pts
  }, [])

  return (
    <group>
      <BuildPart order={0} drop={0.4}>
        <Box p={[0, 0.06, 0]} s={[8.4, 0.12, 8.4]} m="marble" />
        <Box p={[0, 0.22, 0]} s={[7.5, 0.2, 7.5]} m="basalt" />
        <mesh position={[0, y0 + 0.01, -0.8]} rotation={[-Math.PI / 2, 0, 0]} material={ghost ? GHOST : marble} receiveShadow>
          <planeGeometry args={[4.1, 2.3]} />
        </mesh>
      </BuildPart>

      {/* perimeter walls with arch openings */}
      <BuildPart order={1}>
        <Box p={[0, y0 + 0.65, -3.6]} s={[7.2, 1.3, 0.3]} />
        <Box p={[-3.6, y0 + 0.65, 0]} s={[0.3, 1.3, 7.2]} />
        <Box p={[3.6, y0 + 0.65, 0]} s={[0.3, 1.3, 7.2]} />
        <ArchRow p={[0, y0 + 0.12, -3.76]} w={7} count={9} aw={0.42} ah={0.85} rotY={Math.PI} />
        <ArchRow p={[-3.76, y0 + 0.12, 0]} w={7} count={9} aw={0.42} ah={0.85} rotY={-Math.PI / 2} />
        <ArchRow p={[3.76, y0 + 0.12, 0]} w={7} count={9} aw={0.42} ah={0.85} rotY={Math.PI / 2} />
        {/* basalt base band */}
        <Box p={[0, y0 + 0.06, -3.62]} s={[7.3, 0.12, 0.34]} m="basalt" />
      </BuildPart>

      {/* arcades around the courtyard */}
      <BuildPart order={2}>
        <Box p={[0, y0 + 1.25, -2.75]} s={[7.0, 0.14, 1.7]} />
        <Box p={[-2.85, y0 + 1.25, -0.8]} s={[1.3, 0.14, 2.3]} />
        <Box p={[2.85, y0 + 1.25, -0.8]} s={[1.3, 0.14, 2.3]} />
        {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => <Cyl key={x} p={[x, y0 + 0.6, -1.95]} r={0.07} h={1.2} seg={8} />)}
        {[-1.7, -1.0, -0.3, 0.3].map((z) => <Cyl key={'w' + z} p={[-2.15, y0 + 0.6, z]} r={0.07} h={1.2} seg={8} />)}
        {[-1.7, -1.0, -0.3, 0.3].map((z) => <Cyl key={'e' + z} p={[2.15, y0 + 0.6, z]} r={0.07} h={1.2} seg={8} />)}
      </BuildPart>

      {/* prayer hall (qibla side, south) */}
      <BuildPart order={3}>
        <Box p={[0, y0 + 0.85, 2.0]} s={[7.2, 1.7, 3.3]} />
        <ArchRow p={[0, y0 + 0.08, 0.34]} w={4.2} count={5} aw={0.5} ah={1.05} rotY={Math.PI} />
        <WindowRow p={[0, y0 + 1.1, 3.66]} w={6.4} count={8} ww={0.22} wh={0.42} />
        <ArchRow p={[0, y0 + 0.12, 3.66]} w={6.6} count={8} aw={0.3} ah={0.6} m="basalt" />
        <Box p={[0, y0 + 1.72, 2.0]} s={[7.3, 0.06, 3.4]} m="whiteWarm" />
      </BuildPart>

      {/* six main domes over the prayer hall */}
      <BuildPart order={4}>
        {[-2.35, 0, 2.35].map((x) => (
          <group key={x}>
            <Cyl p={[x, y0 + 1.86, 1.15]} r={0.62} h={0.22} seg={16} />
            <Dome p={[x, y0 + 1.97, 1.15]} r={0.62} seg={14} />
          </group>
        ))}
      </BuildPart>
      <BuildPart order={5}>
        {[-2.35, 0, 2.35].map((x) => (
          <group key={x}>
            <Cyl p={[x, y0 + 1.86, 2.75]} r={x === 0 ? 0.78 : 0.62} h={x === 0 ? 0.34 : 0.22} seg={16} />
            <Dome p={[x, y0 + (x === 0 ? 2.03 : 1.97), 2.75]} r={x === 0 ? 0.8 : 0.62} seg={16} />
          </group>
        ))}
      </BuildPart>

      <BuildPart order={6}>
        <DomeField points={smallDomes} r={0.2} />
      </BuildPart>

      <BuildPart order={7} drop={3}>
        <Minaret p={[-3.7, y0, -3.7]} h={4.8} />
        <Minaret p={[3.7, y0, -3.7]} h={4.8} />
        <Minaret p={[-3.7, y0, 3.7]} h={4.8} />
        <Minaret p={[3.7, y0, 3.7]} h={4.8} />
      </BuildPart>

      <BuildPart order={8}>
        {/* main entrance portal on the north */}
        <Box p={[0, y0 + 0.85, -3.82]} s={[1.4, 1.7, 0.3]} />
        <ArchRow p={[0, y0 + 0.08, -3.98]} w={1} count={1} aw={0.62} ah={1.3} rotY={Math.PI} />
        <Box p={[0, y0 + 1.73, -3.82]} s={[1.5, 0.08, 0.36]} m="stoneTrim" />
        <Palm p={[-4.6, 0, -4.3]} h={1.6} rotY={0.4} lean={0.08} />
        <Palm p={[4.5, 0, -4.4]} h={1.9} rotY={1.4} lean={-0.06} />
        <Palm p={[-4.5, 0, 2.2]} h={1.7} rotY={2.1} />
        <Palm p={[4.6, 0, 1.4]} h={1.5} rotY={3.0} lean={0.1} />
      </BuildPart>
    </group>
  )
}

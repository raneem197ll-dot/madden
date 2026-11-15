import { useMemo } from 'react'
import * as THREE from 'three'
import { MAT } from '../../shared/materials'
import { archPaneGeometry, archWallGeometry, archWallPiers, domeGeometry, holedSlabGeometry } from '../../shared/parts'
import { Collider } from '../engine'

/** Ceiling bay with a dome over a circular opening (interior visible). */
export function DomeBay({ x, z, w, d, y, r, drum = 0, windows = 0 }: { x: number; z: number; w: number; d: number; y: number; r: number; drum?: number; windows?: number }) {
  const slab = holedSlabGeometry(w, d, r)
  const domeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4efe4', side: THREE.DoubleSide, roughness: 0.8 }), [])
  return (
    <group position={[x, y, z]}>
      <mesh geometry={slab} material={MAT.white} />
      {drum > 0 && (
        <mesh position={[0, drum / 2, 0]} material={domeMat}>
          <cylinderGeometry args={[r, r, drum, 32, 1, true]} />
        </mesh>
      )}
      {windows > 0 && Array.from({ length: windows }).map((_, i) => {
        const a = (i / windows) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * (r - 0.02), drum / 2, Math.cos(a) * (r - 0.02)]} rotation={[0, a + Math.PI, 0]} material={MAT.glowWarm}>
            <planeGeometry args={[0.35, drum * 0.6]} />
          </mesh>
        )
      })}
      <mesh position={[0, drum, 0]} geometry={domeGeometry(r, 28, 12)} material={domeMat} />
      <mesh position={[0, drum + r - 0.02, 0]} material={MAT.gold}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
    </group>
  )
}

/** Barrel vault shell running along x (seen from inside). */
export function VaultShell({ x, z, y, r, len }: { x: number; z: number; y: number; r: number; len: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1ebdf', side: THREE.DoubleSide, roughness: 0.85 }), [])
  return (
    <mesh position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} material={mat}>
      <cylinderGeometry args={[r, r, len, 20, 1, true, 0, Math.PI]} />
    </mesh>
  )
}

/** Row of arches along x with colliders at the piers. */
export function ArchRowWall({ z, width, height, depth = 0.6, count, archW, archH, m = MAT.white }: { z: number; width: number; height: number; depth?: number; count: number; archW: number; archH: number; m?: THREE.Material }) {
  const geo = archWallGeometry(width, height, depth, count, archW, archH)
  const piers = useMemo(() => archWallPiers(width, count, archW), [width, count, archW])
  return (
    <group>
      <mesh geometry={geo} position={[0, 0, z]} material={m} />
      {piers.map(([a, b], i) => <Collider key={i} minX={a} maxX={b} minZ={z - depth / 2} maxZ={z + depth / 2} />)}
    </group>
  )
}

/** Mihrab niche with recessed levels and gold frames, on a wall facing −z. */
export function Mihrab({ z, levels = 1, w = 1.6, h = 3.2 }: { z: number; levels?: number; w?: number; h?: number }) {
  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: levels }).map((_, i) => {
        const s = 1 - i * 0.22
        return (
          <group key={i} position={[0, 0, -0.01 - i * 0.02]} rotation={[0, Math.PI, 0]}>
            <mesh geometry={archPaneGeometry(w * s + 0.35, h * s + 0.25)} position={[0, -0.05, 0.001 * i]} material={MAT.gold} />
            <mesh geometry={archPaneGeometry(w * s, h * s)} position={[0, 0, 0.003 + 0.001 * i]} material={i === levels - 1 ? MAT.green : MAT.whiteWarm} />
          </group>
        )
      })}
      <mesh position={[0, h + 0.6, -0.02]} material={MAT.gold}><boxGeometry args={[w + 1.2, 0.12, 0.04]} /></mesh>
    </group>
  )
}

export function Chandelier({ p, r = 0.9 }: { p: [number, number, number]; r?: number }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.9, 0]} material={MAT.brass}><cylinderGeometry args={[0.015, 0.015, 1.8, 4]} /></mesh>
      <mesh material={MAT.brass} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.04, 6, 28]} /></mesh>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 10) * Math.PI * 2) * r, 0.1, Math.sin((i / 10) * Math.PI * 2) * r]} material={MAT.glowWarm}>
          <sphereGeometry args={[0.07, 8, 6]} />
        </mesh>
      ))}
    </group>
  )
}

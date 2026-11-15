import { useMemo } from 'react'
import * as THREE from 'three'
import { BuildPart, Palm } from '../shared/parts'
import { useMats, GHOST } from '../shared/materials'
import { rng } from '../shared/env'

export const UHUD_PARTS = 6

/** Low-poly red-granite ridge. Returns a geometry with vertex colours. */
export function mountainGeometry(width: number, depth: number, height: number, seed = 4, segX = 46, segZ = 20) {
  const g = new THREE.PlaneGeometry(width, depth, segX, segZ)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position as THREE.BufferAttribute
  const r = rng(seed)
  const noise = Array.from({ length: pos.count }, () => r())
  const colors = new Float32Array(pos.count * 3)
  const low = new THREE.Color('#6e3423'), mid = new THREE.Color('#a9573a'), high = new THREE.Color('#d08a5c')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const nx = x / (width / 2), nz = z / (depth / 2)
    const edge = Math.max(0, 1 - nx * nx) ** 0.7 * Math.max(0, 1 - Math.abs(nz) ** 2.2)
    const ridge = Math.exp(-(((nz + 0.1) * 1.5) ** 2) * 1.6)
    const peaks = 0.55 + 0.45 * Math.sin(nx * 7.3 + 1.2) * Math.cos(nx * 2.9 - 0.4)
    const h = height * edge * ridge * (0.5 + 0.5 * peaks) + (noise[i] - 0.5) * height * 0.08 * edge
    pos.setY(i, Math.max(0, h))
    const t = Math.min(1, Math.max(0, h / height))
    if (t < 0.45) c.copy(low).lerp(mid, t / 0.45)
    else c.copy(mid).lerp(high, (t - 0.45) / 0.55)
    c.multiplyScalar(0.88 + noise[i] * 0.22)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

/**
 * Simplified Mount Uhud: the red granite ridge, Archers' Hill (Jabal al-Rumah)
 * in front of it, and a symbolic wall marking the Martyrs' cemetery.
 */
export function UhudModel() {
  const M = useMats()
  const ghost = M.white === GHOST
  const mountain = useMemo(() => mountainGeometry(24, 10, 6.2), [])
  const hill = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1)
    const pos = g.attributes.position as THREE.BufferAttribute
    const r = rng(9)
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0) pos.setY(i, 0)
      pos.setX(i, pos.getX(i) * (0.9 + r() * 0.2))
    }
    g.computeVertexNormals()
    return g
  }, [])
  const hillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b26a45', flatShading: true, roughness: 0.95 }), [])
  return (
    <group>
      <BuildPart order={0} drop={0}>
        <mesh geometry={mountain} position={[0, 0, -4.6]} castShadow receiveShadow material={ghost ? GHOST : M.granite} />
      </BuildPart>
      <BuildPart order={1} drop={0.2}>
        <mesh position={[0, 0.02, 1.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M.sandDark as THREE.Material}>
          <circleGeometry args={[4.2, 28]} />
        </mesh>
      </BuildPart>
      {/* Archers' Hill */}
      <BuildPart order={2} drop={0.6}>
        <mesh geometry={hill} position={[-2.4, 0, 2.0]} scale={[1.5, 0.8, 1.2]} castShadow receiveShadow material={ghost ? GHOST : hillMat} />
      </BuildPart>
      {/* Martyrs' cemetery: symbolic enclosure wall only */}
      <BuildPart order={3}>
        <group position={[2.3, 0, 1.6]}>
          {[
            [0, -0.9, 2.6, 0.12], [-1.25, 0, 0.12, 1.8], [1.25, 0, 0.12, 1.8],
            [-0.85, 0.9, 0.9, 0.12], [0.85, 0.9, 0.9, 0.12],
          ].map(([x, z, w, d], i) => (
            <mesh key={i} position={[x, 0.16, z]} castShadow receiveShadow material={M.plaster as THREE.Material}>
              <boxGeometry args={[w, 0.32, d]} />
            </mesh>
          ))}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.sand as THREE.Material}>
            <planeGeometry args={[2.4, 1.7]} />
          </mesh>
        </group>
      </BuildPart>
      <BuildPart order={4}>
        <Palm p={[3.9, 0, 0.5]} h={1.5} rotY={0.2} />
        <Palm p={[4.1, 0, 2.5]} h={1.3} rotY={1.7} lean={0.08} />
        <Palm p={[0.4, 0, 3.4]} h={1.4} rotY={3.1} />
      </BuildPart>
      {/* info sign */}
      <BuildPart order={5}>
        <group position={[-0.4, 0, 3.2]}>
          <mesh position={[0, 0.3, 0]} material={M.woodDark as THREE.Material}><boxGeometry args={[0.06, 0.6, 0.06]} /></mesh>
          <mesh position={[0, 0.62, 0]} material={M.green as THREE.Material}><boxGeometry args={[0.6, 0.34, 0.05]} /></mesh>
        </group>
      </BuildPart>
    </group>
  )
}

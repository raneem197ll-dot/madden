import * as THREE from 'three'
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useMats } from './materials'
import { clamp01, easeOutBack } from './env'

/* ------------------------------------------------------------------ */
/* Geometry factories (memoised per argument set)                       */
/* ------------------------------------------------------------------ */
const geoCache = new Map<string, THREE.BufferGeometry>()
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined
  if (!g) { g = make(); geoCache.set(key, g) }
  return g
}

function archPath(shape: THREE.Path, cx: number, y0: number, w: number, h: number) {
  const r = w / 2
  shape.moveTo(cx - r, y0)
  shape.lineTo(cx - r, y0 + h - r)
  shape.absarc(cx, y0 + h - r, r, Math.PI, 0, true)
  shape.lineTo(cx + r, y0)
  shape.lineTo(cx - r, y0)
}

/** A wall panel (centred on x, base at y=0) with `count` real arched openings. */
export function archWallGeometry(width: number, height: number, depth: number, count: number, archW: number, archH: number, sill = 0) {
  return cached(`aw-${width}-${height}-${depth}-${count}-${archW}-${archH}-${sill}`, () => {
    const s = new THREE.Shape()
    s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(width / 2, height); s.lineTo(-width / 2, height); s.lineTo(-width / 2, 0)
    const step = width / count
    for (let i = 0; i < count; i++) {
      const cx = -width / 2 + step * (i + 0.5)
      const hole = new THREE.Path()
      archPath(hole, cx, sill, archW, archH)
      s.holes.push(hole)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 })
    g.translate(0, 0, -depth / 2)
    g.computeVertexNormals()
    return g
  })
}

/** Pier (solid) x-ranges of an arch wall, for colliders. */
export function archWallPiers(width: number, count: number, archW: number) {
  const step = width / count
  const out: [number, number][] = []
  let x = -width / 2
  for (let i = 0; i < count; i++) {
    const cx = -width / 2 + step * (i + 0.5)
    out.push([x, cx - archW / 2])
    x = cx + archW / 2
  }
  out.push([x, width / 2])
  return out.filter(([a, b]) => b - a > 0.02)
}

/** Flat arch silhouette (windows, mihrab marker, panes). */
export function archPaneGeometry(w: number, h: number) {
  return cached(`ap-${w}-${h}`, () => {
    const s = new THREE.Shape()
    archPath(s, 0, 0, w, h)
    return new THREE.ShapeGeometry(s, 10)
  })
}

/** Square slab with a circular hole (ceiling bay below a dome). */
export function holedSlabGeometry(w: number, d: number, r: number) {
  return cached(`hs-${w}-${d}-${r}`, () => {
    const s = new THREE.Shape()
    s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.lineTo(-w / 2, -d / 2)
    const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(hole)
    const g = new THREE.ShapeGeometry(s, 24)
    g.rotateX(Math.PI / 2)
    return g
  })
}

export function domeGeometry(r: number, w = 18, h = 9) {
  return cached(`dome-${r}-${w}-${h}`, () => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2))
}

/* ------------------------------------------------------------------ */
/* Construction animation                                               */
/* ------------------------------------------------------------------ */
export const BuildContext = createContext<{ progress: React.MutableRefObject<number> | null; total: number }>({ progress: null, total: 1 })

/** Each part rises & pops in at its own moment of the build progress. */
export function BuildPart({ order, children, drop = 2.2, ...rest }: { order: number; children: ReactNode; drop?: number } & ThreeElements['group']) {
  const ctx = useContext(BuildContext)
  const ref = useRef<THREE.Group>(null)
  const base = useRef<THREE.Vector3 | null>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    if (!base.current) base.current = g.position.clone()
    if (!ctx.progress) {
      if (!g.visible || g.scale.x !== 1) { g.visible = true; g.scale.setScalar(1); g.position.copy(base.current) }
      return
    }
    const p = ctx.progress.current
    const n = Math.max(ctx.total, 1)
    const start = (order / n) * 0.78
    const t = clamp01((p - start) / 0.22)
    g.visible = t > 0.001
    const e = easeOutBack(t)
    g.scale.set(Math.max(0.001, Math.min(e, 1.08)), Math.max(0.001, e), Math.max(0.001, Math.min(e, 1.08)))
    g.position.set(base.current.x, base.current.y + (1 - Math.min(1, t * 1.2)) * drop, base.current.z)
  })
  return <group ref={ref} {...rest}>{children}</group>
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                     */
/* ------------------------------------------------------------------ */
type V3 = [number, number, number]
type MatKey = keyof ReturnType<typeof useMats>

export function Box({ p, s, m = 'white', r, cast = true, receive = true }: { p: V3; s: V3; m?: MatKey; r?: V3; cast?: boolean; receive?: boolean }) {
  const M = useMats()
  return (
    <mesh position={p} rotation={r} castShadow={cast} receiveShadow={receive} material={M[m] as THREE.Material}>
      <boxGeometry args={s} />
    </mesh>
  )
}

export function Cyl({ p, r, h, m = 'white', seg = 16, rTop, rot }: { p: V3; r: number; h: number; m?: MatKey; seg?: number; rTop?: number; rot?: V3 }) {
  const M = useMats()
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow material={M[m] as THREE.Material}>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
    </mesh>
  )
}

export function Dome({ p, r, m = 'white', finial = true, seg = 16, squash = 1 }: { p: V3; r: number; m?: MatKey; finial?: boolean; seg?: number; squash?: number }) {
  const M = useMats()
  const geo = domeGeometry(r, seg, Math.max(5, Math.round(seg / 2)))
  return (
    <group position={p}>
      <mesh geometry={geo} scale={[1, squash, 1]} castShadow receiveShadow material={M[m] as THREE.Material} />
      {finial && (
        <>
          <mesh position={[0, r * squash + r * 0.12, 0]} material={M.gold}>
            <cylinderGeometry args={[r * 0.03, r * 0.05, r * 0.26, 6]} />
          </mesh>
          <mesh position={[0, r * squash + r * 0.3, 0]} material={M.gold}>
            <sphereGeometry args={[r * 0.07, 8, 6]} />
          </mesh>
          <Crescent p={[0, r * squash + r * 0.46, 0]} s={r * 0.12} />
        </>
      )}
    </group>
  )
}

export function Crescent({ p, s }: { p: V3; s: number }) {
  const M = useMats()
  return (
    <mesh position={p} rotation={[0, 0, Math.PI / 2 + 0.5]} material={M.gold}>
      <torusGeometry args={[s, s * 0.28, 6, 14, Math.PI * 1.35]} />
    </mesh>
  )
}

/** Minaret: square base → octagonal shaft → round upper shaft, balconies, cap. */
export function Minaret({ p, h = 4.5, r = 0.26, m = 'white' }: { p: V3; h?: number; r?: number; m?: MatKey }) {
  const baseH = h * 0.32
  const octH = h * 0.38
  const roundH = h * 0.18
  return (
    <group position={p}>
      <Box p={[0, baseH / 2, 0]} s={[r * 2.7, baseH, r * 2.7]} m={m} />
      <Box p={[0, baseH + 0.04, 0]} s={[r * 3, 0.08, r * 3]} m="stoneTrim" />
      <Cyl p={[0, baseH + octH / 2, 0]} r={r} h={octH} seg={8} m={m} />
      <Cyl p={[0, baseH + octH + 0.05, 0]} r={r * 1.45} h={0.1} seg={8} m={m} />
      <Cyl p={[0, baseH + octH + 0.14, 0]} r={r * 1.4} h={0.08} seg={8} m="stoneTrim" />
      <Cyl p={[0, baseH + octH + 0.1 + roundH / 2, 0]} r={r * 0.78} h={roundH} seg={14} m={m} />
      <Cyl p={[0, baseH + octH + 0.12 + roundH, 0]} r={r * 1.2} h={0.08} seg={14} m={m} />
      <Dome p={[0, baseH + octH + 0.16 + roundH, 0]} r={r * 0.8} seg={12} squash={1.35} m={m} />
    </group>
  )
}

/** Low-poly date palm. */
export function Palm({ p, h = 2.2, lean = 0, rotY = 0, scale = 1 }: { p: V3; h?: number; lean?: number; rotY?: number; scale?: number }) {
  const M = useMats()
  const leaf = useMemo(() => cached('palm-leaf', () => {
    const g = new THREE.ConeGeometry(0.16, 1.1, 3, 1, true)
    g.translate(0, 0.55, 0)
    g.rotateZ(-Math.PI / 2)
    g.scale(1, 0.25, 1)
    return g
  }), [])
  return (
    <group position={p} rotation={[0, rotY, lean]} scale={scale}>
      <mesh position={[0, h / 2, 0]} castShadow material={M.palmTrunk}>
        <cylinderGeometry args={[0.06, 0.1, h, 6]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} geometry={leaf} position={[0, h, 0]} rotation={[0, (i / 8) * Math.PI * 2, -0.5 - (i % 2) * 0.25]} castShadow material={M.palmLeaf} />
      ))}
    </group>
  )
}

/** A row of arch-shaped decals (openings / windows), merged into one draw call. */
export function ArchRow({ p, w, count, aw, ah, rotY = 0, m = 'opening', y0 = 0 }: { p: V3; w: number; count: number; aw: number; ah: number; rotY?: number; m?: MatKey; y0?: number }) {
  const M = useMats()
  const geo = cached(`ar-${w}-${count}-${aw}-${ah}-${y0}`, () => {
    const step = w / count
    const parts = Array.from({ length: count }, (_, i) => archPaneGeometry(aw, ah).clone().translate(-w / 2 + step * (i + 0.5), y0, 0))
    return mergeGeometries(parts)!
  })
  return <mesh position={p} rotation={[0, rotY, 0]} geometry={geo} material={M[m] as THREE.Material} />
}

/** A row of rectangular window decals, merged. */
export function WindowRow({ p, w, count, ww, wh, rotY = 0, m = 'opening' }: { p: V3; w: number; count: number; ww: number; wh: number; rotY?: number; m?: MatKey }) {
  const M = useMats()
  const geo = cached(`wr-${w}-${count}-${ww}-${wh}`, () => {
    const step = w / count
    const parts = Array.from({ length: count }, (_, i) => new THREE.PlaneGeometry(ww, wh).translate(-w / 2 + step * (i + 0.5), 0, 0))
    return mergeGeometries(parts)!
  })
  return <mesh position={p} rotation={[0, rotY, 0]} geometry={geo} material={M[m] as THREE.Material} />
}

/** Many small domes as one instanced mesh. */
export function DomeField({ points, r, m = 'white' }: { points: V3[]; r: number; m?: MatKey }) {
  const M = useMats()
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = domeGeometry(r, 10, 5)
  useMemo(() => null, [])
  return (
    <instancedMesh
      ref={(im) => {
        ref.current = im
        if (!im) return
        const o = new THREE.Object3D()
        points.forEach((pt, i) => { o.position.set(...pt); o.updateMatrix(); im.setMatrixAt(i, o.matrix) })
        im.instanceMatrix.needsUpdate = true
        im.computeBoundingSphere()
      }}
      args={[geo, M[m] as THREE.Material, points.length]}
      castShadow
      receiveShadow
    />
  )
}

export { cached }

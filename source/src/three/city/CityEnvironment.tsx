import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { AYR, CITY_RADIUS, HOUSES, PALMS, PARKS, RIM, RING_LAMPS, ROADS, ROAD_LAMPS, WADI, grows, roadVisible, type PalmPt } from './layout'
import { asphaltTex, facadeTex, sandTex, textPanel, tileFloorTex } from '../shared/textures'
import { MAT } from '../shared/materials'
import { easeOutBack, registerGlow, rng } from '../shared/env'
import { useGame, viewUnlocked } from '../../state/gameStore'
import type { LandmarkId } from '../../data/types'

/** Unlock state the city should currently grow from (own / friend / replay). */
export const useGrowthUnlocked = () => useGame(useShallow((s) => viewUnlocked(s)))

/**
 * Animates instanced items in and out (scale 0 ↔ 1) when their visibility changes,
 * with a per-item delay so new districts "grow" outward as a wave.
 */
function useGrowth(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  targets: boolean[],
  delays: number[],
  apply: (i: number, scale: number, o: THREE.Object3D) => void,
) {
  const state = useRef<{ cur: Float32Array; from: Float32Array; start: Float64Array; active: Set<number>; init: boolean } | null>(null)
  const o = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    const n = targets.length
    if (!state.current || state.current.cur.length !== n) {
      state.current = { cur: new Float32Array(n), from: new Float32Array(n), start: new Float64Array(n), active: new Set(), init: false }
    }
    const st = state.current
    const im = ref.current
    if (!im) return
    if (!st.init) {
      targets.forEach((t, i) => { st.cur[i] = t ? 1 : 0; apply(i, Math.max(0.0001, st.cur[i]), o); im.setMatrixAt(i, o.matrix) })
      im.instanceMatrix.needsUpdate = true
      im.computeBoundingSphere()
      st.init = true
      return
    }
    const now = performance.now()
    targets.forEach((t, i) => {
      const goal = t ? 1 : 0
      if (Math.abs(st.cur[i] - goal) > 0.001) {
        st.from[i] = st.cur[i]
        st.start[i] = now + (t ? delays[i] : delays[i] * 0.15)
        st.active.add(i)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets])
  useFrame(() => {
    const st = state.current
    const im = ref.current
    if (!st || !im || !st.active.size) return
    const now = performance.now()
    for (const i of st.active) {
      const goal = targets[i] ? 1 : 0
      const k = Math.min(1, Math.max(0, (now - st.start[i]) / 650))
      const e = goal ? easeOutBack(k) : 1 - k
      st.cur[i] = goal ? st.from[i] + (1 - st.from[i]) * e : st.from[i] * e
      apply(i, Math.max(0.0001, st.cur[i]), o)
      im.setMatrixAt(i, o.matrix)
      if (k >= 1) { st.cur[i] = goal; st.active.delete(i) }
    }
    im.instanceMatrix.needsUpdate = true
  })
}

/* ---------------- diorama base ---------------- */
function Base() {
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      map: textPanel('strata', 64, 256, (g, w, h) => {
        const bands = ['#e2cb9b', '#cfa978', '#b98a5c', '#9c6a45', '#5b4a43', '#3d3739']
        bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i / bands.length) * h, w, h / bands.length + 1) })
        const r = rng(3)
        for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 2) }
      }),
      roughness: 1,
    })
    const top = new THREE.MeshStandardMaterial({ map: sandTex([24, 24]), roughness: 1 })
    const bottom = new THREE.MeshStandardMaterial({ color: '#2c2826' })
    return [side, top, bottom]
  }, [])
  return (
    <group>
      <mesh position={[0, -1.6, 0]} receiveShadow material={mats}>
        <cylinderGeometry args={[CITY_RADIUS, CITY_RADIUS + 1, 3.2, 160, 1]} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.gold}>
        <ringGeometry args={[CITY_RADIUS - 0.22, CITY_RADIUS + 0.02, 160]} />
      </mesh>
    </group>
  )
}

/** One mesh per polyline: a flat strip with UVs along its length (v = distance / 2.4). */
export function ribbonGeometry(pts: [number, number][], w: number, closed = false) {
  const n = pts.length
  const pos = new Float32Array(n * 2 * 3)
  const uv = new Float32Array(n * 2 * 2)
  let acc = 0
  for (let i = 0; i < n; i++) {
    const prev = pts[i === 0 ? (closed ? n - 2 : 0) : i - 1]
    const next = pts[i === n - 1 ? (closed ? 1 : n - 1) : i + 1]
    let dx = next[0] - prev[0], dz = next[1] - prev[1]
    const l = Math.hypot(dx, dz) || 1
    dx /= l; dz /= l
    if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    const nx = -dz * (w / 2), nz = dx * (w / 2)
    pos.set([pts[i][0] + nx, 0, pts[i][1] + nz, pts[i][0] - nx, 0, pts[i][1] - nz], i * 6)
    uv.set([0, acc / 2.4, 1, acc / 2.4], i * 4)
  }
  const idx: number[] = []
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/* ---------------- roads (grow along their length when they appear) ---------------- */
const roadMats = {
  asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex([1, 1]), roughness: 0.95 }),
  walk: new THREE.MeshStandardMaterial({ color: '#e8dcc4', roughness: 0.85 }),
  curb: new THREE.MeshStandardMaterial({ color: '#d9ccb0', roughness: 0.9 }),
}
function Road({ index, visible, grownAt }: { index: number; visible: boolean; grownAt?: number }) {
  const r = ROADS[index]
  const geo = useMemo(() => ribbonGeometry(r.pts, r.w, r.closed), [r])
  const curbs = useMemo(() => (r.kind === 'ring' && index === 0 ? [ribbonGeometry(r.pts, r.w + 0.22, r.closed)] : []), [r, index])
  const total = geo.index!.count
  const cur = useRef(visible ? 1 : 0)
  const startAt = useRef(0)
  const mesh = useRef<THREE.Mesh>(null)
  useEffect(() => {
    startAt.current = Math.max(performance.now(), grownAt ?? 0) + (r.need ? r.need * 250 : 0)
  }, [visible, grownAt, r.need])
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    const goal = visible ? 1 : 0
    if (goal === 1 && performance.now() < startAt.current) { m.visible = cur.current > 0.001; return }
    if (Math.abs(cur.current - goal) > 0.0005) {
      cur.current += (goal - cur.current) * Math.min(1, dt * (goal ? 1.4 : 4))
      if (Math.abs(cur.current - goal) < 0.002) cur.current = goal
    }
    geo.setDrawRange(0, Math.floor((total / 6) * cur.current) * 6)
    m.visible = cur.current > 0.001
  })
  const y = r.kind === 'ring' ? 0.022 : r.kind === 'walk' ? 0.026 : 0.018
  return (
    <group>
      {curbs.map((g, i) => <mesh key={i} geometry={g} position={[0, y - 0.004, 0]} material={roadMats.curb} receiveShadow />)}
      <mesh ref={mesh} geometry={geo} position={[0, y, 0]} material={r.kind === 'walk' ? roadMats.walk : roadMats.asphalt} receiveShadow />
    </group>
  )
}

function Roads({ unlocked }: { unlocked: Record<LandmarkId, boolean> }) {
  const grownAt = useGame((s) => s.grownAt)
  return (
    <group>
      {ROADS.map((r, i) => <Road key={i} index={i} visible={roadVisible(r, unlocked)} grownAt={r.landmark ? grownAt[r.landmark] : undefined} />)}
    </group>
  )
}

/** Wadi al-Aqiq: a dry, lighter valley bed (approximate course). */
function Wadi() {
  const geo = useMemo(() => ribbonGeometry(WADI.pts, WADI.w), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: sandTex([1, 1], '#cbb48a'), color: '#e3d2ae', roughness: 1 }), [])
  return <mesh geometry={geo} position={[0, 0.01, 0]} material={mat} receiveShadow />
}

function Parks({ unlocked }: { unlocked: Record<LandmarkId, boolean> }) {
  return (
    <group>
      {PARKS.map((p, i) => <GrowDisc key={i} x={p.x} z={p.z} r={p.r} visible={grows(p.district, p.reveal, unlocked)} />)}
    </group>
  )
}

function GrowDisc({ x, z, r, visible }: { x: number; z: number; r: number; visible: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const cur = useRef(visible ? 1 : 0)
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    cur.current += ((visible ? 1 : 0) - cur.current) * Math.min(1, dt * 2)
    m.scale.setScalar(Math.max(0.0001, cur.current))
    m.visible = cur.current > 0.01
  })
  return (
    <mesh ref={ref} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT.grass}>
      <circleGeometry args={[r, 24]} />
    </mesh>
  )
}

/* ---------------- houses (instanced per archetype, growing by district) ---------------- */
const TINTS = ['#fbf3e4', '#f3e3c6', '#ead2aa', '#f6efe6', '#e8c9a5', '#efe0cc', '#ddd3c2']

function HouseSet({ floors, unlocked }: { floors: 1 | 2 | 3 | 5 | 9; unlocked: Record<LandmarkId, boolean> }) {
  const list = useMemo(() => HOUSES.filter((h) => h.floors === floors), [floors])
  const ref = useRef<THREE.InstancedMesh>(null)
  const { geo, mats } = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    const cols = floors >= 5 ? 4 : 3
    const side = new THREE.MeshStandardMaterial({
      map: facadeTex(floors, cols, false, floors),
      emissiveMap: facadeTex(floors, cols, true, floors),
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0,
      roughness: 0.9,
    })
    const roof = new THREE.MeshStandardMaterial({ color: '#efe4cf', roughness: 1 })
    return { geo: g, mats: [side, side, roof, roof, side, side] }
  }, [floors])
  useEffect(() => registerGlow(mats[0] as THREE.MeshStandardMaterial, 0, 0.95), [mats])
  useEffect(() => {
    const im = ref.current
    if (!im) return
    const c = new THREE.Color()
    list.forEach((h, i) => im.setColorAt(i, c.set(TINTS[Math.floor(h.tint * TINTS.length)])))
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [list])
  const targets = useMemo(() => list.map((h) => grows(h.district, h.reveal, unlocked)), [list, unlocked])
  const delays = useMemo(() => list.map((h) => h.delay), [list])
  useGrowth(ref, targets, delays, (i, s, o) => {
    const h = list[i]
    o.position.set(h.x, 0, h.z)
    o.rotation.set(0, h.rot, 0)
    const k = s < 0.01 ? 0.0001 : Math.min(1, 0.6 + s * 0.4)
    o.scale.set(h.w * k, h.h * Math.max(s, 0.0001), h.d * k)
    o.updateMatrix()
  })
  if (!list.length) return null
  return <instancedMesh ref={ref} args={[geo, mats, list.length]} castShadow receiveShadow />
}

function RoofDetails({ unlocked }: { unlocked: Record<LandmarkId, boolean> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const list = useMemo(() => {
    const r = rng(42)
    return HOUSES.filter(() => r() > 0.55).map((h) => ({ ...h, ox: (r() - 0.5) * h.w * 0.5, oz: (r() - 0.5) * h.d * 0.5, s: 0.16 + r() * 0.12 }))
  }, [])
  const targets = useMemo(() => list.map((h) => grows(h.district, h.reveal, unlocked)), [list, unlocked])
  const delays = useMemo(() => list.map((h) => h.delay + 300), [list])
  useGrowth(ref, targets, delays, (i, s, o) => {
    const h = list[i]
    o.position.set(h.x + h.ox, h.h * Math.min(1, s) + (h.s * s) / 2, h.z + h.oz)
    o.rotation.set(0, h.rot, 0)
    o.scale.setScalar(h.s * s)
    o.updateMatrix()
  })
  return (
    <instancedMesh ref={ref} args={[undefined, MAT.whiteWarm, list.length]} castShadow>
      <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
    </instancedMesh>
  )
}

/* ---------------- palms (instanced trunk + crown) ---------------- */
export const palmCrownGeometry = (() => {
  let g: THREE.BufferGeometry | null = null
  return () => {
    if (g) return g
    const leaves: THREE.BufferGeometry[] = []
    for (let i = 0; i < 8; i++) {
      const l = new THREE.ConeGeometry(0.2, 1.2, 3, 1, true)
      l.translate(0, 0.6, 0)
      l.rotateZ(-Math.PI / 2 + -0.45 - (i % 2) * 0.3)
      l.scale(1, 1, 0.3)
      l.rotateY((i / 8) * Math.PI * 2)
      leaves.push(l.toNonIndexed())
    }
    g = mergeGeometries(leaves)!
    g.computeVertexNormals()
    return g
  }
})()

export function PalmInstances({ points, visible }: { points: PalmPt[]; visible?: boolean[] }) {
  const trunk = useRef<THREE.InstancedMesh>(null)
  const crown = useRef<THREE.InstancedMesh>(null)
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.06, 0.1, 1, 5).translate(0, 0.5, 0), [])
  const targets = useMemo(() => visible ?? points.map(() => true), [visible, points])
  const delays = useMemo(() => points.map((p) => p.delay ?? 0), [points])
  useGrowth(trunk, targets, delays, (i, s, o) => {
    const p = points[i]
    o.position.set(p.x, 0, p.z); o.rotation.set(0, p.rot, 0); o.scale.set(p.s * s, p.h * 1.15 * s, p.s * s); o.updateMatrix()
  })
  useGrowth(crown, targets, delays, (i, s, o) => {
    const p = points[i]
    o.position.set(p.x, p.h * 1.15 * s, p.z); o.rotation.set(0, p.rot, 0); o.scale.setScalar(p.s * s); o.updateMatrix()
  })
  return (
    <group>
      <instancedMesh ref={trunk} args={[trunkGeo, MAT.palmTrunk, points.length]} castShadow />
      <instancedMesh ref={crown} args={[palmCrownGeometry(), MAT.palmLeaf, points.length]} castShadow />
    </group>
  )
}

function CityPalms({ unlocked }: { unlocked: Record<LandmarkId, boolean> }) {
  const visible = useMemo(
    () => PALMS.map((p) => (p.road !== undefined ? roadVisible(ROADS[p.road], unlocked) : grows(p.district ?? 'outer', p.reveal ?? 1, unlocked))),
    [unlocked],
  )
  return <PalmInstances points={PALMS} visible={visible} />
}

function ParkPalms({ unlocked }: { unlocked: Record<LandmarkId, boolean> }) {
  const pts = useMemo(() => {
    const r = rng(8)
    return PARKS.flatMap((p) => Array.from({ length: Math.round(p.r * 2.2) }, () => {
      const a = r() * 6.28, d = r() * p.r * 0.8
      return { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, h: 0.8 + r() * 0.6, s: 0.5 + r() * 0.25, rot: r() * 6.28, district: p.district, reveal: p.reveal, delay: r() * 500 }
    }))
  }, [])
  const visible = useMemo(() => pts.map((p) => grows(p.district, p.reveal, unlocked)), [pts, unlocked])
  return <PalmInstances points={pts} visible={visible} />
}

/* ---------------- lamps ---------------- */
const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff1cf', emissive: '#ffc46b', emissiveIntensity: 0.1 })
registerGlow(bulbMat, 0.1, 3.2)

function RingLamps() {
  const poles = useRef<THREE.InstancedMesh>(null)
  const bulbs = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const o = new THREE.Object3D()
    RING_LAMPS.forEach((l, i) => {
      o.position.set(l.x, 0.45, l.z); o.updateMatrix(); poles.current?.setMatrixAt(i, o.matrix)
      o.position.set(l.x, 0.92, l.z); o.updateMatrix(); bulbs.current?.setMatrixAt(i, o.matrix)
    })
    for (const im of [poles.current, bulbs.current]) if (im) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }
  }, [])
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, MAT.iron, RING_LAMPS.length]}>
        <cylinderGeometry args={[0.025, 0.035, 0.9, 5]} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, bulbMat, RING_LAMPS.length]}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </instancedMesh>
    </group>
  )
}

/** Street lamps that appear along a road once it has been built. */
function RoadLamps({ unlocked }: { unlocked: Record<LandmarkId, boolean> }) {
  const poles = useRef<THREE.InstancedMesh>(null)
  const bulbs = useRef<THREE.InstancedMesh>(null)
  const grownAt = useGame((s) => s.grownAt)
  const targets = useMemo(() => ROAD_LAMPS.map((l) => roadVisible(ROADS[l.road], unlocked)), [unlocked])
  const delays = useMemo(() => ROAD_LAMPS.map((l) => {
    const lm = ROADS[l.road].landmark
    const extra = lm && grownAt[lm] ? Math.max(0, grownAt[lm]! - performance.now()) : 0
    return l.delay + extra + 400
  }), [grownAt])
  useGrowth(poles, targets, delays, (i, s, o) => { const l = ROAD_LAMPS[i]; o.position.set(l.x, 0.42 * s, l.z); o.rotation.set(0, 0, 0); o.scale.set(s < 0.01 ? 0.0001 : 1, s, s < 0.01 ? 0.0001 : 1); o.updateMatrix() })
  useGrowth(bulbs, targets, delays, (i, s, o) => { const l = ROAD_LAMPS[i]; o.position.set(l.x, 0.86 * s, l.z); o.rotation.set(0, 0, 0); o.scale.setScalar(s); o.updateMatrix() })
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, MAT.iron, ROAD_LAMPS.length]}>
        <cylinderGeometry args={[0.022, 0.03, 0.84, 5]} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, bulbMat, ROAD_LAMPS.length]}>
        <sphereGeometry args={[0.065, 8, 6]} />
      </instancedMesh>
    </group>
  )
}

/* ---------------- rim hills, lava fields (harrat) & Mount Ayr ---------------- */
function Rim() {
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a8603f', flatShading: true, roughness: 1 }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5b514b', flatShading: true, roughness: 1 }), [])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  // all lava patches merged into one mesh, with scattered basalt rocks
  const lava = useMemo(() => {
    const r = rng(41)
    const parts = RIM.harrat.map((h) => {
      // irregular lava patch: a jittered polygon
      const g = new THREE.CircleGeometry(1, 12)
      const pos = g.attributes.position
      for (let i = 1; i < pos.count; i++) { const k = 0.7 + r() * 0.45; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, 0) }
      return g.rotateX(-Math.PI / 2).scale(h.s, 1, h.s * 0.62).rotateY(h.rot).translate(h.x, 0.012, h.z)
    })
    return mergeGeometries(parts)!
  }, [])
  const rocks = useMemo(() => {
    const r = rng(17)
    return RIM.harrat.flatMap((h) => Array.from({ length: 4 }, () => {
      const a = r() * 6.28, d = r() * h.s * 0.55
      return { x: h.x + Math.cos(a) * d, z: h.z + Math.sin(a) * d * 0.6, s: 0.12 + r() * 0.22, rot: r() * 6 }
    }))
  }, [])
  const ayr = useMemo(() => {
    const r = rng(23)
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i < 7; i++) {
      const g = new THREE.IcosahedronGeometry(1, 1)
      const t = (i - 3) / 3
      g.scale(2.6 + r() * 1.2, 2.2 + (1 - Math.abs(t)) * 2.8 + r() * 0.8, 2.2 + r() * 0.8)
      g.translate(AYR.x + t * 5.5, 0, AYR.z + t * 1.2 + (r() - 0.5))
      parts.push(g.toNonIndexed())
    }
    const m = mergeGeometries(parts)!
    m.computeVertexNormals()
    return m
  }, [])
  return (
    <group>
      {[true, false].map((isDark) => {
        const list = RIM.hills.map((h, i) => ({ ...h, i })).filter((h) => h.dark === isDark)
        return (
          <instancedMesh
            key={String(isDark)}
            ref={(im) => {
              if (!im) return
              const o = new THREE.Object3D()
              list.forEach((h, k) => { o.position.set(h.x, 0, h.z); o.rotation.set(0, h.i, 0); o.scale.set(h.s, h.h, h.s * 0.8); o.updateMatrix(); im.setMatrixAt(k, o.matrix) })
              im.instanceMatrix.needsUpdate = true
              im.computeBoundingSphere()
            }}
            args={[geo, isDark ? dark : red, list.length]}
            castShadow
            receiveShadow
          />
        )
      })}
      <mesh geometry={lava} material={MAT.lava} receiveShadow />
      <instancedMesh
        ref={(im) => {
          if (!im) return
          const o = new THREE.Object3D()
          rocks.forEach((k, i) => { o.position.set(k.x, k.s * 0.4, k.z); o.rotation.set(k.rot, k.rot * 2, 0); o.scale.setScalar(k.s); o.updateMatrix(); im.setMatrixAt(i, o.matrix) })
          im.instanceMatrix.needsUpdate = true
          im.computeBoundingSphere()
        }}
        args={[undefined, dark, rocks.length]}
        castShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <mesh geometry={ayr} material={red} castShadow receiveShadow />
    </group>
  )
}

export function CityEnvironment() {
  const unlocked = useGrowthUnlocked()
  return (
    <group>
      <Base />
      <Wadi />
      <Roads unlocked={unlocked} />
      <Parks unlocked={unlocked} />
      {([1, 2, 3, 5, 9] as const).map((f) => <HouseSet key={f} floors={f} unlocked={unlocked} />)}
      <RoofDetails unlocked={unlocked} />
      <CityPalms unlocked={unlocked} />
      <ParkPalms unlocked={unlocked} />
      <RingLamps />
      <RoadLamps unlocked={unlocked} />
      <Rim />
    </group>
  )
}

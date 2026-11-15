import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGame } from '../../state/gameStore'
import { useShallow } from 'zustand/react/shallow'
import type { InfoContent, LandmarkId } from '../../data/types'
import { MAT } from '../shared/materials'
import { env } from '../shared/env'
import { sfx } from '../../lib/sfx'
import { tr } from '../../data/i18n'
import { POINTS } from '../../data/progression'
import { textPanel } from '../shared/textures'
import { useMemoryImage } from '../../state/photoStore'
import { COLLECTIBLE_MAP } from '../../data/collectibles'

/* ------------------------------------------------------------------ */
/* Input: written by DOM controls, read by the controller each frame.  */
/* ------------------------------------------------------------------ */
export const input = {
  joy: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  keys: new Set<string>(),
  taps: [] as { x: number; y: number }[],
  interact: false,
}
export function resetInput() {
  input.joy.x = input.joy.y = 0
  input.look.dx = input.look.dy = 0
  input.keys.clear()
  input.taps.length = 0
  input.interact = false
}

/* ------------------------------------------------------------------ */
/* Scene registry: colliders + interactables                          */
/* ------------------------------------------------------------------ */
export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number }
type InteractKind = 'info' | 'hidden' | 'memory'
interface Interactable { id: string; obj: THREE.Object3D; info: InfoContent; kind: InteractKind }

interface Ctx {
  scene: LandmarkId
  colliders: AABB[]
  items: Map<string, Interactable>
  focus: React.MutableRefObject<string | null>
}
const InteriorCtx = createContext<Ctx | null>(null)
export const useInterior = () => useContext(InteriorCtx)!

export function InteriorProvider({ scene, children }: { scene: LandmarkId; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({ scene, colliders: [], items: new Map(), focus: { current: null } }), [scene])
  return <InteriorCtx.Provider value={value}>{children}</InteriorCtx.Provider>
}

export function useCollider(box: AABB | null) {
  const ctx = useInterior()
  useEffect(() => {
    if (!box) return
    ctx.colliders.push(box)
    return () => { const i = ctx.colliders.indexOf(box); if (i >= 0) ctx.colliders.splice(i, 1) }
  }, [ctx, box])
}

/** Invisible collider (x/z rectangle). */
export function Collider({ minX, maxX, minZ, maxZ }: AABB) {
  const box = useMemo(() => ({ minX, maxX, minZ, maxZ }), [minX, maxX, minZ, maxZ])
  useCollider(box)
  return null
}

type V3 = [number, number, number]
/** Box mesh that also blocks the player (axis-aligned). */
export function Solid({ p, s, m, mat, collide = true, cast = false }: { p: V3; s: V3; m?: keyof typeof MAT; mat?: THREE.Material; collide?: boolean; cast?: boolean }) {
  const box = useMemo(() => {
    if (!collide) return null
    const bottom = p[1] - s[1] / 2, top = p[1] + s[1] / 2
    if (top < 0.25 || bottom > 1.9) return null
    return { minX: p[0] - s[0] / 2, maxX: p[0] + s[0] / 2, minZ: p[2] - s[2] / 2, maxZ: p[2] + s[2] / 2 }
  }, [p, s, collide])
  useCollider(box)
  return (
    <mesh position={p} material={mat ?? MAT[m ?? 'white']} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  )
}

/** Cylindrical column with base & capital; collides as a square. */
export function Column({ x, z, h, r = 0.32, m = 'white', cap = 'stoneTrim' }: { x: number; z: number; h: number; r?: number; m?: keyof typeof MAT; cap?: keyof typeof MAT }) {
  const box = useMemo(() => ({ minX: x - r - 0.08, maxX: x + r + 0.08, minZ: z - r - 0.08, maxZ: z + r + 0.08 }), [x, z, r])
  useCollider(box)
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.15, 0]} material={MAT[cap]}><boxGeometry args={[r * 2.6, 0.3, r * 2.6]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={MAT[m]}><cylinderGeometry args={[r, r * 1.08, h, 14]} /></mesh>
      <mesh position={[0, h - 0.18, 0]} material={MAT[cap]}><boxGeometry args={[r * 2.5, 0.36, r * 2.5]} /></mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Interactables                                                       */
/* ------------------------------------------------------------------ */
const markerGeo = new THREE.OctahedronGeometry(0.13, 0)
const markerMat = new THREE.MeshStandardMaterial({ color: '#f3d47a', emissive: '#e0a93a', emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.4 })
const markerSeen = new THREE.MeshStandardMaterial({ color: '#bfe3d2', emissive: '#4fa883', emissiveIntensity: 0.8, roughness: 0.3 })

export function Interactive({ info, kind = 'info', children, marker = [0, 2.2, 0], showMarker = true }: { info: InfoContent; kind?: InteractKind; children?: ReactNode; marker?: V3; showMarker?: boolean }) {
  const ctx = useInterior()
  const ref = useRef<THREE.Group>(null)
  const mk = useRef<THREE.Mesh>(null)
  const key = `${kind === 'hidden' ? 'hidden' : 'info'}:${ctx.scene}:${info.id}`
  const seen = useGame((s) => !!s.discoveries[key])
  useEffect(() => {
    if (!ref.current) return
    ctx.items.set(info.id, { id: info.id, obj: ref.current, info, kind })
    return () => { ctx.items.delete(info.id) }
  }, [ctx, info, kind])
  useFrame(() => {
    if (!mk.current) return
    const focused = ctx.focus.current === info.id
    mk.current.position.y = marker[1] + Math.sin(env.time * 2.4 + marker[0]) * 0.07
    mk.current.rotation.y += 0.03
    const s = focused ? 1.6 : 1
    mk.current.scale.setScalar(s)
  })
  const hiddenCollected = kind === 'hidden' && seen
  return (
    <group ref={ref}>
      {!hiddenCollected && children}
      {hiddenCollected && <group scale={0.0001}>{children}</group>}
      {showMarker && kind !== 'hidden' && (
        <mesh ref={mk} position={marker} geometry={markerGeo} material={seen ? markerSeen : markerMat} />
      )}
      {kind === 'hidden' && !seen && <HiddenGlint p={marker} />}
    </group>
  )
}

/** Faint sparkle that only shows when the player is close. */
function HiddenGlint({ p }: { p: V3 }) {
  const ref = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, depthWrite: false }), [])
  const world = useRef(new THREE.Vector3())
  useFrame(() => {
    const m = ref.current
    if (!m) return
    m.getWorldPosition(world.current)
    const d = world.current.distanceTo(camera.position)
    const near = THREE.MathUtils.clamp(1 - (d - 1.2) / 2.6, 0, 1)
    mat.opacity = near * (0.45 + 0.45 * Math.sin(env.time * 6))
    m.rotation.z += 0.05
  })
  return <mesh ref={ref} position={p} material={mat}><octahedronGeometry args={[0.09, 0]} /></mesh>
}

/** Resolve an interaction: open the card, award discovery, etc. */
export function interact(scene: LandmarkId, item: Interactable) {
  const s = useGame.getState()
  if (item.kind === 'memory') {
    s.setUi({ galleryFor: scene })
    return
  }
  const key = `${item.kind === 'hidden' ? 'hidden' : 'info'}:${scene}:${item.id}`
  const isNew = s.discover(key)
  const col = item.kind === 'hidden' ? COLLECTIBLE_MAP[`${scene}:${item.id}`] : undefined
  if (isNew) {
    if (item.kind === 'hidden') {
      sfx.collect(s.soundOn)
      s.toast({ kind: 'success', icon: col?.icon ?? '✨', title: `${tr('hiddenFound', s.lang)} ${col ? col.name[s.lang] : ''}`, body: `${s.lang === 'ar' ? 'أُضيف إلى مقتنياتك' : 'Added to your collection'} · +${POINTS.hidden}` })
    } else sfx.discover(s.soundOn)
  }
  s.setUi({ inspect: { ...item.info, tag: item.kind === 'hidden' ? 'hidden' : 'info', scene } })
  // interactive stories: finding the clue's object advances the story
  s.storyInspect(key)
}

const bbCache = new WeakMap<THREE.Object3D, THREE.Box3>()

/* ------------------------------------------------------------------ */
/* First-person controller                                             */
/* ------------------------------------------------------------------ */
export function PlayerController({ spawn, yaw = 0, eye = 1.62, radius = 0.3, speed = 3 }: { spawn: [number, number]; yaw?: number; eye?: number; radius?: number; speed?: number }) {
  const ctx = useInterior()
  const { camera, gl, size } = useThree()
  const st = useRef({ x: spawn[0], z: spawn[1], yaw, pitch: -0.05, bob: 0 })
  const step = useRef(0)
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    resetInput()
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = size.width < size.height ? 74 : 68
    cam.near = 0.05
    cam.updateProjectionMatrix()
    camera.rotation.order = 'YXZ'
  }, [camera, size.width, size.height])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'e' || k === 'enter') { input.interact = true; return }
      input.keys.add(k)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase())
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement) { input.look.dx += e.movementX; input.look.dy += e.movementY }
    }
    const blur = () => input.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('blur', blur)
    }
  }, [])

  const blocked = (x: number, z: number) => {
    for (const b of ctx.colliders) if (x > b.minX - radius && x < b.maxX + radius && z > b.minZ - radius && z < b.maxZ + radius) return true
    return false
  }

  const pickAt = (nx: number, ny: number, maxDist: number) => {
    ndc.set(nx, ny)
    ray.setFromCamera(ndc, camera)
    ray.far = maxDist
    const objs = [...ctx.items.values()].map((i) => i.obj)
    const hits = ray.intersectObjects(objs, true)
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o) {
        for (const it of ctx.items.values()) if (it.obj === o) return it
        o = o.parent
      }
    }
    return null
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const g = useGame.getState()
    if (import.meta.env.DEV) {
      const w = window as unknown as { __tp?: [number, number, number] }
      if (w.__tp) { [s.x, s.z, s.yaw] = w.__tp; s.pitch = -0.35; delete w.__tp }
    }
    const paused = !!g.inspect || !!g.galleryFor || g.fade.on

    // look
    const sens = 0.0042
    s.yaw -= input.look.dx * sens
    s.pitch -= input.look.dy * sens
    s.pitch = THREE.MathUtils.clamp(s.pitch, -1.25, 1.25)
    input.look.dx = input.look.dy = 0

    // move
    const k = input.keys
    let fwd = 0, str = 0
    if (!paused) {
      fwd = (k.has('w') || k.has('arrowup') || k.has('ص') ? 1 : 0) - (k.has('s') || k.has('arrowdown') || k.has('س') ? 1 : 0) - input.joy.y
      str = (k.has('d') || k.has('arrowright') || k.has('ي') ? 1 : 0) - (k.has('a') || k.has('arrowleft') || k.has('ش') ? 1 : 0) + input.joy.x
    }
    const mag = Math.hypot(fwd, str)
    if (mag > 1) { fwd /= mag; str /= mag }
    const run = k.has('shift') ? 1.6 : 1
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw)
    const rx = Math.cos(s.yaw), rz = -Math.sin(s.yaw)
    const vx = (fx * fwd + rx * str) * speed * run * dt
    const vz = (fz * fwd + rz * str) * speed * run * dt
    if (!blocked(s.x + vx, s.z)) s.x += vx
    if (!blocked(s.x, s.z + vz)) s.z += vz
    const moving = Math.hypot(vx, vz) > 0.0005
    s.bob += moving ? dt * 9 * run : 0
    if (moving) {
      step.current += dt
      if (step.current > 0.44 / run) { step.current = 0; sfx.footstep(g.soundOn) }
    }
    const bob = moving ? Math.sin(s.bob) * 0.035 : 0

    camera.position.set(s.x, eye + bob, s.z)
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ')

    // focus: crosshair ray first, then proximity in front
    let focus = pickAt(0, 0, 4.5)
    if (!focus) {
      let best = 2.6
      let bestC: THREE.Vector3 | null = null
      camera.getWorldDirection(tmp)
      for (const it of ctx.items.values()) {
        let bb = bbCache.get(it.obj)
        if (!bb) { it.obj.updateWorldMatrix(true, true); bb = new THREE.Box3().setFromObject(it.obj); bbCache.set(it.obj, bb) }
        const c = bb.isEmpty() ? it.obj.getWorldPosition(new THREE.Vector3()) : bb.getCenter(new THREE.Vector3())
        const dx = c.x - s.x, dz = c.z - s.z
        const d = Math.hypot(dx, dz)
        const dot = (dx * tmp.x + dz * tmp.z) / Math.max(d, 0.001) / Math.max(Math.hypot(tmp.x, tmp.z), 0.001)
        const reach = Math.max(1.6, Math.min(3.2, Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 + 1.2))
        if (d < reach && dot > 0.55 && d < best + reach) { best = d; focus = it; bestC = c }
      }
      // hidden finds must be approached closely (their group sits at the origin, so use the bounds centre)
      if (focus && focus.kind === 'hidden' && bestC && Math.hypot(bestC.x - s.x, bestC.z - s.z) > 2.2) focus = null
    }
    const fid = focus?.id ?? null
    if (ctx.focus.current !== fid) {
      ctx.focus.current = fid
      const mystery = focus?.kind === 'hidden' && !g.discoveries[`hidden:${ctx.scene}:${focus.id}`]
      g.setUi({ focusHint: focus ? { id: focus.id, title: mystery ? { ar: '✨ شيء لافت هنا…', en: '✨ Something catches the eye…' } : focus.info.title } : null })
    }

    // taps on the 3D view
    if (!paused) {
      const rect = gl.domElement.getBoundingClientRect()
      while (input.taps.length) {
        const t = input.taps.shift()!
        const hit = pickAt(((t.x - rect.left) / rect.width) * 2 - 1, -((t.y - rect.top) / rect.height) * 2 + 1, 7)
        if (hit) interact(ctx.scene, hit)
      }
      if (input.interact) {
        input.interact = false
        if (focus) interact(ctx.scene, focus)
      }
    } else {
      input.taps.length = 0
      input.interact = false
    }
  })
  return null
}

/* ------------------------------------------------------------------ */
/* Shared interior props                                               */
/* ------------------------------------------------------------------ */

/** Upright sign with a text panel (canvas texture). */
export function SignPanel({ id, lines, w = 1.2, h = 0.8, p, rotY = 0, post = true, bg = '#0f3d2e', fg = '#f8f0e0' }: { id: string; lines: string[]; w?: number; h?: number; p: V3; rotY?: number; post?: boolean; bg?: string; fg?: string }) {
  const tex = useMemo(() => textPanel(`sign-${id}-${lines.join('|')}`, 512, Math.round(512 * (h / w)), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    g.strokeStyle = '#c9a24a'; g.lineWidth = 10; g.strokeRect(14, 14, W - 28, H - 28)
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'
    const n = lines.length
    lines.forEach((l, i) => {
      g.font = `${i === 0 ? 700 : 500} ${i === 0 ? Math.round(H / (n + 2.2)) : Math.round(H / (n + 4.5))}px "IBM Plex Sans Arabic", "Reem Kufi", sans-serif`
      g.fillText(l, W / 2, (H / (n + 1)) * (i + 1))
    })
  }), [id, lines, w, h, bg, fg])
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      {post && <mesh position={[0, -h / 2 - 0.45, -0.02]} material={MAT.woodDark}><boxGeometry args={[0.08, 0.9, 0.08]} /></mesh>}
      <mesh material={MAT.woodDark}><boxGeometry args={[w + 0.08, h + 0.08, 0.05]} /></mesh>
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  )
}

/** Picture frame showing an image URL (or placeholder). */
function PhotoFrame({ url, w, h, p, placeholder }: { url?: string; w: number; h: number; p: V3; placeholder: THREE.Texture }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) { setTex(null); return }
    let alive = true
    new THREE.TextureLoader().load(url, (t) => {
      if (!alive) return
      t.colorSpace = THREE.SRGBColorSpace
      setTex(t)
    })
    return () => { alive = false }
  }, [url])
  return (
    <group position={p}>
      <mesh material={MAT.gold}><boxGeometry args={[w + 0.14, h + 0.14, 0.05]} /></mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex ?? placeholder} toneMapped={false} />
      </mesh>
    </group>
  )
}

function MemoryPhoto({ m, ...rest }: { m?: { photoKey?: string; samplePhoto?: string }; w: number; h: number; p: V3; placeholder: THREE.Texture }) {
  const url = useMemoryImage(m?.photoKey, m?.samplePhoto)
  return <PhotoFrame url={url} {...rest} />
}

/** Wall of the visitor's own photos for this landmark — opens the gallery. */
export function MemoryWall({ landmark, p, rotY = 0 }: { landmark: LandmarkId; p: V3; rotY?: number }) {
  const lang = useGame((s) => s.lang)
  const mems = useGame(useShallow((s) => s.memories.filter((m) => m.landmarkId === landmark && (m.photoKey || m.samplePhoto))))
  const count = useGame((s) => s.memories.filter((m) => m.landmarkId === landmark).length)
  const placeholder = useMemo(() => textPanel(`memph-${lang}`, 256, 192, (g, W, H) => {
    g.fillStyle = '#f8f0e0'; g.fillRect(0, 0, W, H)
    g.strokeStyle = '#c9a24a'; g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeRect(12, 12, W - 24, H - 24)
    g.fillStyle = '#5c6a64'; g.textAlign = 'center'; g.font = '600 24px "IBM Plex Sans Arabic", sans-serif'
    g.fillText(lang === 'ar' ? '+ أضف ذكرى' : '+ Add a memory', W / 2, H / 2 + 8)
  }), [lang])
  const info = useMemo<InfoContent>(() => ({
    id: 'memory-wall', tag: 'memory',
    title: { ar: `ذكرياتي هنا (${count})`, en: `My memories here (${count})` },
    body: { ar: 'صورك وملاحظاتك الخاصة بهذا المعلم.', en: 'Your private photos and notes for this landmark.' },
  }), [count])
  const shown = [0, 1, 2].map((i) => mems[mems.length - 1 - i])
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <Interactive info={info} kind="memory" marker={[0, 2.75, 0.2]}>
        <mesh position={[0, 1.6, -0.04]} material={MAT.woodDark}><boxGeometry args={[3.4, 1.9, 0.06]} /></mesh>
        <MemoryPhoto m={shown[0]} w={1.2} h={0.9} p={[-0.85, 1.75, 0]} placeholder={placeholder} />
        <MemoryPhoto m={shown[1]} w={0.8} h={0.6} p={[0.75, 2.0, 0]} placeholder={placeholder} />
        <MemoryPhoto m={shown[2]} w={0.8} h={0.6} p={[0.75, 1.2, 0]} placeholder={placeholder} />
      </Interactive>
      <SignPanel id={`mw-${landmark}-${lang}`} lines={[lang === 'ar' ? 'ذكرياتي' : 'My memories']} w={1.0} h={0.28} p={[0, 0.48, 0.02]} post={false} />
    </group>
  )
}

/** Info card content for a collectible spot (fact from the verified collectibles list). */
export function collectibleInfo(scene: LandmarkId, id: string): InfoContent {
  const c = COLLECTIBLE_MAP[`${scene}:${id}`]
  return { id, title: c.name, body: c.fact, kind: 'verified' }
}

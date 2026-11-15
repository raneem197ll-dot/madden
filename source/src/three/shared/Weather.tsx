import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../../state/gameStore'
import { TIER_SETTINGS } from '../../lib/device'
import { env, rng } from './env'
import { sky } from './Environment'

/** Drifting low-poly clouds; how many depends on the weather setting. */
export function Clouds({ radius = 50, height = [26, 36] as [number, number], spread = 1 }: { radius?: number; height?: [number, number]; spread?: number }) {
  const weather = useGame((s) => s.weather)
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.85, depthWrite: false }), [])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1).scale(1, 0.6, 1), [])
  const clouds = useMemo(() => {
    const r = rng(19)
    const n = weather === 'clear' ? 5 : weather === 'cloudy' ? 14 : 18
    return Array.from({ length: n }, (_, i) => {
      // clear sky keeps clouds far to the north; overcast rings the city without hiding it
      // keep clouds beyond the city on the far (north) side so they never hide the map
      const a = Math.PI * (1.02 + (i / Math.max(1, n - 1)) * 0.96) + (r() - 0.5) * 0.1
      const d = radius * (weather === 'clear' ? 0.9 + r() * 0.2 : 0.75 + r() * 0.45) * spread
      return {
        x: Math.cos(a) * d, z: Math.sin(a) * d, y: height[0] + r() * (height[1] - height[0]), s: 1.8 + r() * 1.6,
        puffs: Array.from({ length: 6 + Math.floor(r() * 4) }, (_, k) => [(k - 4) * 0.9 + (r() - 0.5) * 0.6, r() * 0.5, (r() - 0.5) * 1.4, 0.9 + r() * 0.7] as const),
      }
    })
  }, [weather, radius, height, spread])
  const tint = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    group.current?.children.forEach((c, i) => {
      c.position.x += dt * (0.35 + (i % 3) * 0.12)
      if (c.position.x > radius * 1.2) c.position.x = -radius * 1.2
    })
    const dark = weather === 'rain' ? 0.45 : weather === 'cloudy' ? 0.15 : 0
    tint.copy(sky.bot).lerp(sky.sun, 0.35).lerp(new THREE.Color('#ffffff'), 0.5 - env.night * 0.3)
    mat.color.copy(tint).multiplyScalar(Math.max(0.42, 1 - dark - env.night * 0.4))
    mat.opacity = (weather === 'clear' ? 0.85 : 0.68) - env.night * 0.25
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {c.puffs.map(([x, y, z, s], j) => <mesh key={j} geometry={geo} material={mat} position={[x, y, z]} scale={s} />)}
        </group>
      ))}
    </group>
  )
}

/** Light rain as streaks around the camera's view target (cheap: one LineSegments). */
export function Rain({ count = 700, box = [46, 30, 46] as [number, number, number], center }: { count?: number; box?: [number, number, number]; center?: 'camera' | [number, number, number] }) {
  const weather = useGame((s) => s.weather)
  const tier = useGame((s) => s.tier)
  const n = Math.round(count * TIER_SETTINGS[tier].rain)
  const { geo, drops } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(n * 6)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const r = rng(77)
    const d = Array.from({ length: n }, () => ({ x: (r() - 0.5) * box[0], y: r() * box[1], z: (r() - 0.5) * box[2], v: 22 + r() * 10 }))
    return { geo: g, drops: d }
  }, [n, box])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: '#dbe7f2', transparent: true, opacity: 0.45, depthWrite: false }), [])
  const c = useMemo(() => new THREE.Vector3(), [])
  const fwd = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, rawDt) => {
    if (weather !== 'rain') return
    const dt = Math.min(rawDt, 0.05)
    if (center === 'camera' || !center) {
      camera.getWorldDirection(fwd)
      const t = fwd.y < -0.05 ? Math.min(40, camera.position.y / -fwd.y) : 14
      c.copy(camera.position).addScaledVector(fwd, Math.min(t, 18))
      c.y = 0
    } else c.set(...center)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      d.y -= d.v * dt
      if (d.y < 0) d.y += box[1]
      const x = c.x + d.x, y = d.y, z = c.z + d.z
      arr[i * 6] = x; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z
      arr[i * 6 + 3] = x + 0.12; arr[i * 6 + 4] = y + 0.9; arr[i * 6 + 5] = z + 0.05
    }
    pos.needsUpdate = true
    mat.opacity = 0.32 + env.night * 0.1
  })
  if (weather !== 'rain') return null
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />
}

/** Screen-space rain for the high city view (3D streaks are too small from far away). */
export function RainOverlayCSS() {
  const weather = useGame((s) => s.weather)
  const mode = useGame((s) => s.mode)
  if (weather !== 'rain' || mode !== 'city') return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[12] overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#3c4a5a]/15" />
      <div className="rain-layer absolute -inset-[20%]" />
      <div className="rain-layer rain-layer-2 absolute -inset-[20%]" />
    </div>
  )
}

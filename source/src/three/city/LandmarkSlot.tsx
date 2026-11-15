import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import type { Landmark } from '../../data/types'
import { useGame, viewUnlocked } from '../../state/gameStore'
import { MODELS } from '../models'
import { BuildContext } from '../shared/parts'
import { GHOST_SET, MAT, MatContext } from '../shared/materials'
import { clamp01, easeOutCubic, env } from '../shared/env'
import { StaticMerge } from '../shared/StaticMerge'

/* ---------------- construction site (locked) ---------------- */
function ConstructionSite({ r, crane, fading }: { r: number; crane: boolean; fading: React.MutableRefObject<number> | null }) {
  const group = useRef<THREE.Group>(null)
  const jib = useRef<THREE.Group>(null)
  const side = r * 1.55
  const posts = useMemo(() => {
    const pts: [number, number][] = []
    const n = Math.round((side * 2) / 0.55)
    for (let i = 0; i <= n; i++) {
      const t = -side + (i / n) * side * 2
      pts.push([t, -side], [t, side], [-side, t], [side, t])
    }
    return pts
  }, [side])
  useFrame((_, dt) => {
    if (jib.current) jib.current.rotation.y += dt * 0.25
    if (group.current && fading) {
      const f = 1 - clamp01(fading.current * 1.6)
      group.current.scale.setScalar(Math.max(0.001, f))
      group.current.visible = f > 0.01
    }
  })
  return (
    <group ref={group}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT.sandDark}>
        <planeGeometry args={[side * 2, side * 2]} />
      </mesh>
      <instancedMesh
        ref={(im) => {
          if (!im) return
          const o = new THREE.Object3D()
          posts.forEach(([x, z], i) => { o.position.set(x, 0.18, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix) })
          im.instanceMatrix.needsUpdate = true
          im.computeBoundingSphere()
        }}
        args={[undefined, MAT.fence, posts.length]}
        castShadow
      >
        <boxGeometry args={[0.06, 0.36, 0.06]} />
      </instancedMesh>
      {[[0, -side, side * 2, 0.04], [0, side, side * 2, 0.04], [-side, 0, 0.04, side * 2], [side, 0, 0.04, side * 2]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.3, z]} material={MAT.white}>
          <boxGeometry args={[w, 0.05, d]} />
        </mesh>
      ))}
      {crane ? (
        <group position={[side - 0.6, 0, -side + 0.6]}>
          <mesh position={[0, 3, 0]} castShadow material={MAT.crane}><boxGeometry args={[0.22, 6, 0.22]} /></mesh>
          <group ref={jib} position={[0, 6, 0]}>
            <mesh position={[-1.6, 0, 0]} castShadow material={MAT.crane}><boxGeometry args={[4.4, 0.16, 0.16]} /></mesh>
            <mesh position={[1.1, -0.1, 0]} castShadow material={MAT.basalt}><boxGeometry args={[0.6, 0.4, 0.4]} /></mesh>
            <mesh position={[-3.2, -1.2, 0]} material={MAT.iron}><boxGeometry args={[0.02, 2.4, 0.02]} /></mesh>
            <mesh position={[-3.2, -2.45, 0]} material={MAT.stoneTrim}><boxGeometry args={[0.35, 0.25, 0.35]} /></mesh>
          </group>
        </group>
      ) : (
        [[-1.5, 1.2], [1.8, 0.6], [0, 2.6], [-2.6, -0.6]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.35, 0]} material={MAT.iron}><boxGeometry args={[0.03, 0.7, 0.03]} /></mesh>
            <mesh position={[0.12, 0.6, 0]} material={MAT.fence}><boxGeometry args={[0.22, 0.14, 0.01]} /></mesh>
          </group>
        ))
      )}
      {[[-side + 0.8, side - 0.7], [side - 1.2, side - 0.9], [-side + 1.4, -side + 1.0]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.15, 0]} castShadow material={MAT.stoneTrim}><boxGeometry args={[0.6, 0.3, 0.4]} /></mesh>
          <mesh position={[0.1, 0.4, 0.05]} castShadow material={MAT.stoneTrim}><boxGeometry args={[0.4, 0.2, 0.3]} /></mesh>
        </group>
      ))}
      {[[side - 0.3, side - 0.3], [-side + 0.3, side - 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} material={MAT.fence}><coneGeometry args={[0.1, 0.36, 8]} /></mesh>
      ))}
    </group>
  )
}

/* ---------------- build effects ---------------- */
function BuildFX({ progress, r }: { progress: React.MutableRefObject<number>; r: number }) {
  const ring = useRef<THREE.Mesh>(null)
  const dust = useRef<THREE.Group>(null)
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e7c66b', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), [])
  const dustMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e5d2ab', transparent: true, opacity: 0.6, depthWrite: false, roughness: 1 }), [])
  const puffs = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, d: r * (0.7 + (i % 3) * 0.2), t0: (i % 5) * 0.12 })), [r])
  useFrame(() => {
    const p = progress.current
    const rt = clamp01((p - 0.82) / 0.18)
    if (ring.current) {
      ring.current.scale.setScalar(0.6 + easeOutCubic(rt) * r * 1.4)
      ringMat.opacity = rt > 0 && rt < 1 ? (1 - rt) * 0.8 : 0
    }
    if (dust.current) {
      dust.current.children.forEach((c, i) => {
        const pf = puffs[i]
        const lt = ((p * 3 + pf.t0) % 1)
        const alive = p < 0.85
        c.visible = alive
        c.position.set(Math.cos(pf.a) * (pf.d + lt * 0.8), 0.2 + lt * 1.4, Math.sin(pf.a) * (pf.d + lt * 0.8))
        c.scale.setScalar(0.25 + lt * 0.6)
      })
      dustMat.opacity = 0.55 * (1 - clamp01((p - 0.7) / 0.2))
    }
  })
  return (
    <group>
      <mesh ref={ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[0.9, 1, 64]} />
      </mesh>
      <group ref={dust}>
        {puffs.map((_, i) => (
          <mesh key={i} material={dustMat}><icosahedronGeometry args={[0.5, 0]} /></mesh>
        ))}
      </group>
      <Sparkles count={50} scale={[r * 2.4, 5, r * 2.4]} position={[0, 2.5, 0]} size={5} speed={0.8} color="#f1d37a" />
    </group>
  )
}

/* ---------------- slot ---------------- */
export function LandmarkSlot({ lm }: { lm: Landmark }) {
  const meta = MODELS[lm.id]
  const cons = useGame((s) => (s.constructing?.id === lm.id ? s.constructing : null))
  const shown = useGame((s) => viewUnlocked(s)[lm.id]) || !!lm.alwaysBuilt
  const selected = useGame((s) => s.selected === lm.id && s.sheetOpen)
  const [hover, setHover] = useState(false)

  const state: 'locked' | 'building' | 'built' = cons ? 'building' : shown ? 'built' : 'locked'

  const progress = useRef(0)
  const light = useRef<THREE.PointLight>(null)
  const selRing = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (cons) progress.current = clamp01((performance.now() - cons.start) / cons.duration)
    if (light.current) light.current.intensity = state === 'built' ? env.night * 160 : 0
    if (selRing.current) {
      const s = 1 + Math.sin(env.time * 3) * 0.04
      selRing.current.scale.set(s, s, s)
    }
  })

  const Model = meta.Component
  const sc = lm.scale ?? 1
  const r = lm.footprint * sc
  const onClick = (e: { stopPropagation: () => void; delta: number }) => {
    if (e.delta > 8) return
    e.stopPropagation()
    const s = useGame.getState()
    if (s.replay.active || s.constructing) return
    s.select(lm.id)
  }

  return (
    <group position={[lm.cityPos[0], 0, lm.cityPos[1]]} rotation={[0, lm.rotY, 0]}>
      <group
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      >
        {/* invisible hit volume so taps are easy on phones */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[r + 0.6, r + 0.6, 3, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        {state !== 'built' && <ConstructionSite r={r} crane={meta.crane} fading={state === 'building' ? progress : null} />}
        <group scale={sc}>
          {state === 'locked' && (
            <MatContext.Provider value={GHOST_SET}>
              <StaticMerge><Model /></StaticMerge>
            </MatContext.Provider>
          )}
          {state === 'building' && (
            <BuildContext.Provider value={{ progress, total: meta.parts }}>
              <Model />
            </BuildContext.Provider>
          )}
          {state === 'built' && <StaticMerge><Model /></StaticMerge>}
        </group>
        {state === 'building' && <BuildFX progress={progress} r={r} />}
      </group>
      {state === 'locked' && <Beacon r={r} />}

      {/* only the Haram gets a real floodlight (a fixed light count keeps shaders cheap); others glow via emissive materials */}
      {lm.id === 'haram' && <pointLight ref={light} position={[0, 9, 0]} distance={34} decay={1.4} color="#ffe2b0" intensity={0} />}

      {(selected || hover) && (
        <mesh ref={selRing} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r + 1.1, r + 1.35, 64]} />
          <meshBasicMaterial color="#e2c46a" transparent opacity={0.85} />
        </mesh>
      )}

    </group>
  )
}

/** Soft light column marking an undiscovered location. */
const beaconMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime; void main(){ float a = (1.0 - vUv.y) * (0.22 + 0.1 * sin(uTime * 2.0)); gl_FragColor = vec4(1.0, 0.82, 0.45, a); }`,
})
function Beacon({ r }: { r: number }) {
  const q = useRef<THREE.Mesh>(null)
  useFrame(() => {
    beaconMat.uniforms.uTime.value = env.time
    if (q.current) { q.current.rotation.y += 0.02; q.current.position.y = 7.2 + Math.sin(env.time * 1.6) * 0.25 }
  })
  return (
    <group>
      <mesh position={[0, 4, 0]} material={beaconMat} renderOrder={4}>
        <cylinderGeometry args={[r * 0.35, r * 0.6, 8, 24, 1, true]} />
      </mesh>
      <mesh ref={q} position={[0, 7.2, 0]} material={MAT.gold}>
        <octahedronGeometry args={[0.45, 0]} />
      </mesh>
    </group>
  )
}

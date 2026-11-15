import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../../state/gameStore'
import { SPOT_MAP } from '../../data/places'
import { routeLine } from './layout'
import { env } from '../shared/env'

/** Suggested route between two spots: a guide line that bends around other landmarks' plots. */
export function routePoints(a: string, b: string): THREE.Vector3[] {
  const A = SPOT_MAP[a], B = SPOT_MAP[b]
  if (!A || !B) return []
  const y = 0.14
  return routeLine(A.cityPos, B.cityPos, [a, b]).map(([x, z]) => new THREE.Vector3(x, y, z))
}

/** Suggested visiting order: greedy nearest-neighbour tour from the city centre. */
export function tourOrder(ids: string[]): string[] {
  const left = [...ids]
  const out: string[] = []
  let cx = 0, cz = 0
  while (left.length) {
    left.sort((p, q) => Math.hypot(SPOT_MAP[p].cityPos[0] - cx, SPOT_MAP[p].cityPos[1] - cz) - Math.hypot(SPOT_MAP[q].cityPos[0] - cx, SPOT_MAP[q].cityPos[1] - cz))
    const n = left.shift()!
    out.push(n)
    ;[cx, cz] = SPOT_MAP[n].cityPos
  }
  return out
}

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const frag = `varying vec2 vUv; uniform float uTime; uniform float uLen; uniform vec3 uColor; uniform float uOpacity;
  void main(){ float d = fract(vUv.x * uLen / 0.9 - uTime * 0.9); if (d < 0.45) discard; gl_FragColor = vec4(uColor, uOpacity);
  #include <colorspace_fragment>
  }`

function Route({ a, b, strong }: { a: string; b: string; strong: boolean }) {
  const { geo, base, len } = useMemo(() => {
    const pts = routePoints(a, b)
    const curve = new THREE.CatmullRomCurve3(pts.length > 1 ? pts : [new THREE.Vector3(), new THREE.Vector3(0.01, 0, 0)], false, 'centripetal', 0.2)
    const L = curve.getLength()
    return {
      geo: new THREE.TubeGeometry(curve, Math.ceil(L * 4), strong ? 0.16 : 0.11, 6, false),
      base: new THREE.TubeGeometry(curve, Math.ceil(L * 3), strong ? 0.09 : 0.06, 5, false),
      len: L,
    }
  }, [a, b, strong])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uLen: { value: len }, uColor: { value: new THREE.Color(strong ? '#ffd56b' : '#f0cf78') }, uOpacity: { value: strong ? 1 : 0.85 } },
  }), [len, strong])
  const baseMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#7a5b1e', transparent: true, opacity: 0.35, depthWrite: false }), [])
  useFrame(() => { mat.uniforms.uTime.value = env.time })
  return (
    <group>
      <mesh geometry={base} material={baseMat} renderOrder={2} />
      <mesh geometry={geo} material={mat} renderOrder={3} />
    </group>
  )
}

/** The default suggested tour drawn when no itinerary is saved: a few highlights. */
export const SUGGESTED_TOUR = ['haram', 'baqi', 'quba', 'qiblatain', 'sabaa', 'uhud']

export function NavPaths() {
  const show = useGame((s) => s.showRoutes && s.mode === 'city' && !s.replay.active)
  const selected = useGame((s) => (s.sheetOpen ? s.selected : null))
  const routeTo = useGame((s) => s.routeTo)
  const planOrder = useGame((s) => s.planOrder)
  const tour = useMemo(() => tourOrder(SUGGESTED_TOUR), [])
  const replay = useGame((s) => s.replay.active)
  if (replay) return null
  // a saved itinerary replaces the generic tour
  const path = planOrder && planOrder.length > 1 ? planOrder : tour
  return (
    <group>
      {show && path.slice(1).map((id, i) => <Route key={`${path[i]}-${id}`} a={path[i]} b={id} strong={!!planOrder} />)}
      {selected && routeTo && selected !== routeTo && <Route a={selected} b={routeTo} strong />}
    </group>
  )
}

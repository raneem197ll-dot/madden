import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useGame } from '../../state/gameStore'
import { TIER_SETTINGS } from '../../lib/device'
import { LANDMARKS } from '../../data/landmarks'
import type { LandmarkId } from '../../data/types'
import { ROADS, pointAt, roadVisible } from './layout'
import { useGrowthUnlocked } from './CityEnvironment'
import { env, registerGlow, rng } from '../shared/env'
import { MODELS } from '../models'

/* ------------------------------------------------------------------ */
/* Traffic: cars loop the ring road and drive along built roads        */
/* ------------------------------------------------------------------ */
const CAR_COLORS = ['#f4f1ea', '#c9c9c4', '#d8c39a', '#24423a', '#8c2a22', '#2b3f63', '#e9e3d6', '#5a5a5a']
const headMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe8a6', emissiveIntensity: 0 })
registerGlow(headMat, 0, 3)

interface Car { kind: 'ring' | 'road'; road: number; lane: 1 | -1; t: number; speed: number; dir: 1 | -1; color: string }

function carGeometry() {
  const body = new THREE.BoxGeometry(0.46, 0.13, 0.24).translate(0, 0.1, 0)
  const cabin = new THREE.BoxGeometry(0.26, 0.11, 0.21).translate(-0.03, 0.21, 0)
  return mergeGeometries([body, cabin])!
}

export function Traffic({ density = 1 }: { density?: number }) {
  const unlocked = useGrowthUnlocked()
  const bodies = useRef<THREE.InstancedMesh>(null)
  const lights = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(carGeometry, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.25 }), [])
  const cars = useMemo<Car[]>(() => {
    const r = rng(5)
    const out: Car[] = []
    ROADS.forEach((road, ri) => {
      if (road.kind === 'walk') return
      const n = Math.max(1, Math.round((road.kind === 'ring' ? road.len / 9 : 2.2) * density))
      for (let k = 0; k < n; k++) out.push({ kind: road.kind === 'ring' ? 'ring' : 'road', road: ri, lane: k % 2 ? 1 : -1, t: r(), speed: 1.4 + r() * 1.0, dir: k % 2 ? 1 : -1, color: CAR_COLORS[(ri + k * 3) % CAR_COLORS.length] })
    })
    return out
  }, [density])
  const o = useMemo(() => new THREE.Object3D(), [])
  const colored = useRef(false)

  useFrame((_, rawDt) => {
    const b = bodies.current, l = lights.current
    if (!b || !l) return
    if (!colored.current) {
      const c = new THREE.Color()
      cars.forEach((car, i) => b.setColorAt(i, c.set(car.color)))
      if (b.instanceColor) b.instanceColor.needsUpdate = true
      colored.current = true
    }
    const dt = Math.min(rawDt, 0.05)
    cars.forEach((car, i) => {
      const road = ROADS[car.road]
      const show = roadVisible(road, unlocked)
      car.t += (car.speed / road.len) * dt * car.dir
      if (car.kind === 'ring') car.t = ((car.t % 1) + 1) % 1
      else if (car.t > 1) { car.t = 1; car.dir = -1 } else if (car.t < 0) { car.t = 0; car.dir = 1 }
      const p = pointAt(road, car.t)
      const off = 0.25 * car.dir
      const x = p.x - p.uz * off, z = p.z + p.ux * off
      const yaw = Math.atan2(-p.uz * car.dir, p.ux * car.dir)
      const s = show ? 1 : 0.0001
      o.position.set(x, 0.02, z); o.rotation.set(0, yaw, 0); o.scale.setScalar(s); o.updateMatrix()
      b.setMatrixAt(i, o.matrix)
      // headlights sit at the car's front (+x local)
      o.position.set(x + Math.cos(yaw) * 0.24, 0.12, z - Math.sin(yaw) * 0.24); o.scale.set(s * 0.04, s * 0.05, s * 0.2); o.updateMatrix()
      l.setMatrixAt(i, o.matrix)
    })
    b.instanceMatrix.needsUpdate = true
    l.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh ref={bodies} args={[geo, mat, cars.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={lights} args={[undefined, headMat, cars.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Pedestrians: around the plaza, on sidewalks, and visitors at sites  */
/* ------------------------------------------------------------------ */
const CLOTHES = ['#f7f5ef', '#f7f5ef', '#f2efe6', '#1d1d1f', '#1d1d1f', '#6d7f8c', '#a58f6a', '#3b5f52']

interface Walker { kind: 'plaza' | 'road' | 'site'; road: number; lm?: LandmarkId; t: number; speed: number; dir: 1 | -1; side: number; color: string; phase: number }

function personGeometry() {
  const body = new THREE.CylinderGeometry(0.045, 0.07, 0.24, 6).translate(0, 0.12, 0)
  const head = new THREE.SphereGeometry(0.045, 6, 5).translate(0, 0.29, 0)
  return mergeGeometries([body.toNonIndexed(), head.toNonIndexed()])!
}

export function Pedestrians({ density = 1 }: { density?: number }) {
  const unlocked = useGrowthUnlocked()
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(personGeometry, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), [])
  const walkers = useMemo<Walker[]>(() => {
    const r = rng(12)
    const out: Walker[] = []
    for (let i = 0; i < Math.round(30 * density); i++) out.push({ kind: 'plaza', road: -1, t: r() * Math.PI * 2, speed: 0.25 + r() * 0.2, dir: r() > 0.5 ? 1 : -1, side: 0, color: CLOTHES[i % CLOTHES.length], phase: r() * 6 })
    ROADS.forEach((_, ri) => {
      for (let k = 0; k < Math.round(1.6 * density); k++) out.push({ kind: 'road', road: ri, t: r(), speed: 0.3 + r() * 0.2, dir: r() > 0.5 ? 1 : -1, side: k % 2 ? 1 : -1, color: CLOTHES[(ri * 3 + k) % CLOTHES.length], phase: r() * 6 })
    })
    for (const l of LANDMARKS) for (let k = 0; k < Math.round(4 * density); k++) out.push({ kind: 'site', road: -1, lm: l.id, t: r() * Math.PI * 2, speed: 0.18 + r() * 0.15, dir: r() > 0.5 ? 1 : -1, side: r(), color: CLOTHES[(k * 5) % CLOTHES.length], phase: r() * 6 })
    return out
  }, [density])
  const o = useMemo(() => new THREE.Object3D(), [])
  const colored = useRef(false)
  useFrame((_, rawDt) => {
    const im = ref.current
    if (!im) return
    if (!colored.current) {
      const c = new THREE.Color()
      walkers.forEach((w, i) => im.setColorAt(i, c.set(w.color)))
      if (im.instanceColor) im.instanceColor.needsUpdate = true
      colored.current = true
    }
    const dt = Math.min(rawDt, 0.05)
    // fewer people out late at night
    const nightHide = env.night > 0.85
    walkers.forEach((w, i) => {
      let x = 0, z = 0, yaw = 0, show = true
      if (w.kind === 'plaza') {
        // a walk around the Prophet's Mosque on its plazas (rectangular loop)
        w.t = (((w.t + (w.speed / 34) * dt * w.dir) % 1) + 1) % 1
        const hx = 4.55 + (w.phase % 1) * 0.5, hz = 6.25 + (w.phase % 1) * 0.5
        const per = 4 * (hx + hz), d = w.t * per
        if (d < 2 * hx) { x = -hx + d; z = -hz } else if (d < 2 * hx + 2 * hz) { x = hx; z = -hz + (d - 2 * hx) } else if (d < 4 * hx + 2 * hz) { x = hx - (d - 2 * hx - 2 * hz); z = hz } else { x = -hx; z = hz - (d - 4 * hx - 2 * hz) }
        yaw = 0
      } else if (w.kind === 'road') {
        const road = ROADS[w.road]
        show = roadVisible(road, unlocked)
        w.t += (w.speed / road.len) * dt * w.dir
        if (road.closed) w.t = ((w.t % 1) + 1) % 1
        else if (w.t > 1 || w.t < 0) { w.dir = (w.dir * -1) as 1 | -1; w.t = Math.min(1, Math.max(0, w.t)) }
        const p = pointAt(road, w.t)
        const off = (road.w / 2 + 0.18) * w.side
        x = p.x - p.uz * off; z = p.z + p.ux * off
        yaw = Math.atan2(-p.uz * w.dir, p.ux * w.dir)
      } else {
        // visitors stroll around an unlocked landmark
        const lm = LANDMARKS.find((l) => l.id === w.lm)!
        show = !!unlocked[lm.id]
        const R = MODELS[lm.id].clearRadius - 0.9 + w.side * 0.5
        w.t += (w.speed / R) * dt * w.dir
        x = lm.cityPos[0] + Math.cos(w.t) * R; z = lm.cityPos[1] + Math.sin(w.t) * R; yaw = -w.t
      }
      if (nightHide && i % 3 !== 0) show = false
      const bob = Math.abs(Math.sin(env.time * 7 + w.phase)) * 0.025
      o.position.set(x, bob, z); o.rotation.set(0, yaw, 0); o.scale.setScalar(show ? 1 : 0.0001); o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, walkers.length]} castShadow frustumCulled={false} />
}

/* ------------------------------------------------------------------ */
/* Birds circling above the city during the day                        */
/* ------------------------------------------------------------------ */
export function Birds({ count = 10 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const v = new Float32Array([0, 0, 0, -0.25, 0.05, 0.35, 0.06, 0, 0, 0, 0, 0, 0.06, 0, 0, -0.25, 0.05, -0.35])
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2d2a28', side: THREE.DoubleSide }), [])
  const birds = useMemo(() => {
    const r = rng(33)
    return Array.from({ length: count }, (_, i) => ({ r: 6 + r() * 5, h: 9 + r() * 3, sp: 0.25 + r() * 0.1, ph: (i / count) * Math.PI * 2 + r() * 0.3, flap: r() * 6 }))
  }, [count])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const im = ref.current
    if (!im) return
    const day = env.night < 0.5 && env.weather !== 'rain'
    const t = env.time
    birds.forEach((b, i) => {
      const a = b.ph + t * b.sp
      o.position.set(Math.cos(a) * b.r + 4, b.h + Math.sin(t * 0.7 + i) * 0.4, Math.sin(a) * b.r - 2)
      o.rotation.set(0, -a, 0)
      const f = 0.4 + Math.abs(Math.sin(t * 9 + b.flap)) * 0.9
      o.scale.set(day ? 1 : 0.0001, day ? f : 0.0001, day ? 1 : 0.0001)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

/** All ambient life, scaled by the graphics tier. */
export function CityLife() {
  const tier = useGame((s) => s.tier)
  const reduce = useGame((s) => s.a11y.reduceMotion === 'on')
  const { life: d, birds } = TIER_SETTINGS[tier]
  return (
    <group>
      <Traffic density={d} />
      <Pedestrians density={d} />
      {birds && !reduce && <Birds count={10} />}
    </group>
  )
}

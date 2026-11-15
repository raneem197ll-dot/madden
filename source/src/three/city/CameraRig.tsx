import { reducedMotion } from '../../lib/a11y'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { useGame, type CamRequest } from '../../state/gameStore'
import { LANDMARK_MAP } from '../../data/landmarks'
import { SPOT_MAP } from '../../data/places'
import { MODELS } from '../models'

/** spherical → offset */
function offset(dist: number, polar: number, az: number) {
  return new THREE.Vector3(Math.sin(polar) * Math.sin(az) * dist, Math.cos(polar) * dist, Math.sin(polar) * Math.cos(az) * dist)
}

/**
 * Orbit/pan/zoom camera for the miniature city, plus a director that turns
 * store camera requests into smooth fly-to transitions.
 */
export function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const { size, camera } = useThree()
  const aerial = useRef(false)
  const portrait = size.width / size.height < 0.9
  const sheetShift = size.width < 768 ? 1 : 0 // bottom sheet covers the lower half on phones

  const run = (req: CamRequest | null, instant = false) => {
    const c = ref.current
    if (!c || !req) return
    const pf = portrait ? 1.35 : 1
    aerial.current = false
    c.enabled = !useGame.getState().replay.active
    const go = (pos: THREE.Vector3, tgt: THREE.Vector3, smooth = 0.6) => {
      c.smoothTime = smooth
      c.setLookAt(pos.x, pos.y, pos.z, tgt.x, tgt.y, tgt.z, !instant && !reducedMotion())
    }
    if (req.kind === 'home') {
      const t = new THREE.Vector3(portrait ? -3 : -2, 0, portrait ? -2 : 0)
      go(t.clone().add(offset(portrait ? 170 : 112, portrait ? 0.6 : 0.78, 0.3)), t, 0.8)
      return
    }
    if (req.kind === 'aerial') {
      const t = new THREE.Vector3(-2, 0, -2)
      go(t.clone().add(offset(portrait ? 160 : 118, 0.62, 0.1)), t, 1.4)
      setTimeout(() => { aerial.current = true }, 1200)
      return
    }
    if (!req.id) return
    if (req.kind === 'route') {
      const to = useGame.getState().routeTo
      if (!to) return
      const a = SPOT_MAP[req.id].cityPos, b = SPOT_MAP[to].cityPos
      const t = new THREE.Vector3((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2)
      const sep = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (sheetShift) t.z += sep * 0.35
      go(t.clone().add(offset((sep * 1.1 + 14) * pf, 0.75, 0.3)), t, 0.8)
      return
    }
    if (!(req.id in LANDMARK_MAP)) {
      // a map-only place: look at its pin
      const [px, pz] = SPOT_MAP[req.id].cityPos
      const tgt = new THREE.Vector3(px, 0.5, pz)
      const dist = 22 * pf
      if (sheetShift) tgt.z += dist * 0.3
      go(tgt.clone().add(offset(dist, 0.9, 0.45)), tgt, 0.6)
      return
    }
    const lm = LANDMARK_MAP[req.id as keyof typeof LANDMARK_MAP]
    const meta = MODELS[lm.id]
    const base = new THREE.Vector3(lm.cityPos[0], meta.focusY, lm.cityPos[1])
    const r = lm.footprint * (lm.scale ?? 1)
    if (req.kind === 'focus' || req.kind === 'build' || req.kind === 'replayFocus') {
      const dist = Math.max(r * 3.2 + 9, 16) * pf * (req.kind === 'build' ? 1.05 : 1)
      const tgt = base.clone()
      // keep the building in the upper part of the screen when the sheet is open
      if (req.kind === 'focus' && sheetShift) tgt.z += dist * 0.3
      const az = req.id === 'uhud' ? 0.15 : 0.45
      go(tgt.clone().add(offset(dist, req.kind === 'replayFocus' ? 0.95 : 0.9, az)), tgt, req.kind === 'replayFocus' ? 0.9 : 0.6)
      return
    }
    if (req.kind === 'door') {
      const door = new THREE.Vector3(...meta.door).add(new THREE.Vector3(lm.cityPos[0], 0, lm.cityPos[1]))
      const dir = door.clone().sub(new THREE.Vector3(lm.cityPos[0], door.y, lm.cityPos[1])).setY(0).normalize()
      const pos = door.clone().add(dir.multiplyScalar(1.6)).setY(door.y + 0.5)
      go(pos, door.clone().setY(door.y + 0.3), 0.45)
      return
    }
    if (req.kind === 'exitDoor') {
      const door = new THREE.Vector3(...meta.door).add(new THREE.Vector3(lm.cityPos[0], 0, lm.cityPos[1]))
      const dir = door.clone().sub(new THREE.Vector3(lm.cityPos[0], door.y, lm.cityPos[1])).setY(0).normalize()
      c.setLookAt(door.x + dir.x * 1.5, door.y + 0.6, door.z + dir.z * 1.5, door.x, door.y, door.z, false)
      setTimeout(() => {
        const dist = (r * 3.2 + 9) * pf
        c.smoothTime = 0.65
        c.setLookAt(base.x + offset(dist, 0.9, 0.45).x, base.y + offset(dist, 0.9, 0.45).y, base.z + offset(dist, 0.9, 0.45).z, base.x, base.y, base.z, true)
      }, 60)
    }
  }

  // initial pose
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.minDistance = 6
    c.maxDistance = 260
    c.minPolarAngle = 0.12
    c.maxPolarAngle = 1.28
    c.dollySpeed = 0.6
    c.truckSpeed = 1.6
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-60, -1, -60), new THREE.Vector3(60, 8, 60)))
    c.boundaryEnclosesCamera = false
    const last = useGame.getState().cam
    if (last && (last.kind === 'exitDoor' || last.kind === 'focus')) run(last, last.kind === 'focus')
    else run({ kind: 'home', n: 0 }, true)
    ;(camera as THREE.PerspectiveCamera).fov = 38
    camera.updateProjectionMatrix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => useGame.subscribe((s, prev) => { if (s.cam && s.cam !== prev.cam) run(s.cam) }), [portrait])

  useEffect(() => useGame.subscribe((s, prev) => {
    if (s.replay.active !== prev.replay.active && ref.current) ref.current.enabled = !s.replay.active
  }), [])

  useFrame((_, dt) => {
    if (aerial.current && ref.current && useGame.getState().replay.active && !reducedMotion()) {
      ref.current.azimuthAngle += dt * 0.12
    }
  })

  return <CameraControls ref={ref} makeDefault smoothTime={0.6} draggingSmoothTime={0.12} />
}

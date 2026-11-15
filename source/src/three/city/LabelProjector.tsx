import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { anchors, type Anchor } from '../../ui/anchors'

const HIDE = 'translate(-9999px,-9999px)'

/**
 * Projects every registered screen anchor (landmark labels, place pins, route distances)
 * each frame. Labels are placed by priority and any label that would overlap one already
 * placed is hidden, so a phone screen never fills with a pile of names.
 */
export function LabelProjector() {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  const buf = useMemo(() => [] as { a: Anchor; x: number; y: number; d: number }[], [])
  const placed = useMemo(() => [] as [number, number, number, number][], [])
  useFrame(() => {
    const now = performance.now()
    buf.length = 0
    for (const a of anchors.values()) {
      v.set(a.pos[0], a.pos[1], a.pos[2])
      const d = v.distanceTo(camera.position)
      v.project(camera)
      const visible = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15 && (a.opts.maxDist === undefined || d <= a.opts.maxDist)
      if (!visible) { if (a.el.style.transform !== HIDE) a.el.style.transform = HIDE; continue }
      buf.push({ a, x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, d })
    }
    // most important first; among equals, nearer first
    buf.sort((p, q) => (q.a.opts.pri ?? 1) - (p.a.opts.pri ?? 1) || p.d - q.d)
    placed.length = 0
    for (const { a, x, y, d } of buf) {
      const compact = a.opts.compactDist !== undefined && d > a.opts.compactDist
      if ((a.el.dataset.compact === '1') !== compact) { a.el.dataset.compact = compact ? '1' : '0'; a.measuredAt = -1e9 }
      if (now - a.measuredAt > 1500 || !a.w) { a.w = a.el.offsetWidth || 60; a.h = a.el.offsetHeight || 24; a.measuredAt = now }
      const r: [number, number, number, number] = [x - a.w / 2 - 2, y - a.h / 2 - 2, x + a.w / 2 + 2, y + a.h / 2 + 2]
      const hit = placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])
      if (hit) { if (a.el.style.transform !== HIDE) a.el.style.transform = HIDE; continue }
      placed.push(r)
      a.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
    }
  })
  return null
}

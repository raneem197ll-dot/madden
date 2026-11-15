import { useGame } from './gameStore'
import { LANDMARK_IDS, LANDMARK_MAP, hasInterior } from '../data/landmarks'
import type { LandmarkId } from '../data/types'
import { tr } from '../data/i18n'
import { sfx } from '../lib/sfx'

/**
 * Orchestration of multi-step sequences (entering buildings, the journey replay).
 * Lives outside React so rendering stays a pure function of game state.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const G = () => useGame.getState()

let busy = false

export async function enterBuilding(id: LandmarkId) {
  const s = G()
  if (busy || !s.progress[id]?.unlocked || !hasInterior(id) || s.mode !== 'city' || s.replay.active) return
  busy = true
  try {
    s.setUi({ sheetOpen: false, celebrate: null, composer: null, quizFor: null })
    s.camTo('door', id)
    await wait(900)
    G().setUi({ fade: { on: true, label: LANDMARK_MAP[id].name } })
    await wait(600)
    G().setUi({ mode: 'interior', interiorId: id, interiorNonce: G().interiorNonce + 1, focusHint: null, inspect: null })
    G().markEntered(id)
    await wait(750)
    G().setUi({ fade: { on: false } })
  } finally {
    busy = false
  }
}

export async function exitBuilding() {
  const s = G()
  if (busy || s.mode !== 'interior') return
  busy = true
  const id = s.interiorId
  try {
    try { if (document.pointerLockElement) document.exitPointerLock() } catch { /* ignore */ }
    s.setUi({ fade: { on: true, label: { ar: 'مدينتي', en: 'My City' } }, inspect: null, galleryFor: null })
    await wait(550)
    G().setUi({ mode: 'city', interiorId: null, focusHint: null, selected: id, sheetOpen: false })
    if (id) G().camTo('exitDoor', id)
    await wait(350)
    G().setUi({ fade: { on: false } })
  } finally {
    busy = false
  }
}

/* ---------------- Relive my journey ---------------- */
let replayToken = 0
export const REPLAY_BUILD_MS = 2600

export async function startReplay() {
  const s = G()
  if (s.mode !== 'city' || s.constructing) return
  const order = LANDMARK_IDS.filter((id) => (s.visiting ? !!s.visiting.unlocked[id] : s.progress[id]?.unlocked)).sort(
    (a, b) => new Date(visitDateFor(a) ?? 0).getTime() - new Date(visitDateFor(b) ?? 0).getTime(),
  )
  if (!order.length) {
    s.toast({ kind: 'info', icon: '🎞️', title: tr('replay', s.lang), body: tr('replayEmpty', s.lang) })
    return
  }
  const token = ++replayToken
  const alive = () => token === replayToken
  s.setUi({ sheetOpen: false, celebrate: null, tab: 'city', selected: null, composer: null })
  s.setReplay({ active: true, order, index: -1, phase: 'intro', built: [], route: [] })
  s.camTo('home')
  await wait(2300)
  for (let i = 0; i < order.length; i++) {
    if (!alive()) return
    const id = order[i]
    const route = [...G().replay.route, { from: i === 0 ? ('start' as const) : order[i - 1], to: id, t0: performance.now() }]
    G().setReplay({ index: i, phase: 'fly', route })
    G().camTo('replayFocus', id)
    await wait(1300)
    if (!alive()) return
    G().setReplay({ phase: 'build' })
    G().setUi({ constructing: { id, start: performance.now(), duration: REPLAY_BUILD_MS } })
    sfx.build(G().soundOn)
    await wait(REPLAY_BUILD_MS)
    if (!alive()) return
    G().setUi({ constructing: null })
    G().setReplay({ built: [...G().replay.built, id], phase: 'card' })
    sfx.success(G().soundOn)
    await wait(2900)
  }
  if (!alive()) return
  G().setReplay({ phase: 'aerial', index: order.length })
  G().camTo('aerial')
  await wait(6000)
  if (!alive()) return
  G().setReplay({ phase: 'end' })
  if (!G().visiting) G().setUi({ replayWatched: true, updatedAt: Date.now() } as never)
  G().runChecks()
}

export function stopReplay() {
  replayToken++
  G().setUi({ constructing: null })
  G().setReplay({ active: false, order: [], index: 0, phase: 'intro', built: [], route: [] })
  G().camTo('home')
}

/** Visit date of a landmark in the city currently shown (own or a friend's). */
export function visitDateFor(id: LandmarkId): string | undefined {
  const s = G()
  if (s.visiting) {
    const v = s.visiting.unlocked[id]
    return typeof v === 'string' ? v : undefined
  }
  return s.progress[id]?.visitDate
}

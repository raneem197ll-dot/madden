import { useEffect } from 'react'
import { useGame } from '../state/gameStore'
import { audio, type AudioScene } from '../lib/audio'
import { env } from '../three/shared/env'
import { dprFor, resolveTier } from '../lib/device'

/** Keeps the audio engine in step with settings, scene, time of day and weather. */
export function AudioDirector() {
  const prefs = useGame((s) => s.audio)
  const soundOn = useGame((s) => s.soundOn)
  useEffect(() => { audio.apply({ ...prefs, sfx: soundOn }) }, [prefs, soundOn])
  useEffect(() => {
    // browsers only allow audio after a user gesture
    const unlock = () => { audio.ensure(); audio.apply({ ...useGame.getState().audio, sfx: useGame.getState().soundOn }) }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    const i = setInterval(() => {
      const s = useGame.getState()
      const scene: AudioScene = s.mode === 'city' ? 'city' : s.interiorId === 'hejaz' ? 'museum' : s.interiorId === 'uhud' ? 'outdoor' : 'mosque'
      audio.setScene(scene, env.night, s.weather)
    }, 700)
    const vis = () => { if (document.hidden) audio.ctx?.suspend().catch(() => {}); else audio.ctx?.resume().catch(() => {}) }
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('visibilitychange', vis)
      clearInterval(i)
    }
  }, [])
  return null
}

/** Counts visible play time (and time inside each landmark), committed once a minute. */
export function PlayTimeTracker() {
  useEffect(() => {
    let pending = 0
    let pendingInside = 0
    let insideId: string | null = null
    const commit = () => {
      if (pending <= 0) return
      const s = useGame.getState()
      s.trackTime(pending, null)
      if (pendingInside > 0 && insideId) {
        const cur = useGame.getState().insideSeconds
        useGame.getState().setPrefs({ insideSeconds: { ...cur, [insideId]: (cur[insideId] ?? 0) + pendingInside } })
      }
      pending = 0
      pendingInside = 0
    }
    const tick = setInterval(() => {
      if (document.hidden) return
      const s = useGame.getState()
      if (!s.onboarded) return
      pending += 5
      const inside = s.mode === 'interior' ? s.interiorId : null
      if (inside !== insideId) { commit(); insideId = inside }
      if (inside) pendingInside += 5
    }, 5000)
    const flush = setInterval(commit, 60000)
    const onHide = () => { if (document.hidden) commit() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', commit)
    return () => { clearInterval(tick); clearInterval(flush); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', commit) }
  }, [])
  return null
}

/** Resolves the graphics tier from the quality setting and the device; auto mode may step down later. */
export function PerfDirector() {
  const quality = useGame((s) => s.quality)
  useEffect(() => {
    const tier = resolveTier(quality)
    useGame.getState().setUi({ tier, dpr: dprFor(tier) })
  }, [quality])
  return null
}

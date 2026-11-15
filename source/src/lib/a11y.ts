import { useGame } from '../state/gameStore'

/** True when the player asked for less motion, in-game or through the system setting. */
export function reducedMotion(): boolean {
  const pref = useGame.getState().a11y.reduceMotion
  if (pref === 'on') return true
  if (pref === 'off') return false
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

import narrationJson from '../content/narration.json'
import type { Bi, LandmarkId } from './types'
import { LANDMARK_MAP } from './landmarks'

/**
 * Audio-guide scripts. Every sentence restates facts already in landmarks.ts /
 * collectibles.ts (and their sources) — nothing new is introduced here.
 */
const SCRIPTS = narrationJson as Partial<Record<LandmarkId, Bi>>

/** The written script, or — for landmarks without one — the verified history read aloud. */
export function narrationFor(id: LandmarkId): Bi {
  const s = SCRIPTS[id]
  if (s) return s
  const l = LANDMARK_MAP[id]
  return { ar: [l.name.ar + '.', ...l.history.ar].join(' '), en: [l.name.en + '.', ...l.history.en].join(' ') }
}
/** @deprecated use narrationFor — kept for existing imports */
export const NARRATION = new Proxy({} as Record<LandmarkId, Bi>, { get: (_, id: string) => narrationFor(id as LandmarkId) })

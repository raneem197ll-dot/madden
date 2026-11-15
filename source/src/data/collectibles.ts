import type { Bi, LandmarkId } from './types'
import collectiblesJson from '../content/collectibles.json'
import sourcesJson from '../content/sources.json'

export interface Source { title: string; url: string }

/**
 * Collectibles are digital "knowledge cards" found inside landmarks.
 * Two layers are kept strictly apart:
 *  - `object`  — the in-game item (always a symbolic/digital replica: a GAME ELEMENT)
 *  - `fact`    — a short historical statement, verified against the listed `sources`
 */
export interface Collectible {
  id: string // matches the hidden Interactive id inside the scene
  landmark: LandmarkId
  icon: string
  rarity: 'common' | 'rare' | 'legendary'
  name: Bi
  object: Bi
  fact: Bi
  sources: Source[]
}

export const COLLECTIBLES = collectiblesJson as unknown as Collectible[]

export const COLLECTIBLE_MAP = Object.fromEntries(COLLECTIBLES.map((c) => [`${c.landmark}:${c.id}`, c])) as Record<string, Collectible>
export const collectiblesFor = (id: LandmarkId) => COLLECTIBLES.filter((c) => c.landmark === id)
export const collectibleKey = (c: Collectible) => `hidden:${c.landmark}:${c.id}`

/** Reference lists shown under each landmark's history. */
export const LANDMARK_SOURCES = sourcesJson as Record<LandmarkId, Source[]>

export const RARITY_LABEL: Record<Collectible['rarity'], Bi> = {
  common: { ar: 'شائع', en: 'Common' },
  rare: { ar: 'نادر', en: 'Rare' },
  legendary: { ar: 'نفيس', en: 'Treasured' },
}

/**
 * Typed access to the editable content in `src/content/*.json`.
 * Historical text lives in JSON so it can be reviewed and updated without
 * touching game code. `npm run content:check` validates every file.
 */
import type { Bi, InfoContent, LandmarkId } from './types'
import interiorsJson from '../content/interiors.json'

export const INTERIORS = interiorsJson

/** Interior info cards for one landmark, keyed by card id (keys stay type-checked). */
export function interiorInfo<T extends Record<string, unknown>>(_id: LandmarkId, cards: T) {
  return cards as unknown as { [K in keyof T]: InfoContent }
}

/** Number of info cards inside each landmark (drives progress %). */
export const INFO_COUNT = Object.fromEntries(
  Object.entries(interiorsJson).map(([id, cards]) => [id, Object.keys(cards).length]),
) as Record<LandmarkId, number>

/** All interior cards as a flat list (used by the guide's knowledge base). */
export const ALL_INTERIOR_CARDS = Object.entries(interiorsJson).flatMap(([landmark, cards]) =>
  Object.values(cards as Record<string, InfoContent>).map((c) => ({ ...c, landmark: landmark as LandmarkId })),
)

export type { Bi }

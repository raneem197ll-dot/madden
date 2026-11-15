import type { LandmarkId } from './types'

/**
 * Snapshots of the in-game models, rendered at build time (scripts/render-shots.mjs)
 * and bundled. They are labelled in the UI as game-model snapshots, not photos.
 */
const files = import.meta.glob('../assets/renders/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const byKey: Record<string, string> = {}
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/([A-Za-z]+)-(\d)\.webp$/)
  if (m) byKey[`${m[1]}:${m[2]}`] = url
}

export function rendersFor(id: LandmarkId): string[] {
  return [0, 1, 2].map((i) => byKey[`${id}:${i}`]).filter(Boolean)
}

export function renderFor(key: string): string | undefined {
  return byKey[key]
}

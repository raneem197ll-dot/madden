import type { Bi, LandmarkId, LandmarkProgress, StoryProgress } from './types'
import challengesJson from '../content/challenges.json'

export type Goal = { k: 'discover'; key: string } | { k: 'unlock'; id: LandmarkId } | { k: 'story'; id: string }
export interface Challenge {
  id: string
  icon: string
  theme: 'seasonal' | 'collection'
  season: { type: 'always' } | { type: 'months' | 'hijri'; months: number[]; label: Bi }
  title: Bi
  desc: Bi
  goals: Goal[]
  points: number
}

/** Optional themed collections and seasonal challenges (src/content/challenges.json). */
export const CHALLENGES = challengesJson as unknown as Challenge[]
export const CHALLENGE_MAP = Object.fromEntries(CHALLENGES.map((c) => [c.id, c])) as Record<string, Challenge>

interface Snap {
  progress: Record<LandmarkId, LandmarkProgress>
  discoveries: Record<string, true | string>
  stories: Record<string, StoryProgress>
}

export function goalDone(g: Goal, s: Snap) {
  if (g.k === 'discover') return !!s.discoveries[g.key]
  if (g.k === 'unlock') return !!s.progress[g.id]?.unlocked
  return !!s.stories?.[g.id]?.doneAt
}

export function challengeProgress(c: Challenge, s: Snap): [number, number] {
  return [c.goals.filter((g) => goalDone(g, s)).length, c.goals.length]
}

/** Hijri (Umm al-Qura) month number for a date, or null if the browser can't compute it. */
export function hijriMonth(d: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric' }).formatToParts(d)
    const m = Number(parts.find((p) => p.type === 'month')?.value)
    return Number.isFinite(m) && m >= 1 && m <= 12 ? m : null
  } catch {
    return null
  }
}

export function challengeActive(c: Challenge, d = new Date()): boolean {
  if (c.season.type === 'always') return true
  if (c.season.type === 'months') return c.season.months.includes(d.getMonth() + 1)
  const h = hijriMonth(d)
  return h !== null && c.season.months.includes(h)
}

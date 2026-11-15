import type { Bi, LandmarkId } from './types'
import type { Source } from './collectibles'
import storiesJson from '../content/stories.json'

export type StoryStep =
  | { type: 'read' | 'reflect'; text: Bi }
  | { type: 'find'; target: string; clue: Bi }
  | { type: 'question'; q: Bi; options: Bi[]; answer: number; explain: Bi; sources?: Source[] }

export interface Story {
  id: string
  landmark: LandmarkId
  icon: string
  title: Bi
  intro: Bi
  steps: StoryStep[]
}

/** Short interactive discovery stories (content in src/content/stories.json). */
export const STORIES = storiesJson as unknown as Story[]
export const STORY_MAP = Object.fromEntries(STORIES.map((s) => [s.id, s])) as Record<string, Story>
export const storiesFor = (id: LandmarkId) => STORIES.filter((s) => s.landmark === id)
export const STORY_POINTS = 50

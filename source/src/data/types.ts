export type Lang = 'ar' | 'en'
export type Bi = { ar: string; en: string }

export type LandmarkId =
  | 'haram' | 'quba' | 'qiblatain' | 'uhud' | 'hejaz'
  | 'ghamama' | 'baqi' | 'jumuah' | 'sabaa' | 'manaratain' | 'ijabah' | 'miqat' | 'quranComplex' | 'rumah' | 'aqiq'

/** Filter categories shared by 3D landmarks and map-only places. */
export type PlaceCategory = 'mosque' | 'history' | 'museum' | 'market' | 'nature' | 'transport'

export interface Source { title: string; url: string }

export interface QuizQuestion {
  id: string
  q: Bi
  options: Bi[]
  answer: number
  explain: Bi
}

export interface LandmarkFact {
  label: Bi
  value: Bi
}

export interface Landmark {
  id: LandmarkId
  name: Bi
  tagline: Bi
  kind: Bi
  category: PlaceCategory
  coords: { lat: number; lng: number }
  /** the coordinates are approximate (labelled in the UI) */
  approx?: boolean
  /** check-in radius in metres */
  radiusM: number
  /** position in the miniature city (x, z); +z is south — computed from `coords` (see lib/geo.ts) */
  cityPos: [number, number]
  /** shown as part of the city from the start (no construction site), e.g. the Prophet's Mosque */
  alwaysBuilt?: boolean
  /** scale of the model in the city view */
  scale?: number
  /** words that make the guide think a question is about this place */
  keywords: string[]
  /** words that only name it (down-weighted when ranking answers) */
  nameWords: string[]
  /** rotation around Y in radians */
  rotY: number
  /** footprint radius used for plots / camera framing */
  footprint: number
  qrCode: string
  accent: string
  history: { ar: string[]; en: string[] }
  facts: LandmarkFact[]
  /** honesty note about the 3D representation */
  modelNote: Bi
  visitTip: Bi
  /** full / simplified walkable interior, `courtyard` = walkable plazas only, `none` = no walkable scene */
  interior: 'full' | 'simplified' | 'courtyard' | 'none'
  quiz: QuizQuestion[]
}

export type VerifyMethod = 'qr' | 'gps' | 'demo'

export interface LandmarkProgress {
  unlocked: boolean
  visitDate?: string // ISO date-time
  method?: VerifyMethod
  enteredCount?: number
}

export interface MemoryItem {
  id: string
  landmarkId: LandmarkId
  createdAt: string
  date: string // yyyy-mm-dd chosen by the user
  note: string
  photoKey?: string
  sample?: boolean
  /** bundled sample photo (demo journey), not stored in IndexedDB */
  samplePhoto?: string
  /** chosen by the user: visible on their shared city (private by default) */
  shared?: boolean
}

export interface InfoContent {
  id: string
  title: Bi
  body: Bi
  tag?: 'info' | 'hidden' | 'memory'
  /** verified = historical statement backed by the landmark's sources; game = game/navigation element */
  kind?: 'verified' | 'game'
}

export type TimeMode = 'manual' | 'live' | 'cycle'
export type Weather = 'clear' | 'cloudy' | 'rain'

export interface AudioPrefs {
  master: boolean
  music: boolean
  musicVol: number
  ambient: boolean
  ambientVol: number
  sfx: boolean
  voiceLang: Lang
}

export interface Privacy {
  /** opt-in: keep a private copy of progress in the viewer's own cloud space */
  cloudBackup: boolean
  /** opt-in (needs cloudBackup): include memory notes in that copy. Photos never leave the device. */
  cloudNotes: boolean
  publish: boolean
  showName: boolean
  showDates: boolean
  showStats: boolean
  showCollection: boolean
  sharePhotos: boolean
}

/** What a friend can see of someone's city (written only with the owner's consent). */
export interface SharedCity {
  uid: string
  code: string
  name?: string
  updatedAt: number
  sample?: boolean
  unlocked: Partial<Record<LandmarkId, string | true>>
  decorations: string[]
  completion: number
  stats?: { points: number; memories: number; collectibles: number; playMinutes: number }
  collection?: string[]
  memories: { landmarkId: LandmarkId; date?: string; note: string; photo?: string }[]
}

export type QualityMode = 'auto' | 'high' | 'medium' | 'low'
export type Tier = 'high' | 'medium' | 'low'

export interface A11yPrefs {
  /** text size multiplier: 1, 1.15 or 1.3 */
  textScale: number
  reduceMotion: 'system' | 'on' | 'off'
  captions: boolean
}

export interface StoryProgress {
  step: number
  startedAt: string
  doneAt?: string
}

export interface GuideEntry {
  id: string
  at: string
  lang: Lang
  q: string
  /** Claude-written summary (only in Claude mode), always shown with the verified cards it cites */
  answer?: string
  factIds: string[]
  /** recommendation text — never presented as a fact */
  rec?: string
  planLink?: boolean
  source: 'local' | 'claude'
  unknown?: boolean
}

export type PlanBudget = 'short' | 'half' | 'full'
export interface PlanPrefs {
  budget: PlanBudget
  interests: string[]
  mode: 'walk' | 'car'
  accessible: boolean
  start: string
  startHour: number
  skipVisited: boolean
}

/** A map-only place (no 3D model): a verified summary, a recommendation and sources. */
export interface Place {
  id: string
  name: Bi
  category: PlaceCategory
  coords: { lat: number; lng: number }
  approx?: boolean
  approxNote?: Bi
  /** verified summary (backed by `sources`) */
  summary: Bi
  facts: LandmarkFact[]
  /** a recommendation — never presented as a fact */
  tip: Bi
  /** the 3D landmark it sits next to, if any */
  near?: LandmarkId
  keywords: string[]
  sources: Source[]
  /** computed position in the miniature city */
  cityPos: [number, number]
  /** not offered as an itinerary stop (e.g. no visitor facilities we can verify) */
  noPlan?: boolean
  /** drawn at the map edge because it is further out than the miniature reaches */
  edge?: boolean
}

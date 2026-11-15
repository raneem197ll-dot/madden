import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { PlaceCategory } from '../data/types'
import type { A11yPrefs, AudioPrefs, Bi, GuideEntry, InfoContent, Lang, LandmarkId, LandmarkProgress, MemoryItem, PlanPrefs, Privacy, QualityMode, SharedCity, Tier, TimeMode, VerifyMethod, Weather } from '../data/types'
import { STORY_MAP, STORY_POINTS } from '../data/stories'
import { CHALLENGES, challengeActive, challengeProgress } from '../data/challenges'
import { LANDMARK_IDS, LANDMARK_MAP } from '../data/landmarks'
import { ACH_MAP, cityCompletion, computePoints, pendingAchievements, type ProgressSnapshot } from '../data/progression'
import { tr } from '../data/i18n'
import { uid } from '../lib/format'
import { sfx } from '../lib/sfx'

export type Tab = 'city' | 'explore' | 'passport' | 'memories' | 'achievements'
export type CamKind = 'home' | 'focus' | 'build' | 'door' | 'exitDoor' | 'aerial' | 'replayFocus' | 'route'
/** `id` is a landmark id, or a map-only place id for a simple 'focus' */
export interface CamRequest { kind: CamKind; id?: string; n: number }
export interface Toast { id: string; kind: 'info' | 'success' | 'achievement' | 'error'; title: string; body?: string; icon?: string }
export type ReplayPhase = 'intro' | 'fly' | 'build' | 'card' | 'aerial' | 'end'
export interface ReplayState {
  active: boolean
  order: LandmarkId[]
  index: number
  phase: ReplayPhase
  built: LandmarkId[]
  /** route segments drawn so far: each is [from, to] where from may be 'start' */
  route: { from: LandmarkId | 'start'; to: LandmarkId; t0: number }[]
}

export interface PersistedState extends ProgressSnapshot {
  version: number
  profileName: string
  lang: Lang
  night: boolean
  demoMode: boolean
  soundOn: boolean
  onboarded: boolean
  decorations: Record<string, boolean>
  updatedAt: number
  /* v2 */
  hour: number
  timeMode: TimeMode
  weather: Weather
  quality: QualityMode
  audio: AudioPrefs
  playSeconds: number
  insideSeconds: Record<string, number>
  createdAt: string
  privacy: Privacy
  shareCode: string
  showRoutes: boolean
  /* v3 */
  a11y: A11yPrefs
  activeStory: string | null
  guideLog: GuideEntry[]
  plan: PlanPrefs | null
  /** saved itinerary order (landmark or place ids) drawn on the map */
  planOrder: string[] | null
}

export type Panel = null | 'env' | 'audio' | 'share' | 'friends' | 'ar' | 'features' | 'content' | 'data' | 'guide' | 'plan' | 'thenNow' | 'stories' | 'journey' | 'offline' | 'a11y' | 'challenges'

interface UiState {
  tab: Tab
  selected: LandmarkId | null
  sheetOpen: boolean
  verifyFor: LandmarkId | null
  verifyMode: 'qr' | 'gps'
  mode: 'city' | 'interior'
  interiorId: LandmarkId | null
  fade: { on: boolean; label?: Bi }
  constructing: { id: LandmarkId; start: number; duration: number } | null
  celebrate: LandmarkId | null
  cam: CamRequest | null
  replay: ReplayState
  toasts: Toast[]
  inspect: (InfoContent & { image?: string; scene?: LandmarkId }) | null
  focusHint: { id: string; title: Bi } | null
  composer: { landmarkId: LandmarkId | null } | null
  memoryView: string | null
  quizFor: LandmarkId | null
  settingsOpen: boolean
  galleryFor: LandmarkId | null
  cloud: 'off' | 'syncing' | 'synced' | 'error'
  interiorNonce: number
  /* v2 */
  visiting: SharedCity | null
  /** landmark or place id the selected landmark's route is drawn to */
  routeTo: string | null
  panel: Panel
  arFor: LandmarkId | null
  guideFor: LandmarkId | null
  collectionView: string | null
  achTab: 'stats' | 'achievements' | 'collection' | 'challenges'
  passTab: 'passport' | 'friends'
  /** performance.now() when a landmark's road began growing (UI only) */
  grownAt: Partial<Record<LandmarkId, number>>
  social: 'off' | 'local' | 'shared'
  canPublish: boolean | null
  /* v3 */
  online: boolean
  tier: Tier
  dpr: number
  swStatus: 'unsupported' | 'pending' | 'active' | 'blocked'
  thenNowFor: LandmarkId | null
  storyFeedback: { step: number; choice: number } | null
  caption: string | null
  /* v4 */
  /** map-only place whose sheet is open */
  placeFor: string | null
  /** category shown on the map ('all' or one category) */
  mapFilter: PlaceCategory | 'all'
  /** show map-only place pins */
  showPins: boolean
}

interface Actions {
  setLang: (l: Lang) => void
  toggleNight: () => void
  setDemo: (v: boolean) => void
  setSound: (v: boolean) => void
  setName: (n: string) => void
  finishOnboarding: () => void
  setTab: (t: Tab) => void
  select: (id: LandmarkId | null, opts?: { fly?: boolean }) => void
  closeSheet: () => void
  openVerify: (id: LandmarkId) => void
  closeVerify: () => void
  unlock: (id: LandmarkId, method: VerifyMethod) => void
  setVisitDate: (id: LandmarkId, iso: string) => void
  addMemory: (m: Omit<MemoryItem, 'id' | 'createdAt'>) => void
  updateMemory: (id: string, patch: Partial<MemoryItem>) => void
  deleteMemory: (id: string) => void
  answerQuiz: (qid: string, correct: boolean) => void
  discover: (key: string) => boolean
  markEntered: (id: LandmarkId) => void
  toggleDecoration: (id: string) => void
  camTo: (kind: CamKind, id?: string) => void
  /** open a map-only place's sheet and fly to its pin */
  openPlace: (id: string | null) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  runChecks: () => void
  loadDemoJourney: () => void
  resetProgress: () => void
  setUi: (patch: Partial<UiState>) => void
  setReplay: (patch: Partial<ReplayState>) => void
  applyRemote: (p: Partial<PersistedState>) => void
  /* v2 */
  setPrefs: (patch: Partial<PersistedState>) => void
  setHour: (h: number) => void
  setAudio: (patch: Partial<AudioPrefs>) => void
  setPrivacy: (patch: Partial<Privacy>) => void
  trackTime: (seconds: number, inside: LandmarkId | null) => void
  toggleMemoryShared: (id: string) => void
  visit: (city: SharedCity | null) => void
  /* v3 */
  setA11y: (patch: Partial<A11yPrefs>) => void
  startStory: (id: string) => void
  advanceStory: (id: string) => void
  storyInspect: (key: string) => void
  logGuide: (e: GuideEntry) => void
  clearGuide: () => void
  setPlan: (p: PlanPrefs | null, order?: string[] | null) => void
}

export type GameState = PersistedState & UiState & Actions

const emptyProgress = (): Record<LandmarkId, LandmarkProgress> =>
  Object.fromEntries(LANDMARK_IDS.map((id) => [id, { unlocked: false }])) as Record<LandmarkId, LandmarkProgress>

const defaults: PersistedState = {
  version: 4,
  profileName: '',
  lang: 'ar',
  night: false,
  demoMode: true,
  soundOn: true,
  onboarded: false,
  progress: emptyProgress(),
  memories: [],
  achievements: {},
  quiz: {},
  discoveries: {},
  replayWatched: false,
  nightSeen: false,
  decorations: { palms: true, train: true, fountain: true, lanterns: true, market: true },
  updatedAt: 0,
  hour: 10.5,
  timeMode: 'manual',
  weather: 'clear',
  quality: 'auto',
  audio: { master: true, music: false, musicVol: 0.5, ambient: true, ambientVol: 0.6, sfx: true, voiceLang: 'ar' },
  playSeconds: 0,
  insideSeconds: {},
  createdAt: new Date().toISOString(),
  privacy: { cloudBackup: false, cloudNotes: false, publish: false, showName: false, showDates: true, showStats: true, showCollection: true, sharePhotos: false },
  shareCode: '',
  showRoutes: false,
  stories: {},
  challenges: {},
  a11y: { textScale: 1, reduceMotion: 'system', captions: true },
  activeStory: null,
  guideLog: [],
  plan: null,
  planOrder: null,
}

export const isNightHour = (h: number) => h >= 19 || h < 5.5

const emptyReplay: ReplayState = { active: false, order: [], index: 0, phase: 'intro', built: [], route: [] }

/** localStorage may be missing or throw inside sandboxed frames: fall back to memory. */
const memoryStore = new Map<string, string>()
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k) } catch { return memoryStore.get(k) ?? null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { memoryStore.set(k, v) } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { memoryStore.delete(k) } },
}

export const PERSIST_KEYS: (keyof PersistedState)[] = [
  'version', 'profileName', 'lang', 'night', 'demoMode', 'soundOn', 'onboarded', 'progress', 'memories',
  'achievements', 'quiz', 'discoveries', 'replayWatched', 'nightSeen', 'decorations', 'updatedAt',
  'hour', 'timeMode', 'weather', 'quality', 'audio', 'playSeconds', 'insideSeconds', 'createdAt', 'privacy', 'shareCode', 'showRoutes',
  'stories', 'challenges', 'a11y', 'activeStory', 'guideLog', 'plan', 'planOrder',
]

export const BUILD_DURATION = 3600

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** set + bump updatedAt for anything that must be saved */
      const save = (patch: Partial<GameState>) => set({ ...patch, updatedAt: Date.now() })
      const L = () => get().lang

      return {
        ...defaults,
        tab: 'city',
        selected: null,
        sheetOpen: false,
        verifyFor: null,
        verifyMode: 'qr',
        mode: 'city',
        interiorId: null,
        fade: { on: false },
        constructing: null,
        celebrate: null,
        cam: null,
        replay: emptyReplay,
        toasts: [],
        inspect: null,
        focusHint: null,
        composer: null,
        memoryView: null,
        quizFor: null,
        settingsOpen: false,
        galleryFor: null,
        cloud: 'off',
        interiorNonce: 0,
        visiting: null,
        routeTo: null,
        placeFor: null,
        mapFilter: 'all',
        showPins: true,
        panel: null,
        arFor: null,
        guideFor: null,
        collectionView: null,
        achTab: 'stats',
        passTab: 'passport',
        grownAt: {},
        social: 'off',
        canPublish: null,
        online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
        tier: 'high',
        dpr: 1.5,
        swStatus: 'unsupported',
        thenNowFor: null,
        storyFeedback: null,
        caption: null,

        setA11y: (patch) => save({ a11y: { ...get().a11y, ...patch } }),
        startStory: (id) => {
          const st = get().stories[id]
          if (st?.doneAt) return // finished stories stay finished (reviewed, not replayed for points)
          const stories = st ? get().stories : { ...get().stories, [id]: { step: 0, startedAt: new Date().toISOString() } }
          save({ stories, activeStory: id, storyFeedback: null })
        },
        advanceStory: (id) => {
          const story = STORY_MAP[id]
          const st = get().stories[id]
          if (!story || !st || st.doneAt) return
          const step = st.step + 1
          if (step >= story.steps.length) {
            save({ stories: { ...get().stories, [id]: { ...st, step: story.steps.length, doneAt: new Date().toISOString() } }, activeStory: null, storyFeedback: null })
            sfx.achievement(get().soundOn)
            get().toast({ kind: 'achievement', icon: story.icon, title: `${tr('storyDone', L())}: ${story.title[L()]}`, body: `+${STORY_POINTS} ${tr('points', L())}` })
            get().runChecks()
            return
          }
          save({ stories: { ...get().stories, [id]: { ...st, step } }, storyFeedback: null })
        },
        storyInspect: (key) => {
          const id = get().activeStory
          if (!id) return
          const story = STORY_MAP[id]
          const st = get().stories[id]
          const step = story?.steps[st?.step ?? -1]
          if (step?.type === 'find' && step.target === key) {
            sfx.collect(get().soundOn)
            setTimeout(() => get().advanceStory(id), 350)
          }
        },
        logGuide: (e) => save({ guideLog: [...get().guideLog, e].slice(-40) }),
        clearGuide: () => save({ guideLog: [] }),
        setPlan: (plan, order) => save({ plan, planOrder: order === undefined ? get().planOrder : order }),

        setLang: (lang) => save({ lang, audio: { ...get().audio, voiceLang: lang } }),
        toggleNight: () => {
          const night = !isNightHour(get().hour)
          get().setHour(night ? 21.5 : 10.5)
        },
        setHour: (h) => {
          const hour = ((h % 24) + 24) % 24
          const night = isNightHour(hour)
          save({ hour, timeMode: 'manual', night, nightSeen: get().nightSeen || night })
          get().runChecks()
        },
        setPrefs: (patch) => save(patch),
        setAudio: (patch) => save({ audio: { ...get().audio, ...patch } }),
        setPrivacy: (patch) => save({ privacy: { ...get().privacy, ...patch } }),
        trackTime: (seconds, inside) => {
          const insideSeconds = { ...get().insideSeconds }
          if (inside) insideSeconds[inside] = (insideSeconds[inside] ?? 0) + seconds
          save({ playSeconds: get().playSeconds + seconds, insideSeconds })
        },
        toggleMemoryShared: (id) => save({ memories: get().memories.map((m) => (m.id === id ? { ...m, shared: !m.shared } : m)) }),
        visit: (city) => {
          set({ visiting: city, selected: null, sheetOpen: false, tab: 'city', panel: null, routeTo: null, celebrate: null })
          get().camTo('home')
        },
        setDemo: (demoMode) => save({ demoMode }),
        setSound: (soundOn) => save({ soundOn }),
        setName: (profileName) => save({ profileName: profileName.slice(0, 40) }),
        finishOnboarding: () => save({ onboarded: true }),
        setTab: (tab) => set({ tab, sheetOpen: tab === 'city' ? get().sheetOpen : false }),

        select: (id, opts) => {
          if (!id) return set({ selected: null, sheetOpen: false })
          set({ selected: id, sheetOpen: true, tab: 'city', placeFor: null })
          if (opts?.fly !== false) get().camTo('focus', id)
        },
        closeSheet: () => {
          set({ sheetOpen: false })
        },
        openVerify: (id) => set({ verifyFor: id }),
        closeVerify: () => set({ verifyFor: null }),

        unlock: (id, method) => {
          const s = get()
          if (s.progress[id]?.unlocked || s.constructing) return
          const progress = { ...s.progress, [id]: { ...s.progress[id], unlocked: true, visitDate: new Date().toISOString(), method } }
          save({ progress, verifyFor: null, sheetOpen: false, selected: id, tab: 'city' })
          if (LANDMARK_MAP[id].alwaysBuilt) {
            // already part of the city (e.g. the Prophet's Mosque): just record the visit, calmly
            get().camTo('focus', id)
            setTimeout(() => {
              set({ celebrate: id })
              get().toast({ kind: 'success', icon: '✓', title: `${LANDMARK_MAP[id].name[L()]} — ${L() === 'ar' ? 'سُجّلت زيارتك' : 'visit recorded'}`, body: `+100 ${tr('points', L())}` })
              get().runChecks()
            }, 700)
            return
          }
          get().camTo('build', id)
          // camera flies first, then the building rises
          setTimeout(() => {
            set({ constructing: { id, start: performance.now(), duration: BUILD_DURATION }, grownAt: { ...get().grownAt, [id]: performance.now() + BUILD_DURATION * 0.5 } })
            sfx.build(get().soundOn)
          }, 900)
          setTimeout(() => {
            set({ constructing: null, celebrate: id })
            sfx.success(get().soundOn)
            get().toast({ kind: 'success', icon: '🏗️', title: `${LANDMARK_MAP[id].name[L()]} — ${tr('built', L())}`, body: `+100 ${tr('points', L())}` })
            get().runChecks()
          }, 900 + BUILD_DURATION + 150)
        },

        setVisitDate: (id, iso) => {
          const p = get().progress[id]
          if (!p?.unlocked) return
          save({ progress: { ...get().progress, [id]: { ...p, visitDate: iso } } })
        },

        addMemory: (m) => {
          const item: MemoryItem = { ...m, id: uid(), createdAt: new Date().toISOString() }
          save({ memories: [...get().memories, item] })
          get().toast({ kind: 'success', icon: '📷', title: tr('addMemory', L()), body: `+20 ${tr('points', L())}` })
          get().runChecks()
        },
        updateMemory: (id, patch) => save({ memories: get().memories.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
        deleteMemory: (id) => save({ memories: get().memories.filter((m) => m.id !== id), memoryView: null }),

        answerQuiz: (qid, correct) => {
          if (qid in get().quiz) return
          save({ quiz: { ...get().quiz, [qid]: correct } })
          get().runChecks()
        },

        discover: (key) => {
          if (get().discoveries[key]) return false
          save({ discoveries: { ...get().discoveries, [key]: new Date().toISOString() } })
          get().runChecks()
          return true
        },

        markEntered: (id) => {
          const p = get().progress[id]
          save({ progress: { ...get().progress, [id]: { ...p, enteredCount: (p?.enteredCount ?? 0) + 1 } } })
          get().runChecks()
        },

        toggleDecoration: (id) => save({ decorations: { ...get().decorations, [id]: !get().decorations[id] } }),

        camTo: (kind, id) => set({ cam: { kind, id, n: (get().cam?.n ?? 0) + 1 } }),
        openPlace: (id) => {
          if (!id) return set({ placeFor: null })
          set({ placeFor: id, sheetOpen: false, tab: 'city', panel: null })
          get().camTo('focus', id)
        },

        toast: (t) => {
          const id = uid()
          set({ toasts: [...get().toasts.slice(-1), { ...t, id }] })
          setTimeout(() => get().dismissToast(id), t.kind === 'achievement' ? 3800 : 3000)
        },
        dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),

        runChecks: () => {
          const s = get()
          // challenges: complete when every goal is met (seasonal ones only while in season)
          const doneNow = CHALLENGES.filter((c) => !s.challenges?.[c.id] && challengeActive(c) && (([v, m]) => v >= m)(challengeProgress(c, s)))
          if (doneNow.length) {
            const now = new Date().toISOString()
            save({ challenges: { ...s.challenges, ...Object.fromEntries(doneNow.map((c) => [c.id, now])) } })
            doneNow.forEach((c, i) => setTimeout(() => {
              sfx.achievement(get().soundOn)
              get().toast({ kind: 'achievement', icon: c.icon, title: `${tr('challengeDone', L())}: ${c.title[L()]}`, body: `+${c.points} ${tr('points', L())}` })
            }, 400 + i * 900))
            return get().runChecks()
          }
          const pending = pendingAchievements(s)
          if (!pending.length) return
          const now = new Date().toISOString()
          const achievements = { ...s.achievements }
          pending.forEach((a) => { achievements[a.id] = now })
          save({ achievements })
          pending.forEach((a, i) =>
            setTimeout(() => {
              sfx.achievement(get().soundOn)
              get().toast({ kind: 'achievement', icon: a.icon, title: `${tr('achievementUnlocked', L())}: ${a.title[L()]}`, body: `+${ACH_MAP[a.id].points} ${tr('points', L())}` })
            }, 700 + i * 900),
          )
        },

        loadDemoJourney: () => {
          const order: LandmarkId[] = ['quba', 'hejaz', 'qiblatain', 'uhud']
          const notes: Partial<Record<LandmarkId, Bi>> = {
            quba: { ar: 'بدأت رحلتي من أول مسجد في الإسلام. هدوء الصباح لا يُنسى.', en: 'Started at the first mosque in Islam. The morning calm was unforgettable.' },
            hejaz: { ar: 'تخيّلت الحجاج ينزلون من القطار قبل أكثر من مئة عام.', en: 'Imagined pilgrims stepping off the train over a century ago.' },
            qiblatain: { ar: 'وقفت أتأمل قصة تحويل القبلة.', en: 'Stood reflecting on the story of the qibla change.' },
            uhud: { ar: 'غروب أحمر على جبل أحد — ختام جميل للرحلة.', en: 'A red sunset over Uhud — a beautiful end to the trip.' },
          }
          const base = Date.now() - 9 * 86400000
          const progress = emptyProgress()
          const memories: MemoryItem[] = get().memories.filter((m) => !m.sample)
          order.forEach((id, i) => {
            const d = new Date(base + i * 2 * 86400000 + (8 + i * 2) * 3600000)
            progress[id] = { ...get().progress[id], unlocked: true, visitDate: d.toISOString(), method: 'demo' }
            memories.push({
              id: uid(), landmarkId: id, createdAt: d.toISOString(), date: d.toISOString().slice(0, 10),
              note: notes[id]?.[L()] ?? '', sample: true, samplePhoto: `${id}:0`,
            })
          })
          const created = new Date(base - 86400000).toISOString()
          save({ progress, memories, settingsOpen: false, constructing: null, createdAt: get().createdAt < created ? get().createdAt : created })
          get().toast({ kind: 'success', icon: '🧳', title: tr('demoJourney', L()), body: tr('replay', L()) + ' ▶' })
          get().runChecks()
        },

        resetProgress: () => {
          const g = get()
          save({ ...defaults, lang: g.lang, onboarded: true, demoMode: g.demoMode, soundOn: g.soundOn, profileName: g.profileName, audio: g.audio, quality: g.quality, a11y: g.a11y, guideLog: g.guideLog, plan: g.plan, shareCode: g.shareCode, privacy: { ...g.privacy, publish: false }, createdAt: new Date().toISOString(), settingsOpen: false, selected: null, sheetOpen: false, grownAt: {} })
          get().camTo('home')
        },

        setUi: (patch) => set(patch),
        setReplay: (patch) => set({ replay: { ...get().replay, ...patch } }),
        applyRemote: (p) => {
          const patch: Partial<PersistedState> = {}
          for (const k of PERSIST_KEYS) if (k in p) (patch as Record<string, unknown>)[k] = (p as Record<string, unknown>)[k]
          patch.progress = { ...emptyProgress(), ...(patch.progress ?? get().progress) }
          set(patch)
        },
      }
    },
    {
      name: 'madinah-my-story-v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as Partial<GameState>,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>
        const out = { ...current, ...p, progress: { ...emptyProgress(), ...(p.progress ?? {}) } }
        out.audio = { ...defaults.audio, ...(p.audio ?? {}) }
        out.privacy = { ...defaults.privacy, ...(p.privacy ?? {}) }
        out.a11y = { ...defaults.a11y, ...(p.a11y ?? {}) }
        // v3: quality became auto/high/medium/low; old saves were auto-derived, so start from auto
        if ((p.version ?? 1) < 3) { out.quality = 'auto'; out.version = 3 }
        // v4: 15 landmarks + map places — new landmarks start locked (emptyProgress above)
        if ((out.version ?? 1) < 4) out.version = 4
        out.stories = p.stories ?? {}
        out.challenges = p.challenges ?? {}
        out.guideLog = Array.isArray(p.guideLog) ? p.guideLog : []
        if (p.hour === undefined && p.night) out.hour = 21.5
        if (!p.shareCode) out.shareCode = Math.random().toString(36).slice(2, 8)
        return out
      },
    },
  ),
)

/* ---------- selectors ---------- */
export const usePoints = () => useGame((s) => computePoints(s))
export const useCompletion = () => useGame((s) => cityCompletion(s))
/** Landmark unlock state as currently displayed (own city, a friend's city, or the replay). */
export function viewUnlocked(s: GameState): Record<LandmarkId, boolean> {
  const out = {} as Record<LandmarkId, boolean>
  for (const id of LANDMARK_IDS) {
    if (s.replay.active) out[id] = s.replay.built.includes(id) || s.constructing?.id === id
    else if (s.visiting) out[id] = !!s.visiting.unlocked[id]
    else out[id] = !!s.progress[id]?.unlocked
  }
  return out
}
export const useUnlockedCount = () => useGame((s) => LANDMARK_IDS.filter((id) => s.progress[id]?.unlocked).length)
export const useT = () => {
  const lang = useGame((s) => s.lang)
  return (k: Parameters<typeof tr>[0]) => tr(k, lang)
}
export const getPersisted = (): PersistedState => {
  const s = useGame.getState()
  return Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as unknown as PersistedState
}

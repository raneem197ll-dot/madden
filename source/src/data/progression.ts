import { INFO_COUNT } from './content'
import type { Bi, LandmarkId, LandmarkProgress, MemoryItem, StoryProgress } from './types'
import { STORIES, STORY_POINTS } from './stories'
import { CHALLENGES, CHALLENGE_MAP } from './challenges'
import { LANDMARK_IDS, LANDMARK_MAP } from './landmarks'
import { COLLECTIBLES } from './collectibles'

const VALID_HIDDEN = new Set(COLLECTIBLES.map((c) => `hidden:${c.landmark}:${c.id}`))

/** The slice of persisted state that progression rules read. */
export interface ProgressSnapshot {
  progress: Record<LandmarkId, LandmarkProgress>
  memories: MemoryItem[]
  achievements: Record<string, string>
  quiz: Record<string, boolean>
  discoveries: Record<string, true | string>
  replayWatched: boolean
  nightSeen: boolean
  stories: Record<string, StoryProgress>
  /** completed challenges → ISO date */
  challenges: Record<string, string>
}

export interface Achievement {
  id: string
  icon: string
  title: Bi
  desc: Bi
  points: number
  progress: (s: ProgressSnapshot) => [number, number]
}

const unlockedCount = (s: ProgressSnapshot) => LANDMARK_IDS.filter((id) => s.progress[id]?.unlocked).length
const correctCount = (s: ProgressSnapshot) => Object.values(s.quiz).filter(Boolean).length
const infoCount = (s: ProgressSnapshot) => Object.keys(s.discoveries).filter((k) => k.startsWith('info:')).length
const hiddenCount = (s: ProgressSnapshot, scene: string) =>
  Object.keys(s.discoveries).filter((k) => k.startsWith(`hidden:${scene}:`) && VALID_HIDDEN.has(k)).length
const storiesDone = (s: ProgressSnapshot) => STORIES.filter((st) => s.stories?.[st.id]?.doneAt).length
const seasonalDone = (s: ProgressSnapshot) => Object.keys(s.challenges ?? {}).filter((id) => CHALLENGE_MAP[id]?.theme === 'seasonal').length
const enteredCount = (s: ProgressSnapshot) => LANDMARK_IDS.filter((id) => (s.progress[id]?.enteredCount ?? 0) > 0).length

export const HIDDEN_TOTAL: Record<string, number> = Object.fromEntries(LANDMARK_IDS.map((id) => [id, COLLECTIBLES.filter((c) => c.landmark === id).length]))
export const INFO_TOTAL: Record<string, number> = INFO_COUNT
export const allHidden = (s: ProgressSnapshot) => Object.keys(s.discoveries).filter((k) => VALID_HIDDEN.has(k)).length

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step', icon: '🧭', points: 50,
    title: { ar: 'الخطوة الأولى', en: 'First Step' },
    desc: { ar: 'افتح أول معلم في مدينتك', en: 'Unlock your first landmark' },
    progress: (s) => [Math.min(unlockedCount(s), 1), 1],
  },
  {
    id: 'hijrah-trail', icon: '🕌', points: 80,
    title: { ar: 'على خطى الهجرة', en: 'The Hijrah Trail' },
    desc: { ar: 'زر محطات الوصول في الهجرة: قباء ثم مسجد الجمعة ثم المسجد النبوي', en: 'Visit the Hijrah arrival stops: Quba, Al-Jumu‘ah, then the Prophet’s Mosque' },
    progress: (s) => [(['quba', 'jumuah', 'haram'] as LandmarkId[]).filter((id) => s.progress[id]?.unlocked).length, 3],
  },
  {
    id: 'city-complete', icon: '🏙️', points: 150,
    title: { ar: 'مدينتي اكتملت', en: 'My City is Complete' },
    desc: { ar: 'زر جميع المعالم الخمسة عشر', en: 'Visit all fifteen landmarks' },
    progress: (s) => [unlockedCount(s), LANDMARK_IDS.length],
  },
  {
    id: 'downtown-walker', icon: '🚶', points: 80,
    title: { ar: 'جولة وسط المدينة', en: 'Downtown Walk' },
    desc: { ar: 'زر المسجد النبوي ومسجد الغمامة والبقيع', en: 'Visit the Prophet’s Mosque, Al-Ghamama and al-Baqi' },
    progress: (s) => [(['haram', 'ghamama', 'baqi'] as LandmarkId[]).filter((id) => s.progress[id]?.unlocked).length, 3],
  },
  {
    id: 'mosques-of-madinah', icon: '🕌', points: 120,
    title: { ar: 'مساجد المدينة', en: 'Mosques of Madinah' },
    desc: { ar: 'زر ستة من مساجد المدينة التاريخية', en: 'Visit six of Madinah’s historic mosques' },
    progress: (s) => [Math.min(LANDMARK_IDS.filter((id) => LANDMARK_MAP[id].category === 'mosque' && s.progress[id]?.unlocked).length, 6), 6],
  },
  {
    id: 'through-doors', icon: '🚪', points: 40,
    title: { ar: 'عابر الأبواب', en: 'Through the Doors' },
    desc: { ar: 'ادخل أحد المعالم وتجوّل فيه', en: 'Enter a landmark and walk inside' },
    progress: (s) => [Math.min(enteredCount(s), 1), 1],
  },
  {
    id: 'explorer-eye', icon: '🔍', points: 100,
    title: { ar: 'عين المستكشف', en: 'Explorer’s Eye' },
    desc: { ar: 'اعثر على التفاصيل المخفية الثلاثة في متحف سكة الحجاز', en: 'Find the 3 hidden details in the Hejaz Railway Museum' },
    progress: (s) => [hiddenCount(s, 'hejaz'), HIDDEN_TOTAL.hejaz],
  },
  {
    id: 'collector', icon: '🗝️', points: 80,
    title: { ar: 'جامع المقتنيات', en: 'Collector' },
    desc: { ar: 'اجمع ٦ مقتنيات من داخل المعالم', en: 'Collect 6 items inside landmarks' },
    progress: (s) => [Math.min(allHidden(s), 6), 6],
  },
  {
    id: 'curator', icon: '🏛️', points: 200,
    title: { ar: 'أمين الخزانة', en: 'Curator' },
    desc: { ar: 'اجمع المقتنيات الاثني عشر كلها', en: 'Collect all 12 items' },
    progress: (s) => [Math.min(allHidden(s), 12), 12],
  },
  {
    id: 'history-scholar', icon: '📜', points: 100,
    title: { ar: 'باحث التاريخ', en: 'History Scholar' },
    desc: { ar: 'أجب عن ٦ أسئلة تاريخية إجابة صحيحة', en: 'Answer 6 history questions correctly' },
    progress: (s) => [Math.min(correctCount(s), 6), 6],
  },
  {
    id: 'memory-keeper', icon: '📷', points: 40,
    title: { ar: 'حافظ الذكريات', en: 'Memory Keeper' },
    desc: { ar: 'احفظ أول ذكرى شخصية', en: 'Save your first personal memory' },
    progress: (s) => [Math.min(s.memories.filter((m) => !m.sample).length, 1), 1],
  },
  {
    id: 'curious-mind', icon: '💡', points: 60,
    title: { ar: 'فضول المعرفة', en: 'Curious Mind' },
    desc: { ar: 'افتح ٨ بطاقات معلومات داخل المعالم', en: 'Open 8 info cards inside landmarks' },
    progress: (s) => [Math.min(infoCount(s), 8), 8],
  },
  {
    id: 'storyteller', icon: '🎞️', points: 40,
    title: { ar: 'راوي الرحلة', en: 'Storyteller' },
    desc: { ar: 'شاهد «أعد عيش رحلتي»', en: 'Watch “Relive My Journey”' },
    progress: (s) => [s.replayWatched ? 1 : 0, 1],
  },
  {
    id: 'story-seeker', icon: '📖', points: 40,
    title: { ar: 'متتبّع القصص', en: 'Story Seeker' },
    desc: { ar: 'أكمل قصة تفاعلية واحدة داخل أحد المعالم', en: 'Complete one interactive story inside a landmark' },
    progress: (s) => [Math.min(storiesDone(s), 1), 1],
  },
  {
    id: 'lore-keeper', icon: '🪶', points: 150,
    title: { ar: 'حافظ الحكايات', en: 'Lore Keeper' },
    desc: { ar: 'أكمل القصص التفاعلية الأربع', en: 'Complete all four interactive stories' },
    progress: (s) => [storiesDone(s), STORIES.length],
  },
  {
    id: 'season-explorer', icon: '🗓️', points: 60,
    title: { ar: 'مستكشف المواسم', en: 'Season Explorer' },
    desc: { ar: 'أكمل تحديًا موسميًا واحدًا', en: 'Complete one seasonal challenge' },
    progress: (s) => [Math.min(seasonalDone(s), 1), 1],
  },
  {
    id: 'madinah-nights', icon: '🌙', points: 20,
    title: { ar: 'ليالي المدينة', en: 'Madinah Nights' },
    desc: { ar: 'شاهد مدينتك ليلًا', en: 'See your city at night' },
    progress: (s) => [s.nightSeen ? 1 : 0, 1],
  },
]
export { CHALLENGES }
export const ACH_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>

export interface Decoration {
  id: 'palms' | 'fountain' | 'train' | 'lanterns' | 'market'
  icon: string
  title: Bi
  desc: Bi
  requirement: Bi
  isUnlocked: (s: ProgressSnapshot, points: number) => boolean
}

export const DECORATIONS: Decoration[] = [
  {
    id: 'palms', icon: '🌴',
    title: { ar: 'واحة النخيل', en: 'Palm Oasis' },
    desc: { ar: 'بستان نخيل وبركة ماء — المدينة مشهورة بتمورها', en: 'A palm grove and pool — Madinah is famed for its dates' },
    requirement: { ar: 'اجمع ١٠٠ نقطة', en: 'Earn 100 points' },
    isUnlocked: (_s, p) => p >= 100,
  },
  {
    id: 'train', icon: '🚂',
    title: { ar: 'قطار الحجاز الصغير', en: 'Mini Hejaz Train' },
    desc: { ar: 'قطار بخاري يدور حول مدينتك', en: 'A steam train circling your city' },
    requirement: { ar: 'افتح متحف سكة الحجاز', en: 'Unlock the Hejaz Railway Museum' },
    isUnlocked: (s) => !!s.progress.hejaz?.unlocked,
  },
  {
    id: 'fountain', icon: '⛲',
    title: { ar: 'نافورة الساحة', en: 'Plaza Fountain' },
    desc: { ar: 'نافورة في قلب المدينة', en: 'A fountain at the heart of the city' },
    requirement: { ar: 'اجمع ٣٠٠ نقطة', en: 'Earn 300 points' },
    isUnlocked: (_s, p) => p >= 300,
  },
  {
    id: 'lanterns', icon: '🏮',
    title: { ar: 'فوانيس الطريق الدائري', en: 'Ring Road Lanterns' },
    desc: { ar: 'فوانيس ذهبية تضيء ليلًا', en: 'Golden lanterns that glow at night' },
    requirement: { ar: 'أجب عن ٣ أسئلة صحيحة', en: 'Answer 3 questions correctly' },
    isUnlocked: (s) => Object.values(s.quiz).filter(Boolean).length >= 3,
  },
  {
    id: 'market', icon: '🧺',
    title: { ar: 'سوق التمور', en: 'Date Market' },
    desc: { ar: 'بسطات ملوّنة لبيع التمور', en: 'Colourful stalls selling dates' },
    requirement: { ar: 'افتح ٥ بطاقات معلومات', en: 'Open 5 info cards' },
    isUnlocked: (s) => Object.keys(s.discoveries).filter((k) => k.startsWith('info:')).length >= 5,
  },
]

export const LEVELS: { min: number; title: Bi }[] = [
  { min: 0, title: { ar: 'زائر جديد', en: 'New Visitor' } },
  { min: 150, title: { ar: 'رحّال', en: 'Wayfarer' } },
  { min: 450, title: { ar: 'مستكشف', en: 'Explorer' } },
  { min: 900, title: { ar: 'خبير المدينة', en: 'City Expert' } },
  { min: 1400, title: { ar: 'سفير المدينة', en: 'Madinah Ambassador' } },
]

export function levelFor(points: number) {
  let idx = 0
  LEVELS.forEach((l, i) => { if (points >= l.min) idx = i })
  const next = LEVELS[idx + 1]
  return { index: idx, title: LEVELS[idx].title, next, min: LEVELS[idx].min }
}

export const POINTS = { unlock: 100, quiz: 30, info: 10, hidden: 25, memory: 20, enter: 15 }

/** Points are derived from state, so they can never drift or double count. */
export function computePoints(s: ProgressSnapshot): number {
  let p = 0
  for (const id of LANDMARK_IDS) {
    if (s.progress[id]?.unlocked) p += POINTS.unlock
    if ((s.progress[id]?.enteredCount ?? 0) > 0) p += POINTS.enter
  }
  p += correctCount(s) * POINTS.quiz
  for (const k of Object.keys(s.discoveries)) p += k.startsWith('hidden:') ? (VALID_HIDDEN.has(k) ? POINTS.hidden : 0) : POINTS.info
  p += Math.min(s.memories.filter((m) => !m.sample).length, 12) * POINTS.memory
  for (const k of Object.keys(s.achievements)) p += ACH_MAP[k]?.points ?? 0
  p += storiesDone(s) * STORY_POINTS
  for (const id of Object.keys(s.challenges ?? {})) p += CHALLENGE_MAP[id]?.points ?? 0
  return p
}

export function pendingAchievements(s: ProgressSnapshot): Achievement[] {
  return ACHIEVEMENTS.filter((a) => {
    if (s.achievements[a.id]) return false
    const [v, max] = a.progress(s)
    return v >= max
  })
}

/* ---------------- per-landmark & city completion ---------------- */
/**
 * 40% for the verified visit, the rest split over what that landmark offers: info cards
 * (20), hidden details (25), its quiz (15) — and, where there is no walkable scene, a
 * personal memory (15) so those landmarks can still reach 100%.
 */
export function landmarkProgress(s: ProgressSnapshot, id: LandmarkId): number {
  if (!s.progress[id]?.unlocked) return 0
  const keys = Object.keys(s.discoveries)
  const parts: [number, number][] = []
  const infoT = INFO_TOTAL[id] ?? 0, hidT = HIDDEN_TOTAL[id] ?? 0
  if (infoT) parts.push([Math.min(1, keys.filter((k) => k.startsWith(`info:${id}:`)).length / infoT), 20])
  if (hidT) parts.push([Math.min(1, keys.filter((k) => k.startsWith(`hidden:${id}:`) && VALID_HIDDEN.has(k)).length / hidT), 25])
  const quizIds = LANDMARK_MAP[id].quiz.map((q) => q.id)
  if (quizIds.length) parts.push([quizIds.filter((q) => s.quiz[q]).length / quizIds.length, 15])
  if (!infoT) parts.push([s.memories.some((m) => m.landmarkId === id && !m.sample) ? 1 : 0, 15])
  const w = parts.reduce((a, [, x]) => a + x, 0)
  return Math.round(40 + (60 * parts.reduce((a, [v, x]) => a + v * x, 0)) / (w || 1))
}

/** "How much of my personal city is built": mean of per-landmark completion. */
export function cityCompletion(s: ProgressSnapshot): number {
  return Math.round(LANDMARK_IDS.reduce((a, id) => a + landmarkProgress(s, id), 0) / LANDMARK_IDS.length)
}

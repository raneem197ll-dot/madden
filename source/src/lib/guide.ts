import { LANDMARKS } from '../data/landmarks'
import { PLACES, SPOT_MAP } from '../data/places'
import { COLLECTIBLES, LANDMARK_SOURCES, type Source } from '../data/collectibles'
import { ALL_INTERIOR_CARDS } from '../data/content'
import thenNowJson from '../content/then-now.json'
import type { Bi, GuideEntry, Lang, LandmarkId, PlanBudget, PlanPrefs } from '../data/types'
import { DEFAULT_PLAN, ITINERARY, buildPlan } from './planner'

/**
 * The tourism guide. Answers come ONLY from the verified knowledge base below (built from
 * src/content). Recommendations are produced separately and always labelled as suggestions.
 * Optional "Claude mode" asks Claude to summarise — it may only cite knowledge-base ids, and
 * the UI always shows the cited verified cards verbatim next to its summary.
 */
/** `landmark` is the id of the 3D landmark or map-only place the fact belongs to. */
export interface KBEntry { id: string; landmark: string; title: Bi; text: Bi; sources: Source[] }

function buildKB(): KBEntry[] {
  const out: KBEntry[] = []
  for (const l of LANDMARKS) {
    const src = LANDMARK_SOURCES[l.id]
    l.history.ar.forEach((p, i) => out.push({ id: `${l.id}.h${i}`, landmark: l.id, title: l.name, text: { ar: p, en: l.history.en[i] }, sources: src }))
    l.facts.forEach((f, i) => out.push({ id: `${l.id}.f${i}`, landmark: l.id, title: f.label, text: { ar: `${f.label.ar}: ${f.value.ar}`, en: `${f.label.en}: ${f.value.en}` }, sources: src }))
  }
  for (const c of ALL_INTERIOR_CARDS) {
    if (c.kind !== 'verified') continue
    out.push({ id: `${c.landmark}.i.${c.id}`, landmark: c.landmark, title: c.title, text: c.body, sources: LANDMARK_SOURCES[c.landmark] })
  }
  for (const p of PLACES) {
    out.push({ id: `${p.id}.s`, landmark: p.id, title: p.name, text: p.summary, sources: p.sources })
    p.facts.forEach((f, i) => out.push({ id: `${p.id}.f${i}`, landmark: p.id, title: f.label, text: { ar: `${f.label.ar}: ${f.value.ar}`, en: `${f.label.en}: ${f.value.en}` }, sources: p.sources }))
  }
  for (const c of COLLECTIBLES) out.push({ id: `${c.landmark}.c.${c.id}`, landmark: c.landmark, title: c.name, text: c.fact, sources: c.sources })
  const tn = thenNowJson as unknown as Record<LandmarkId, { eras: { when: Bi; title: Bi; text: Bi; sources: Source[] }[] }>
  for (const [lid, t] of Object.entries(tn)) {
    t.eras.forEach((e, i) => out.push({ id: `${lid}.e${i}`, landmark: lid as LandmarkId, title: { ar: `${e.when.ar} — ${e.title.ar}`, en: `${e.when.en} — ${e.title.en}` }, text: e.text, sources: e.sources }))
  }
  return out
}

export const KB = buildKB()
export const KB_MAP = Object.fromEntries(KB.map((e) => [e.id, e])) as Record<string, KBEntry>

/* ---------------- text normalisation (Arabic + English) ---------------- */

const AR_STOP = new Set('في من على الى إلى عن ما ماذا متى كيف لماذا لما هل هو هي هم التي الذي الذين و او أو ثم مع كان كانت يكون تم هذا هذه ذلك تلك عند كل أي اي اين أين انا أنا لي لك قل اخبرني أخبرني عرفني حدثني كم شي شيء ليش وش ايش إيش متي'.split(' ').map(n => norm(n)))
const EN_STOP = new Set('the a an of in on at to is was were are what when why how who whom which did does do and or for with about tell me please can you i my it its this that there from by as be been into much many'.split(' '))

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // diacritics, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function stem(t: string) {
  if (/[a-z]/.test(t)) {
    t = t.replace(/'s$/, '')
    if (t.length > 4) t = t.replace(/ies$/, 'y').replace(/(ing|ed)$/, '').replace(/(es|s)$/, '')
    return t
  }
  for (const p of ['وال', 'بال', 'كال', 'فال', 'لل', 'ال']) if (t.startsWith(p) && t.length - p.length >= 3) { t = t.slice(p.length); break }
  if (t.startsWith('و') && t.length >= 5) t = t.slice(1)
  for (const s of ['ات', 'ين', 'ون', 'ها', 'ه']) if (t.endsWith(s) && t.length - s.length >= 3) { t = t.slice(0, -s.length); break }
  if (t.length >= 5 && t.endsWith('ت')) t = t.slice(0, -1)
  return t
}

/** A few question words that appear differently in the content. */
const SYNONYMS: Record<string, string[]> = {
  صمم: ['تصميم', 'معماري'], design: ['architect'], بني: ['بناء', 'شيد', 'اسس', 'تاسيس'], built: ['build', 'found', 'establish', 'rebuilt'],
  open: ['inaugurat', 'opening'], افتتح: ['افتتاح', 'افتت'], سمي: ['اسم', 'تسميه'], call: ['name', 'known'], طول: ['كيلومتر', 'كم'],
  long: ['km', 'length'], عدد: ['خمسين', 'خمسون'], archer: ['fifty'], رماه: ['رماه', 'خمسين'],
}

export function tokens(s: string): string[] {
  return norm(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !AR_STOP.has(t) && !EN_STOP.has(t))
    .map(stem)
}

/* ---------------- landmark & intent detection ---------------- */

/** Words that point a question at a landmark or place — kept in src/content (keywords / nameWords). */
const LANDMARK_WORDS: Record<string, string[]> = Object.fromEntries([
  ...LANDMARKS.map((l) => [l.id, l.keywords]),
  ...PLACES.map((p) => [p.id, p.keywords]),
])

/** Words that only name the landmark (they don't say what the question is about). */
const NAME_WORDS: Record<string, string[]> = Object.fromEntries([
  ...LANDMARKS.map((l) => [l.id, l.nameWords]),
  ...PLACES.map((p) => [p.id, [p.name.ar, p.name.en]]),
])

export function detectLandmarks(q: string): string[] {
  const n = norm(q)
  const hits = Object.keys(LANDMARK_WORDS).map((id) => {
    const best = Math.max(0, ...LANDMARK_WORDS[id].map((w) => norm(w)).filter((w) => w.length > 1 && n.includes(w)).map((w) => w.length))
    return { id, best }
  }).filter((h) => h.best > 0)
  if (!hits.length) return []
  // a long specific match ("مسجد الجمعة") beats a short generic one ("مسجد")
  const top = Math.max(...hits.map((h) => h.best))
  return hits.filter((h) => h.best >= Math.min(top, 5)).map((h) => h.id)
}

const RECO = /(اقترح|انصح|انصحني|ازور|اروح|نزور|نروح|ابدا ب|برنامج|خطه|جدول|عندي (وقت|ساع|يوم|نص)|ساعتين|نص يوم|نصف يوم|يوم كامل|suggest|recommend|\bplan\b|itinerary|should i (visit|go|see)|where (should|to) (i )?go|what (should i|to) (visit|see|do)|i have (\d|a |an |half|one|two|three|a few)|half.?day|full.?day|visit first)/i
const PRACTICAL = /(مفتوح|يفتح|يقفل|دوام|اوقات العمل|اوقات الزياره|سعر|رسوم|موقف|اوقات الصلاه|اذان|when does|what time does|is (it|the [a-z ]+) (open|closed)|open (today|now|tomorrow)|opening hours|closing time|price|entry fee|ticket price|cost to|parking|prayer times?)/i
const RELIGIOUS_RULING = /(حكم|يجوز|حلال|حرام|فتوى|سنه ان|بدعه|بدعة|is it allowed|halal|haram|permissible|fatwa|ruling)/i

export function parseBudget(q: string): PlanBudget | null {
  const n = norm(q)
  if (/(يوم كامل|طول اليوم|full.?day|whole day|all day|8 ?h)/i.test(n)) return 'full'
  if (/(نص يوم|نصف يوم|half.?day|4 ?h|5 ?h|اربع ساع|خمس ساع|٤ ساع|٥ ساع)/i.test(n)) return 'half'
  if (/(ساعه|ساعتين|ساعتان|1 ?h|2 ?h|hour|couple of hours|short|سريع|قصير)/i.test(n)) return 'short'
  return null
}

const INTEREST_WORDS: Record<string, RegExp> = {
  family: /(عائل|اطفال|أطفال|اولاد|family|kids|children)/i,
  history: /(تاريخ|history|historic)/i,
  railway: /(قطار|سكه|سكة|متحف|train|railway|museum)/i,
  architecture: /(عماره|عمارة|تصميم|architecture|design)/i,
  faith: /(مسجد|مساجد|صلاه|صلاة|سيره|سيرة|mosque|faith|seerah|prayer)/i,
  outdoors: /(طبيعه|طبيعة|جبل|اطلاله|إطلالة|مشي|outdoor|mountain|view|hike|walk)/i,
}
export const parseInterests = (q: string) => Object.entries(INTEREST_WORDS).filter(([, r]) => r.test(norm(q))).map(([k]) => k)

/* ---------------- retrieval ---------------- */

const docTokens = KB.map((e) => ({
  e,
  // history paragraphs / place summaries are titled with the name, which the landmark boost already covers
  title: /\.(h\d+|s)$/.test(e.id) ? [] : [...tokens(e.title.ar), ...tokens(e.title.en)],
  body: [...tokens(e.text.ar), ...tokens(e.text.en)],
}))
const df = new Map<string, number>()
for (const d of docTokens) for (const t of new Set([...d.title, ...d.body])) df.set(t, (df.get(t) ?? 0) + 1)
const idf = (t: string) => Math.log(1 + KB.length / (1 + (df.get(t) ?? 0)))

const common = (a: string, b: string) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i }
const same = (x: string, t: string) => x === t || (Math.min(x.length, t.length) >= 4 && common(x, t) >= Math.max(4, Math.min(x.length, t.length) - 1))

const WHEN = /(متي|اي سنه|في اي عام|تاريخ|when|what year|which year|date)/i
const COUNT = /(كم|عدد|طول|how many|how long|how far|how much|length|number of)/i
const HAS_YEAR = /(1[0-9]{3}|20[0-9]{2}|[١٢][٠-٩]{3}|\d+ ?(هـ|ah|ce|م)\b)/i
const HAS_NUM = /([0-9٠-٩]|خمسين|خمسون|fifty|forty|اربعين|أربعين|sixteen|seventeen)/i

export function retrieve(q: string, limit = 3): { entry: KBEntry; score: number }[] {
  const lms = detectLandmarks(q)
  // the landmark's own name is handled by the landmark boost; score on the rest of the question
  const nameTok = new Set(lms.flatMap((id) => [...tokens(SPOT_MAP[id].name.ar), ...tokens(SPOT_MAP[id].name.en), ...(NAME_WORDS[id] ?? []).flatMap(tokens)]))
  const all = [...new Set(tokens(q))]
  const rest = all.filter((t) => !nameTok.has(t))
  const base = rest.length ? rest : all
  const qt = [...new Set([...all, ...base.flatMap((t) => SYNONYMS[t] ?? [])])]
  const nq = norm(q)
  const wantsWhen = WHEN.test(nq), wantsCount = COUNT.test(nq)
  if (!qt.length) return []
  const scored = docTokens.map((d) => {
    let s = 0
    for (const t of qt) {
      const inTitle = d.title.filter((x) => same(x, t)).length
      const inBody = d.body.filter((x) => same(x, t)).length
      // the landmark's own name counts a little; the rest of the question counts fully
      const w = nameTok.has(t) && rest.length ? 0.3 : base.includes(t) ? 1 : 0.6
      if (inTitle || inBody) s += idf(t) * (Math.min(inTitle, 2) * 2 + Math.min(inBody, 3)) * w
    }
    const text = `${d.e.title.ar} ${d.e.text.ar} ${d.e.title.en} ${d.e.text.en}`
    if (wantsWhen && HAS_YEAR.test(text)) s *= 1.5
    if (wantsCount && HAS_NUM.test(text)) s *= 1.4
    if (lms.length) s *= lms.includes(d.e.landmark) ? 1.6 : 0.35
    return { entry: d.e, score: s }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
  if (!scored.length) return []
  const top = scored[0].score
  return scored.filter((x) => x.score >= top * 0.5).slice(0, limit)
}

/* ---------------- answering ---------------- */

const MIN_SCORE = 2.2

export function recommend(q: string, lang: Lang, base?: PlanPrefs | null): { rec: string; budget: PlanBudget; interests: string[] } {
  const budget = parseBudget(q) ?? base?.budget ?? 'half'
  const interests = parseInterests(q)
  const prefs: PlanPrefs = { ...(base ?? DEFAULT_PLAN), budget, interests: interests.length ? interests : base?.interests ?? [] }
  const plan = buildPlan(prefs)
  const names = plan.stops.map((s) => SPOT_MAP[s.id].name[lang]).join(lang === 'ar' ? ' ← ' : ' → ')
  const hrs = Math.round((plan.totalMin / 60) * 2) / 2
  const intr = prefs.interests.map((i) => ITINERARY.interests[i]?.[lang]).filter(Boolean).join(lang === 'ar' ? '، ' : ', ')
  const rec = lang === 'ar'
    ? `لـ${ITINERARY.budgets[budget].label.ar}${intr ? ` مع اهتمامك بـ${intr}` : ''}: ${names || '—'} (نحو ${hrs.toLocaleString('ar-SA')} ساعة تقديرًا، بالسيارة من المسجد النبوي). عدّل الوقت والاهتمامات في «خطّط زيارتك».`
    : `For a ${ITINERARY.budgets[budget].label.en.toLowerCase()}${intr ? ` focused on ${intr}` : ''}: ${names || '—'} (about ${hrs} h, estimated, by car from the Prophet's Mosque). Adjust time and interests in “Plan your visit”.`
  return { rec, budget, interests: prefs.interests }
}

export function answerLocally(q: string, lang: Lang, plan?: PlanPrefs | null): Omit<GuideEntry, 'id' | 'at'> {
  const base = { q, lang, source: 'local' as const }
  if (RELIGIOUS_RULING.test(norm(q))) {
    return { ...base, factIds: [], unknown: true, rec: lang === 'ar' ? 'أسئلة الأحكام الشرعية خارج نطاق هذا المرشد — اسأل أهل العلم الموثوقين. يمكنني الحديث عن تاريخ المعالم.' : "Questions of religious rulings are outside this guide's scope — please ask a qualified scholar. I can tell you about the landmarks' history." }
  }
  if (PRACTICAL.test(norm(q))) {
    const hejaz = detectLandmarks(q).includes('hejaz') || /museum|متحف/i.test(q)
    const st = ITINERARY.places.hejaz.status
    return {
      ...base, factIds: [], unknown: true,
      rec: (lang === 'ar' ? 'لا أستطيع تأكيد أوقات العمل أو الأسعار أو أوقات الصلاة الحالية من داخل اللعبة — تحقّق منها من المصادر الرسمية قبل الزيارة.' : "I can't confirm current opening hours, prices or prayer times from inside the game — check official sources before you go.")
        + (hejaz && st ? ` ${st.text[lang]}` : ''),
    }
  }
  const hits = retrieve(q)
  const wantsReco = RECO.test(norm(q))
  if (wantsReco && (!hits.length || hits[0].score < MIN_SCORE * 1.5 || parseBudget(q))) {
    const r = recommend(q, lang, plan)
    return { ...base, factIds: [], rec: r.rec, planLink: true }
  }
  if (!hits.length || hits[0].score < MIN_SCORE) {
    // a general question about a named landmark ("why is Quba special?") → its overview
    const lms = detectLandmarks(q)
    if (lms.length) return { ...base, factIds: lms.flatMap((id) => [`${id}.h0`, `${id}.h1`, `${id}.s`, `${id}.f0`]).filter((id) => KB_MAP[id]).slice(0, 3) }
    return { ...base, factIds: [], unknown: true }
  }
  const out: Omit<GuideEntry, 'id' | 'at'> = { ...base, factIds: hits.map((h) => h.entry.id) }
  if (wantsReco) { const r = recommend(q, lang, plan); out.rec = r.rec; out.planLink = true }
  return out
}

/* ---------------- optional Claude mode (host `sample` capability) ---------------- */

type Sample = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & { json<T>(input: string, opts?: Record<string, unknown>): Promise<T> }
let samplePromise: Promise<Sample | null> | null = null

export function getSample(): Promise<Sample | null> {
  if (samplePromise) return samplePromise
  samplePromise = (async () => {
    const t0 = Date.now()
    while (!window.claude && Date.now() - t0 < 3000) await new Promise((r) => setTimeout(r, 200))
    if (!window.claude?.use) return null
    const s = (await Promise.race([window.claude.use('sample'), new Promise((r) => setTimeout(() => r(null), 10000))])) as Sample | null
    return s ?? null
  })()
  return samplePromise
}

export class GuideError extends Error { constructor(public code: string) { super(code) } }

export async function answerWithClaude(q: string, lang: Lang, plan?: PlanPrefs | null, signal?: AbortSignal): Promise<Omit<GuideEntry, 'id' | 'at'>> {
  const sample = await getSample()
  if (!sample) throw new GuideError('unavailable')
  const lms = detectLandmarks(q)
  const hits = retrieve(q, 12).map((h) => h.entry)
  const pool = [...hits]
  // make sure the model sees the core history of any landmark named in the question
  for (const id of lms) for (const e of KB) if (e.landmark === id && /\.(h\d|s)$/.test(e.id) && !pool.includes(e)) pool.push(e)
  const facts = pool.slice(0, 16)
  const factLines = facts.map((e) => `[${e.id}] (${SPOT_MAP[e.landmark].name.en}) ${e.title[lang]}: ${e.text[lang]}`).join('\n')
  const tips = [...LANDMARKS.map((l) => ({ id: l.id, name: l.name, tip: l.visitTip })), ...PLACES.map((p) => ({ id: p.id, name: p.name, tip: p.tip }))]
    .map((x) => `- ${x.name[lang]}: ${ITINERARY.places[x.id]?.minutes ?? 30} min suggested; best time: ${ITINERARY.places[x.id]?.bestTime[lang] ?? '-'}; tip: ${x.tip[lang]}`).join('\n')
  const prompt = [
    'You are a careful tourism guide for Al-Madinah inside the game "My City, My Story".',
    'Answer ONLY from the FACTS below. Each fact has an id in brackets. Do not add any date, name, number, quote or event that is not in the facts. If the facts do not answer the question, set "unknown" to true and say briefly that the guide has no verified source for it.',
    'Be respectful about religious sites. Do not give religious rulings (fatwas); suggest asking a qualified scholar instead.',
    'Recommendations (what to visit, when, for how long) may use the TIPS and are opinions, not facts — put them ONLY in "recommendation". Do not claim current opening hours, prices or prayer times.',
    `Write in ${lang === 'ar' ? 'Arabic (Modern Standard Arabic)' : 'English'}.`,
    'Reply with ONLY one JSON object: {"answer": string (at most 70 words; it must only restate the facts you cite), "factIds": string[] (1 to 4 ids you used), "recommendation": string or null, "unknown": boolean}',
    '', 'FACTS:', factLines, '', 'TIPS (suggestions, not facts):', tips, '', `Question: ${q.slice(0, 500)}`,
  ].join('\n')
  let r: { answer?: unknown; factIds?: unknown; recommendation?: unknown; unknown?: unknown }
  try {
    r = await sample.json(prompt, { modelTier: 'quick', cache: false, ...(signal ? { signal } : {}) })
  } catch (e) {
    throw new GuideError((e as { code?: string })?.code ?? 'upstream_error')
  }
  const allowed = new Set(facts.map((f) => f.id))
  const factIds = (Array.isArray(r.factIds) ? r.factIds : []).map(String).filter((id) => allowed.has(id)).slice(0, 4)
  const unknown = r.unknown === true
  const answer = typeof r.answer === 'string' ? r.answer.trim().slice(0, 800) : ''
  // an answer that cites nothing we can show is not grounded: fall back to local retrieval
  if (!unknown && factIds.length === 0) {
    const local = answerLocally(q, lang, plan)
    return { ...local, source: 'local' }
  }
  return {
    q, lang, source: 'claude', factIds, unknown,
    answer: unknown ? (answer || undefined) : answer,
    rec: typeof r.recommendation === 'string' && r.recommendation.trim() ? r.recommendation.trim().slice(0, 600) : undefined,
  }
}

export const SUGGESTED: Record<Lang, string[]> = {
  ar: ['كم عدد مظلات المسجد النبوي؟', 'لماذا سُمّي مسجد القبلتين بهذا الاسم؟', 'ما قصة مسجد الجمعة؟', 'أين أشتري التمور؟', 'عندي نصف يوم ومعي أطفال، ماذا أزور؟'],
  en: ['How many umbrellas does the Prophet’s Mosque have?', 'Why is it called the Mosque of the Two Qiblas?', 'What is the story of Al-Jumu‘ah Mosque?', 'Where can I buy dates?', 'I have half a day with kids — what should I visit?'],
}

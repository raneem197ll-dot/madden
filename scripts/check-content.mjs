#!/usr/bin/env node
/**
 * Validates src/content/*.json — run with `npm run content:check`.
 * Checks: bilingual text present (Arabic script in `ar`, Latin in `en`),
 * historical statements carry https sources, ids are unique, and every story
 * clue / challenge goal points at something that exists in the game.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')
const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))
const errors = []
const warn = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)

const AR = /[؀-ۿ]/
const EN = /[A-Za-z]/
function bi(v, where, { allowEmpty = false } = {}) {
  if (!v || typeof v !== 'object') return err(where, 'missing bilingual text {ar,en}')
  for (const k of ['ar', 'en']) {
    const s = v[k]
    if (typeof s !== 'string' || (!allowEmpty && !s.trim())) { err(where, `missing "${k}"`); continue }
    // numbers/dates alone are fine in both; flag text left in the wrong language
    if (k === 'ar' && EN.test(s) && !AR.test(s)) err(where, `"ar" looks untranslated: ${s.slice(0, 40)}`)
    if (k === 'en' && AR.test(s)) err(where, `"en" contains Arabic script: ${s.slice(0, 40)}`)
  }
}
function sources(list, where, { required = true } = {}) {
  if (!Array.isArray(list) || !list.length) { if (required) err(where, 'needs at least one source'); return }
  list.forEach((s, i) => {
    if (!s?.title?.trim()) err(`${where}.sources[${i}]`, 'missing title')
    if (!/^https:\/\//.test(s?.url ?? '')) err(`${where}.sources[${i}]`, `url must be https: ${s?.url}`)
  })
}

/* landmarks */
const landmarks = load('landmarks.json')
const IDS = landmarks.map((l) => l.id)
const CATEGORIES = ['mosque', 'history', 'museum', 'market', 'nature', 'transport']
const lmIds = new Set()
for (const l of landmarks) {
  const w = `landmarks/${l.id}`
  if (!IDS.includes(l.id)) err(w, 'unknown landmark id')
  if (lmIds.has(l.id)) err(w, 'duplicate id'); lmIds.add(l.id)
  if (!CATEGORIES.includes(l.category)) err(w, `category must be one of ${CATEGORIES.join('|')}`)
  if (!Array.isArray(l.keywords) || !l.keywords.length) err(w, 'needs guide keywords')
  if (!Array.isArray(l.nameWords) || !l.nameWords.length) err(w, 'needs nameWords')
  if ('cityPos' in l) err(w, 'cityPos is computed from coords — remove it')
  ;['name', 'tagline', 'kind', 'modelNote', 'visitTip'].forEach((k) => bi(l[k], `${w}.${k}`))
  if (!(Math.abs(l.coords?.lat) <= 90 && Math.abs(l.coords?.lng) <= 180)) err(w, 'bad coords')
  if (!Array.isArray(l.history?.ar) || !l.history.ar.length || l.history.ar.length !== l.history.en?.length) err(w, 'history ar/en must be non-empty and the same length')
  l.history?.ar?.forEach((p, i) => bi({ ar: p, en: l.history.en[i] }, `${w}.history[${i}]`))
  l.facts?.forEach((f, i) => { bi(f.label, `${w}.facts[${i}].label`); bi(f.value, `${w}.facts[${i}].value`) })
  if (!['full', 'simplified', 'courtyard', 'none'].includes(l.interior)) err(w, 'interior must be full|simplified|courtyard|none')
  l.quiz?.forEach((q, i) => {
    const qw = `${w}.quiz[${i}]`
    bi(q.q, `${qw}.q`); bi(q.explain, `${qw}.explain`)
    q.options?.forEach((o, j) => bi(o, `${qw}.options[${j}]`))
    if (!(q.answer >= 0 && q.answer < (q.options?.length ?? 0))) err(qw, 'answer index out of range')
  })
}
const quizIds = new Set()
landmarks.forEach((l) => l.quiz?.forEach((q) => { if (quizIds.has(q.id)) err(`landmarks/${l.id}`, `duplicate quiz id ${q.id}`); quizIds.add(q.id) }))

/* map-only places */
const places = load('places.json')
const plIds = new Set()
for (const p of places) {
  const w = `places/${p.id}`
  if (plIds.has(p.id) || lmIds.has(p.id)) err(w, 'duplicate id'); plIds.add(p.id)
  if (!CATEGORIES.includes(p.category)) err(w, 'bad category')
  bi(p.name, `${w}.name`); bi(p.summary, `${w}.summary`); bi(p.tip, `${w}.tip`)
  p.facts?.forEach((f, i) => { bi(f.label, `${w}.facts[${i}].label`); bi(f.value, `${w}.facts[${i}].value`) })
  if (!(Math.abs(p.coords?.lat - 24.47) < 0.3 && Math.abs(p.coords?.lng - 39.6) < 0.3)) err(w, 'coords look outside Madinah')
  if (p.approx) bi(p.approxNote, `${w}.approxNote`)
  if (p.near && !lmIds.has(p.near)) err(w, `near "${p.near}" is not a landmark`)
  if (!Array.isArray(p.keywords) || !p.keywords.length) err(w, 'needs guide keywords')
  sources(p.sources, w)
}

/* sources per landmark */
const src = load('sources.json')
IDS.forEach((id) => sources(src[id], `sources/${id}`))

/* interiors */
const interiors = load('interiors.json')
const targets = new Set()
for (const [lid, cards] of Object.entries(interiors)) {
  for (const [key, c] of Object.entries(cards)) {
    const w = `interiors/${lid}/${key}`
    if (c.id !== key) err(w, `id "${c.id}" must equal its key`)
    bi(c.title, `${w}.title`); bi(c.body, `${w}.body`)
    if (!['verified', 'game'].includes(c.kind)) err(w, 'kind must be verified|game')
    targets.add(`info:${lid}:${key}`)
  }
}

/* collectibles */
const collectibles = load('collectibles.json')
const seen = new Set()
for (const c of collectibles) {
  const w = `collectibles/${c.landmark}:${c.id}`
  if (seen.has(w)) err(w, 'duplicate'); seen.add(w)
  if (!IDS.includes(c.landmark)) err(w, 'unknown landmark')
  ;['name', 'object', 'fact'].forEach((k) => bi(c[k], `${w}.${k}`))
  sources(c.sources, w)
  targets.add(`hidden:${c.landmark}:${c.id}`)
}

/* narration (optional per landmark — the audio guide falls back to the verified history) */
const narration = load('narration.json')
Object.keys(narration).forEach((id) => { if (!IDS.includes(id)) err(`narration/${id}`, 'unknown landmark'); bi(narration[id], `narration/${id}`) })

/* then & now */
const thenNow = load('then-now.json')
for (const [lid, t] of Object.entries(thenNow)) {
  const w = `then-now/${lid}`
  if (!IDS.includes(lid)) err(w, 'unknown landmark')
  bi(t.then?.label, `${w}.then.label`); bi(t.then?.desc, `${w}.then.desc`)
  bi(t.now?.label, `${w}.now.label`); bi(t.now?.desc, `${w}.now.desc`)
  if (!['illustrative', 'none'].includes(t.then?.reconstruction)) err(w, 'then.reconstruction must be illustrative|none')
  if (t.then?.photo) {
    if (!t.then.photo.credit || !t.then.photo.license) err(w, 'a historical photo needs credit and license')
  }
  if (!t.eras?.length) err(w, 'needs at least one era')
  t.eras?.forEach((e, i) => { bi(e.when, `${w}.eras[${i}].when`); bi(e.title, `${w}.eras[${i}].title`); bi(e.text, `${w}.eras[${i}].text`); sources(e.sources, `${w}.eras[${i}]`) })
}

/* stories */
const stories = load('stories.json')
const storyIds = new Set()
for (const s of stories) {
  const w = `stories/${s.id}`
  if (storyIds.has(s.id)) err(w, 'duplicate id'); storyIds.add(s.id)
  if (!IDS.includes(s.landmark)) err(w, 'unknown landmark')
  bi(s.title, `${w}.title`); bi(s.intro, `${w}.intro`)
  if (!s.steps?.length) err(w, 'no steps')
  s.steps?.forEach((st, i) => {
    const sw = `${w}.steps[${i}]`
    if (st.type === 'read' || st.type === 'reflect') bi(st.text, `${sw}.text`)
    else if (st.type === 'find') {
      bi(st.clue, `${sw}.clue`)
      if (!targets.has(st.target)) err(sw, `target "${st.target}" does not exist in interiors/collectibles`)
      else if (st.target.split(':')[1] !== s.landmark) err(sw, 'target is in another landmark')
    } else if (st.type === 'question') {
      bi(st.q, `${sw}.q`); bi(st.explain, `${sw}.explain`)
      st.options?.forEach((o, j) => bi(o, `${sw}.options[${j}]`))
      if (!(st.answer >= 0 && st.answer < (st.options?.length ?? 0))) err(sw, 'answer index out of range')
      if (st.sources) sources(st.sources, sw)
    } else err(sw, `unknown step type "${st.type}"`)
  })
}

/* challenges */
const challenges = load('challenges.json')
const chIds = new Set()
for (const c of challenges) {
  const w = `challenges/${c.id}`
  if (chIds.has(c.id)) err(w, 'duplicate id'); chIds.add(c.id)
  bi(c.title, `${w}.title`); bi(c.desc, `${w}.desc`)
  if (!['always', 'months', 'hijri'].includes(c.season?.type)) err(w, 'season.type must be always|months|hijri')
  if (c.season?.type !== 'always') bi(c.season?.label, `${w}.season.label`)
  if (!(c.points > 0)) err(w, 'points must be > 0')
  const keys = new Set()
  c.goals?.forEach((g, i) => {
    const gw = `${w}.goals[${i}]`
    if (g.k === 'discover') { if (!targets.has(g.key)) err(gw, `"${g.key}" does not exist`); if (keys.has(g.key)) err(gw, 'duplicate goal'); keys.add(g.key) }
    else if (g.k === 'unlock') { if (!IDS.includes(g.id)) err(gw, 'unknown landmark') }
    else if (g.k === 'story') { if (!storyIds.has(g.id)) err(gw, `unknown story "${g.id}"`) }
    else err(gw, `unknown goal kind "${g.k}"`)
  })
}

/* itinerary */
const it = load('itinerary.json')
const PLAN_IDS = [...IDS, ...places.filter((p) => p.category !== 'transport' && !p.noPlan).map((p) => p.id)]
Object.keys(it.places ?? {}).forEach((id) => { if (!PLAN_IDS.includes(id)) err(`itinerary/places/${id}`, 'unknown place') })
PLAN_IDS.forEach((id) => {
  const p = it.places?.[id]
  const w = `itinerary/places/${id}`
  if (!p) return err(w, 'missing')
  if (!(p.minutes > 0)) err(w, 'minutes must be > 0')
  bi(p.bestTime, `${w}.bestTime`); bi(p.access, `${w}.access`)
  p.tags?.forEach((t) => { if (!it.interests?.[t]) err(w, `unknown interest tag "${t}"`) })
  if (p.status) { bi(p.status.text, `${w}.status.text`); sources([p.status.source], `${w}.status`) }
})
it.starts?.forEach((s, i) => bi(s.name, `itinerary/starts[${i}].name`))
it.general?.forEach((g, i) => bi(g, `itinerary/general[${i}]`))

const total = landmarks.length + Object.values(interiors).reduce((a, c) => a + Object.keys(c).length, 0) + collectibles.length + stories.length + challenges.length
if (errors.length) {
  console.error(`✖ content check failed — ${errors.length} problem(s):`)
  errors.forEach((e) => console.error('  - ' + e))
  process.exit(1)
}
warn.forEach((w) => console.warn('  ! ' + w))
console.log(`✔ content OK — ${landmarks.length} landmarks, ${places.length} map places, ${targets.size} interior items, ${collectibles.length} collectibles, ${Object.keys(thenNow).length} then&now, ${stories.length} stories, ${challenges.length} challenges (${total} entries)`)

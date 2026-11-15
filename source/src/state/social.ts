import { useGame } from './gameStore'
import { LANDMARK_IDS } from '../data/landmarks'
import { COLLECTIBLES } from '../data/collectibles'
import { DECORATIONS, allHidden, cityCompletion, computePoints } from '../data/progression'
import type { SharedCity } from '../data/types'
import { photoURL } from './photoStore'
import { renderFor } from '../data/renders'

/**
 * Social layer behind one small interface so the backend can be swapped:
 *  - SharedStoreAdapter: the hosting page's shared document store (people the
 *    page is shared with can publish/visit cities). Each viewer writes only
 *    their own `cities/<id>` document.
 *  - LocalAdapter: offline preview with clearly-labelled sample cities.
 * A Firebase/Supabase adapter can implement the same interface later.
 */
export interface SocialAdapter {
  kind: 'shared' | 'local'
  uid: string
  publish(city: SharedCity): Promise<void>
  unpublish(): Promise<void>
  list(): Promise<SharedCity[]>
  findByCode(code: string): Promise<SharedCity | null>
}

export const ARTIFACT_URL = 'https://claude.ai/artifact/For5d6sGRFNHako8miFtPV'

type DocSnap = { exists: boolean; id: string; data(): Record<string, unknown> | undefined }
type DocRef = { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
type Query = { get(): Promise<{ docs: DocSnap[] }>; limit(n: number): Query; where(f: string, op: string, v: unknown): Query }
type DB = { doc(path: string): DocRef; collection(path: string): Query }
type User = { id(): Promise<string | null> }

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])

class SharedStoreAdapter implements SocialAdapter {
  kind = 'shared' as const
  constructor(private db: DB, public uid: string) {}
  async publish(city: SharedCity) { await this.db.doc(`cities/${this.uid}`).set(JSON.parse(JSON.stringify(city))) }
  async unpublish() { await this.db.doc(`cities/${this.uid}`).delete() }
  async list() {
    const snap = await withTimeout(this.db.collection('cities').limit(100).get(), 10000)
    if (!snap) return []
    return snap.docs.filter((d) => d.exists).map((d) => ({ ...(d.data() as unknown as SharedCity), uid: d.id }))
  }
  async findByCode(code: string) {
    const snap = await withTimeout(this.db.collection('cities').where('code', '==', code).limit(1).get(), 10000)
    const d = snap?.docs?.[0]
    return d ? ({ ...(d.data() as unknown as SharedCity), uid: d.id }) : null
  }
}

/** Clearly-labelled sample cities so the visit feature can be tried offline. */
const SAMPLES: SharedCity[] = [
  {
    uid: 'sample-1', code: 'sample1', sample: true, updatedAt: Date.UTC(2026, 9, 20),
    unlocked: { quba: '2026-10-12', hejaz: '2026-10-14' }, decorations: ['palms', 'train'], completion: 38,
    stats: { points: 420, memories: 2, collectibles: 3, playMinutes: 41 }, collection: ['hidden:hejaz:watch', 'hidden:hejaz:ticket', 'hidden:quba:saturday'],
    memories: [{ landmarkId: 'quba', date: '2026-10-12', note: 'مثال: ذكرى تجريبية لعرض ميزة المشاركة.' }],
  },
  {
    uid: 'sample-2', code: 'sample2', sample: true, updatedAt: Date.UTC(2026, 10, 2),
    unlocked: { quba: true, hejaz: true, qiblatain: true, uhud: true }, decorations: ['palms', 'train', 'fountain', 'lanterns', 'market'], completion: 86,
    stats: { points: 1520, memories: 6, collectibles: 10, playMinutes: 133 },
    memories: [{ landmarkId: 'uhud', note: 'Sample: a demo memory to show how shared memories look.' }],
  },
]

class LocalAdapter implements SocialAdapter {
  kind = 'local' as const
  uid = 'me-local'
  private mine: SharedCity | null = null
  async publish(city: SharedCity) { this.mine = city }
  async unpublish() { this.mine = null }
  async list() { return [...(this.mine ? [{ ...this.mine, uid: this.uid }] : []), ...SAMPLES] }
  async findByCode(code: string) { return (await this.list()).find((c) => c.code === code) ?? null }
}

export let social: SocialAdapter = new LocalAdapter()

async function waitForHost(ms: number) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (window.claude && typeof window.claude.use === 'function') return window.claude
    await new Promise((r) => setTimeout(r, 250))
  }
  return null
}

/* ---------------- building the shared payload (privacy-filtered) ---------------- */
async function thumb(src: string): Promise<string | undefined> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
    const s = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.6)
  } catch {
    return undefined
  }
}

export async function buildSharedCity(): Promise<SharedCity> {
  const s = useGame.getState()
  const p = s.privacy
  const unlocked: SharedCity['unlocked'] = {}
  for (const id of LANDMARK_IDS) {
    const pr = s.progress[id]
    if (pr?.unlocked) unlocked[id] = p.showDates && pr.visitDate ? pr.visitDate.slice(0, 10) : true
  }
  const points = computePoints(s)
  const decorations = DECORATIONS.filter((d) => s.decorations[d.id] && d.isUnlocked(s, points)).map((d) => d.id)
  const found = COLLECTIBLES.map((c) => `hidden:${c.landmark}:${c.id}`).filter((k) => s.discoveries[k])
  const shared = s.memories.filter((m) => m.shared).slice(-8)
  const memories: SharedCity['memories'] = []
  for (const m of shared) {
    let photo: string | undefined
    if (p.sharePhotos) {
      const src = m.samplePhoto ? renderFor(m.samplePhoto) : m.photoKey ? await photoURL(m.photoKey) : undefined
      if (src) photo = await thumb(src)
    }
    memories.push({ landmarkId: m.landmarkId, date: p.showDates ? m.date : undefined, note: m.note.slice(0, 280), photo })
  }
  return {
    uid: social.uid,
    code: s.shareCode,
    name: p.showName && s.profileName.trim() ? s.profileName.trim() : undefined,
    updatedAt: Date.now(),
    unlocked,
    decorations,
    completion: cityCompletion(s),
    stats: p.showStats ? { points, memories: s.memories.filter((m) => !m.sample).length, collectibles: allHidden(s), playMinutes: Math.round(s.playSeconds / 60) } : undefined,
    collection: p.showCollection ? found : undefined,
    memories,
  }
}

let lastPayload = ''
export async function publishNow(): Promise<boolean> {
  const s = useGame.getState()
  if (!s.privacy.publish) return false
  try {
    const city = await buildSharedCity()
    const json = JSON.stringify({ ...city, updatedAt: 0 })
    if (json === lastPayload) return true
    await social.publish(city)
    lastPayload = json
    useGame.getState().setUi({ canPublish: true })
    return true
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === 'invalid_argument' || code === 'revoked' || code === 'not_granted') useGame.getState().setUi({ canPublish: false })
    return false
  }
}

export async function unpublishNow() {
  lastPayload = ''
  try { await social.unpublish() } catch { /* ignore */ }
}

export function shareLink(code: string) {
  const base = window.claude ? ARTIFACT_URL : `${location.origin}${location.pathname}`
  return `${base}#city-${code}`
}

export async function visitByHash() {
  const m = location.hash.match(/^#city-([a-z0-9]+)$/i)
  if (!m) return
  const city = await social.findByCode(m[1].toLowerCase())
  const s = useGame.getState()
  if (!city) { s.toast({ kind: 'info', icon: '🔗', title: s.lang === 'ar' ? 'لم نعثر على هذه المدينة' : 'City not found', body: s.lang === 'ar' ? 'ربما أوقف صاحبها المشاركة.' : 'Its owner may have stopped sharing.' }); return }
  if (city.uid === social.uid && !city.sample) return
  s.visit(city)
}

export async function startSocial() {
  const host = await waitForHost(4000)
  if (host) {
    try {
      const [db, user] = (await Promise.all([withTimeout(host.use('db'), 10000), withTimeout(host.use('user'), 10000)])) as [DB | null, User | null]
      const id = user ? await withTimeout(user.id(), 10000) : null
      if (db && id) social = new SharedStoreAdapter(db, id)
    } catch { /* stay local */ }
  }
  useGame.getState().setUi({ social: social.kind })
  // keep the shared copy fresh while publishing is on
  let timer: ReturnType<typeof setTimeout> | null = null
  let last = useGame.getState().updatedAt
  useGame.subscribe((s, prev) => {
    if (s.privacy.publish !== prev.privacy.publish) {
      if (s.privacy.publish) publishNow()
      else unpublishNow()
      return
    }
    if (!s.privacy.publish || s.updatedAt === last) return
    last = s.updatedAt
    if (timer) clearTimeout(timer)
    timer = setTimeout(publishNow, 3000)
  })
  if (useGame.getState().privacy.publish) publishNow()
  await visitByHash()
  window.addEventListener('hashchange', () => { visitByHash() })
}


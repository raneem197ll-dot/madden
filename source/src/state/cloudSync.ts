import { useGame, getPersisted, PERSIST_KEYS, type PersistedState } from './gameStore'

/**
 * OPT-IN private backup of progress to the viewer's own per-user space
 * (`data/users/<id>/progress`), when the page is hosted where a document store exists.
 *
 * Privacy rules (see CLAUDE.md):
 *  - nothing is uploaded until the player turns on "Private cloud backup" (privacy.cloudBackup);
 *  - memory notes are included only if they also turn on privacy.cloudNotes;
 *  - photos NEVER leave the device (only notes/dates, never photoKey / image data).
 * Turning backup off stops syncing; "Delete cloud copy" removes the stored document.
 */
type DocSnap = { exists: boolean; data(): Record<string, unknown> | undefined }
type DocRef = { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
type DB = { doc(path: string): DocRef }
type User = { id(): Promise<string | null> }

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])

async function waitForHost(ms: number) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (window.claude && typeof window.claude.use === 'function') return window.claude
    await new Promise((r) => setTimeout(r, 250))
  }
  return null
}

/** Never synced: device-only or transient keys. */
const NEVER_SYNC = new Set<keyof PersistedState>(['guideLog'])

export function serialiseForCloud(s: PersistedState) {
  const out: Record<string, unknown> = {}
  for (const k of PERSIST_KEYS) {
    if (NEVER_SYNC.has(k)) continue
    if (k === 'memories') continue
    out[k] = s[k]
  }
  if (s.privacy.cloudNotes) {
    // notes and dates only — never photos
    out.memories = s.memories.filter((m) => !m.sample).map(({ photoKey: _p, samplePhoto: _s, ...rest }) => rest)
  }
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown>
}

let ref: DocRef | null = null
let available: boolean | null = null

async function connect(): Promise<DocRef | null> {
  if (ref) return ref
  const host = await waitForHost(4000)
  if (!host) { available = false; return null }
  const [db, user] = (await Promise.all([withTimeout(host.use('db'), 10000), withTimeout(host.use('user'), 10000)])) as [DB | null, User | null]
  if (!db || !user) { available = false; return null }
  const id = await withTimeout(user.id(), 10000)
  if (!id) { available = false; return null }
  available = true
  ref = db.doc(`data/users/${id}/progress`)
  return ref
}

export async function cloudAvailable() {
  if (available !== null) return available
  await connect().catch(() => null)
  return !!available
}

/** Removes the private cloud copy (used when the player turns backup off and asks to delete it). */
export async function deleteCloudCopy(): Promise<boolean> {
  try {
    const r = await connect()
    if (!r) return false
    await r.delete()
    useGame.getState().setUi({ cloud: 'off' })
    return true
  } catch {
    return false
  }
}

let running = false
async function runSync() {
  if (running) return
  running = true
  const st = () => useGame.getState()
  try {
    const r = await connect()
    if (!r) { st().setUi({ cloud: 'off' }); running = false; return }
    st().setUi({ cloud: 'syncing' })
    const snap = (await withTimeout(r.get(), 10000)) as DocSnap | null
    if (snap === null) { st().setUi({ cloud: 'error' }); running = false; return }
    const local = getPersisted()
    if (snap.exists) {
      const remote = snap.data() as Partial<PersistedState> | undefined
      if (remote && (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
        // keep local privacy choices and local memories unless the remote copy carries notes
        const { privacy: _p, ...rest } = remote
        st().applyRemote(rest)
      }
    }
    let lastJSON = ''
    let writing = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let failed = false
    const flush = async () => {
      if (writing || failed || !st().privacy.cloudBackup) return
      const body = serialiseForCloud(getPersisted())
      const json = JSON.stringify(body)
      if (json === lastJSON) { st().setUi({ cloud: 'synced' }); return }
      writing = true
      try {
        await r.set(body)
        lastJSON = json
        st().setUi({ cloud: 'synced' })
      } catch (e) {
        const code = (e as { code?: string })?.code
        if (code === 'invalid_argument' || code === 'revoked' || code === 'not_granted') failed = true
        st().setUi({ cloud: failed ? 'error' : 'syncing' })
      } finally {
        writing = false
      }
    }
    await flush()
    let lastUpdated = st().updatedAt
    const unsub = useGame.subscribe((s) => {
      if (!s.privacy.cloudBackup) { unsub(); if (timer) clearTimeout(timer); running = false; st().setUi({ cloud: 'off' }); return }
      if (s.updatedAt === lastUpdated) return
      lastUpdated = s.updatedAt
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, 1800)
    })
  } catch {
    st().setUi({ cloud: 'error' })
    running = false
  }
}

/** Starts syncing only while the player has opted in; reacts when they toggle it. */
export function startCloudSync() {
  if (useGame.getState().privacy.cloudBackup) runSync()
  let was = useGame.getState().privacy.cloudBackup
  useGame.subscribe((s) => {
    const on = s.privacy.cloudBackup
    if (on && !was) runSync()
    was = on
  })
}

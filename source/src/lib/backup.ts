import { get as idbGet, set as idbSet } from 'idb-keyval'
import { useGame, getPersisted, PERSIST_KEYS, type PersistedState } from '../state/gameStore'
import { getPhotoBlob, putPhotoBlob } from '../state/photoStore'
import { blobToDataURL, dataURLToBlob, saveFile, type SaveResult } from './save'
import { LANDMARK_IDS } from '../data/landmarks'

/**
 * Export / import / restore points for player progress. Everything happens on this device:
 * backups are files the player saves themselves; restore points live in IndexedDB.
 */
export const BACKUP_APP = 'madinah-my-story'
export const BACKUP_SCHEMA = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  schema: number
  exportedAt: string
  state: Partial<PersistedState>
  /** photoKey → data URL, only when the player chose to include photos */
  photos?: Record<string, string>
}

export interface BackupSummary {
  exportedAt: string
  unlocked: number
  memories: number
  photos: number
  points?: number
  name?: string
}

export async function buildBackup(includePhotos: boolean): Promise<BackupFile> {
  const state = JSON.parse(JSON.stringify(getPersisted())) as PersistedState
  const file: BackupFile = { app: BACKUP_APP, schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), state }
  if (includePhotos) {
    const photos: Record<string, string> = {}
    for (const m of state.memories) {
      if (!m.photoKey) continue
      const b = await getPhotoBlob(m.photoKey)
      if (b) photos[m.photoKey] = await blobToDataURL(b)
    }
    file.photos = photos
  }
  return file
}

export async function exportBackup(includePhotos: boolean): Promise<SaveResult> {
  const b = await buildBackup(includePhotos)
  const date = b.exportedAt.slice(0, 10)
  return saveFile(`madinah-journey-backup-${date}.json`, new Blob([JSON.stringify(b)], { type: 'application/json' }))
}

/** Validates a parsed backup; throws a readable error code. */
export function validateBackup(raw: unknown): BackupFile {
  const b = raw as BackupFile
  if (!b || typeof b !== 'object' || b.app !== BACKUP_APP) throw new Error('not-a-backup')
  if (typeof b.schema !== 'number' || b.schema > BACKUP_SCHEMA) throw new Error('newer-version')
  const s = b.state
  if (!s || typeof s !== 'object') throw new Error('broken')
  if (s.progress && typeof s.progress !== 'object') throw new Error('broken')
  if (s.memories && !Array.isArray(s.memories)) throw new Error('broken')
  if (s.discoveries && typeof s.discoveries !== 'object') throw new Error('broken')
  for (const id of Object.keys(s.progress ?? {})) if (!LANDMARK_IDS.includes(id as never)) throw new Error('broken')
  if (b.photos) for (const v of Object.values(b.photos)) if (typeof v !== 'string' || !v.startsWith('data:image/')) throw new Error('broken')
  return b
}

export async function readBackupFile(f: File): Promise<BackupFile> {
  if (f.size > 60 * 1024 * 1024) throw new Error('too-large')
  let raw: unknown
  try { raw = JSON.parse(await f.text()) } catch { throw new Error('not-json') }
  return validateBackup(raw)
}

export function summarise(state: Partial<PersistedState>, exportedAt: string, photos = 0): BackupSummary {
  return {
    exportedAt,
    unlocked: Object.values(state.progress ?? {}).filter((p) => p?.unlocked).length,
    memories: (state.memories ?? []).filter((m) => !m.sample).length,
    photos,
    name: state.profileName || undefined,
  }
}

/** Replace current progress with a backup. A restore point of the current state is kept first. */
export async function applyBackup(b: BackupFile) {
  await createRestorePoint('before-import')
  if (b.photos) for (const [key, url] of Object.entries(b.photos)) await putPhotoBlob(key, await dataURLToBlob(url))
  const g = useGame.getState()
  // keep this device's privacy and sharing choices: a file never turns sharing on
  const { privacy: _p, shareCode: _c, ...rest } = b.state
  g.applyRemote({ ...rest, privacy: g.privacy, shareCode: g.shareCode } as Partial<PersistedState>)
  g.setPrefs({})
  g.runChecks()
}

/* ---------- restore points (IndexedDB, last 6) ---------- */

export type RestoreReason = 'auto' | 'unlock' | 'before-import' | 'before-reset' | 'manual'
export interface RestorePoint { id: string; at: string; reason: RestoreReason; state: Partial<PersistedState>; summary: BackupSummary }

const RP_KEY = 'madinah-restore-points'
const MAX_POINTS = 6
let memPoints: RestorePoint[] = []

export async function listRestorePoints(): Promise<RestorePoint[]> {
  try { return ((await idbGet(RP_KEY)) as RestorePoint[] | undefined) ?? [] } catch { return memPoints }
}

async function writePoints(list: RestorePoint[]) {
  memPoints = list
  try { await idbSet(RP_KEY, list) } catch { /* memory only */ }
}

export async function createRestorePoint(reason: RestoreReason) {
  const st = JSON.parse(JSON.stringify(getPersisted())) as PersistedState
  const at = new Date().toISOString()
  const point: RestorePoint = { id: `rp-${Date.now()}`, at, reason, state: st, summary: summarise(st, at) }
  const list = [point, ...(await listRestorePoints())].slice(0, MAX_POINTS)
  await writePoints(list)
  return point
}

export async function restorePoint(id: string) {
  const list = await listRestorePoints()
  const p = list.find((x) => x.id === id)
  if (!p) return false
  await createRestorePoint('manual')
  const g = useGame.getState()
  const { privacy: _p, shareCode: _c, ...rest } = p.state
  g.applyRemote({ ...rest, privacy: g.privacy, shareCode: g.shareCode } as Partial<PersistedState>)
  g.setPrefs({})
  return true
}

/** Automatic restore points: on each new unlock, and at most once a day when progress changed. */
export function startRestorePoints() {
  let lastUnlocked = Object.values(useGame.getState().progress).filter((p) => p.unlocked).length
  let lastDaily = 0
  listRestorePoints().then((l) => { lastDaily = l[0] ? Date.parse(l[0].at) : 0 })
  useGame.subscribe((s, prev) => {
    if (s.updatedAt === prev.updatedAt || !s.onboarded) return
    const unlocked = Object.values(s.progress).filter((p) => p.unlocked).length
    if (unlocked > lastUnlocked) { lastUnlocked = unlocked; createRestorePoint('unlock'); lastDaily = Date.now(); return }
    lastUnlocked = unlocked
    if (Date.now() - lastDaily > 24 * 3600 * 1000) { lastDaily = Date.now(); createRestorePoint('auto') }
  })
}

export { PERSIST_KEYS }

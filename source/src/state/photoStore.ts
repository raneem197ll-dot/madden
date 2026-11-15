import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { useEffect, useState } from 'react'
import { uid } from '../lib/format'
import { renderFor } from '../data/renders'

/**
 * Personal photos live only in this browser (IndexedDB). Falls back to an
 * in-memory map when IndexedDB is unavailable (e.g. some sandboxed frames).
 */
const mem = new Map<string, Blob>()
const urlCache = new Map<string, string>()
let idbOk = true

async function putBlob(key: string, blob: Blob) {
  if (idbOk) {
    try { await idbSet(key, blob); return } catch { idbOk = false }
  }
  mem.set(key, blob)
}
async function getBlob(key: string): Promise<Blob | undefined> {
  if (mem.has(key)) return mem.get(key)
  if (!idbOk) return undefined
  try { return (await idbGet(key)) as Blob | undefined } catch { idbOk = false; return undefined }
}

export async function deletePhoto(key?: string) {
  if (!key) return
  mem.delete(key)
  const u = urlCache.get(key)
  if (u) { URL.revokeObjectURL(u); urlCache.delete(key) }
  try { await idbDel(key) } catch { /* ignore */ }
}

/** Downscale to keep storage small and texture uploads fast. */
export async function compressImage(file: Blob, maxSide = 1280, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    c.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', quality))
    return blob ?? file
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function savePhoto(file: Blob): Promise<string> {
  const blob = await compressImage(file)
  const key = `photo-${uid()}`
  await putBlob(key, blob)
  return key
}

export async function photoURL(key: string): Promise<string | undefined> {
  if (urlCache.has(key)) return urlCache.get(key)
  const b = await getBlob(key)
  if (!b) return undefined
  const u = URL.createObjectURL(b)
  urlCache.set(key, u)
  return u
}

/** Resolve a memory's image: personal photo from IndexedDB or bundled sample render. */
export function useMemoryImage(photoKey?: string, samplePhoto?: string) {
  const [url, setUrl] = useState<string | undefined>(() => (samplePhoto ? renderFor(samplePhoto) : photoKey ? urlCache.get(photoKey) : undefined))
  useEffect(() => {
    let alive = true
    if (samplePhoto) { setUrl(renderFor(samplePhoto)); return }
    if (!photoKey) { setUrl(undefined); return }
    photoURL(photoKey).then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [photoKey, samplePhoto])
  return url
}

/** Raw blob access for backups (photos stay on this device unless the player exports them into a file). */
export async function getPhotoBlob(key: string) { return getBlob(key) }
export async function putPhotoBlob(key: string, blob: Blob) { await putBlob(key, blob) }

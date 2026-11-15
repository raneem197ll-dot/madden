/**
 * Offer a generated file to the viewer. Inside the Claude host this uses the `downloads`
 * capability (the viewer confirms); elsewhere a normal browser download.
 */
type Downloads = { save(o: { filename: string; data: Blob }): Promise<unknown> }

export type SaveResult = 'saved' | 'declined' | 'failed'

export async function saveFile(filename: string, data: Blob): Promise<SaveResult> {
  const host = window.claude
  if (host && typeof host.use === 'function') {
    try {
      const dl = (await Promise.race([host.use('downloads'), new Promise((r) => setTimeout(() => r(null), 4000))])) as Downloads | null
      if (dl) {
        try { await dl.save({ filename, data }); return 'saved' } catch (e) {
          const code = (e as { code?: string })?.code
          return code === 'cancelled' || code === 'declined' || code === 'not_granted' ? 'declined' : 'failed'
        }
      }
    } catch { /* fall through */ }
  }
  try {
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'saved'
  } catch {
    return 'failed'
  }
}

export const dataURLToBlob = async (url: string) => (await fetch(url)).blob()

export function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(b)
  })
}

import type { Bi, Lang } from '../data/types'

export const pick = (b: Bi | undefined, lang: Lang) => (b ? b[lang] : '')

export function num(n: number, lang: Lang) {
  try {
    return n.toLocaleString(lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US')
  } catch {
    return String(n)
  }
}

export function pct(n: number, lang: Lang) {
  return lang === 'ar' ? `${num(Math.round(n), lang)}٪` : `${Math.round(n)}%`
}

export function fmtDate(iso: string | undefined, lang: Lang, withHijri = false) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  try {
    const g = d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-arab' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    if (!withHijri) return g
    const h = d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura-nu-arab' : 'en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    return `${g} · ${h}`
  } catch {
    return d.toDateString()
  }
}

export function toDateInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function fromDateInput(v: string, keepTimeFrom?: string) {
  const base = keepTimeFrom ? new Date(keepTimeFrom) : new Date()
  const [y, m, day] = v.split('-').map(Number)
  const d = new Date(base)
  d.setFullYear(y, (m || 1) - 1, day || 1)
  return d.toISOString()
}

export function fmtDistance(m: number, lang: Lang) {
  if (m < 1000) return lang === 'ar' ? `${num(Math.round(m), lang)} م` : `${Math.round(m)} m`
  const km = Math.round(m / 100) / 10
  return lang === 'ar' ? `${num(km, lang)} كم` : `${km} km`
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** Localised percentage: ٤٠٪ in Arabic, 40% in English. */
export function pctText(n: number, lang: Lang) {
  return lang === 'ar' ? `${num(n, lang)}٪` : `${num(n, lang)}%`
}

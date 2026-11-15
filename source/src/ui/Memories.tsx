import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGame, useT } from '../state/gameStore'
import { LANDMARK_IDS, LANDMARK_MAP } from '../data/landmarks'
import type { LandmarkId } from '../data/types'
import { fmtDate, toDateInput } from '../lib/format'
import { deletePhoto, savePhoto, useMemoryImage } from '../state/photoStore'
import { Btn, Modal, Toggle } from './components/Sheet'
import { Icon } from './components/Icon'
import { Thumb } from './LandmarkSheet'

/** Add a memory: optional photo (camera or gallery), short note, date. */
export function MemoryComposer() {
  const t = useT()
  const composer = useGame((s) => s.composer)
  const lang = useGame((s) => s.lang)
  const progress = useGame((s) => s.progress)
  const unlockedIds = LANDMARK_IDS.filter((id) => progress[id]?.unlocked)
  const [lm, setLm] = useState<LandmarkId | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toDateInput())
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cam = useRef<HTMLInputElement>(null)
  const gal = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!composer) return
    const id = composer.landmarkId ?? unlockedIds[0] ?? null
    setLm(id)
    setNote(''); setFile(null); setPreview(null); setSaving(false)
    setDate(toDateInput(id ? progress[id]?.visitDate : undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (!composer) return null
  const close = () => useGame.getState().setUi({ composer: null })
  const pick = (f?: File) => { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }
  const save = async () => {
    if (!lm) return
    setSaving(true)
    let photoKey: string | undefined
    try { if (file) photoKey = await savePhoto(file) } catch { /* keep note even if photo failed */ }
    useGame.getState().addMemory({ landmarkId: lm, note: note.trim(), date, photoKey })
    close()
  }

  return (
    <Modal open onClose={close} title={t('addMemory')} z={75}>
      {!unlockedIds.length ? (
        <p className="py-6 text-center text-[calc(14px*var(--fs))] text-ink-500">{t('unlockToAdd')}</p>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[calc(12.5px*var(--fs))] font-semibold text-ink-500">{t('chooseLandmark')}</div>
            <div className="scroll-x -mx-5 flex gap-1.5 px-5">
              {unlockedIds.map((id) => (
                <button key={id} onClick={() => setLm(id)} className={`btn-press shrink-0 rounded-full px-3.5 py-2 text-[calc(13px*var(--fs))] font-semibold ${lm === id ? 'bg-pine-800 text-sand-50' : 'bg-ink-900/6 text-ink-700'}`}>
                  {LANDMARK_MAP[id].name[lang]}
                </button>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-sand-200">
            {preview ? (
              <>
                <img src={preview} alt="" className="h-52 w-full object-cover" />
                <button onClick={() => { setFile(null); setPreview(null) }} className="btn-press absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white"><Icon name="x" size={16} /></button>
              </>
            ) : (
              <div className="grid h-40 place-items-center text-ink-500"><Icon name="image" size={40} stroke={1.3} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Btn tone="primary" onClick={() => cam.current?.click()}><Icon name="camera" size={18} /> {t('takePhoto')}</Btn>
            <Btn tone="outline" onClick={() => gal.current?.click()}><Icon name="gallery" size={18} /> {t('fromGallery')}</Btn>
          </div>
          <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          <input ref={gal} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          <label className="block">
            <span className="mb-1 block text-[calc(12.5px*var(--fs))] font-semibold text-ink-500">{t('note')}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} rows={3} placeholder={t('notePh')} className="w-full resize-none rounded-2xl border border-ink-900/10 bg-white px-4 py-3 text-[calc(14.5px*var(--fs))] outline-none focus:border-pine-600" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-900/5">
            <span className="text-[calc(13.5px*var(--fs))] font-semibold">{t('date')}</span>
            <input type="date" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-[calc(14px*var(--fs))] outline-none" />
          </label>
          <div className="flex items-center gap-1.5 text-[calc(12px*var(--fs))] text-pine-800"><Icon name="lock" size={13} /> {t('privateNote')}</div>
          <Btn tone="gold" full onClick={save} disabled={saving || (!file && !note.trim())}>{t('save')}</Btn>
        </div>
      )}
    </Modal>
  )
}

/** Full view of a single memory. */
export function MemoryViewer() {
  const t = useT()
  const id = useGame((s) => s.memoryView)
  const m = useGame((s) => s.memories.find((x) => x.id === s.memoryView))
  const lang = useGame((s) => s.lang)
  const url = useMemoryImage(m?.photoKey, m?.samplePhoto)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => setConfirm(false), [id])
  if (!id || !m) return null
  const close = () => useGame.getState().setUi({ memoryView: null })
  return (
    <Modal open onClose={close} title={LANDMARK_MAP[m.landmarkId].name[lang]} z={85}>
      <div className="space-y-3">
        {url && <img src={url} alt="" className="max-h-[50dvh] w-full rounded-3xl object-cover" />}
        {m.sample && <div className="text-[calc(12px*var(--fs))] text-ink-500">{t('sample')} · {t('gameRenders')}</div>}
        <p className="text-[calc(15px*var(--fs))] leading-relaxed">{m.note || '—'}</p>
        <div className="text-[calc(12.5px*var(--fs))] text-ink-500">{fmtDate(m.date, lang, true)}</div>
        {!m.sample && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink-900/5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[calc(13.5px*var(--fs))] font-semibold"><Icon name={m.shared ? 'eye' : 'lock'} size={15} /> {lang === 'ar' ? 'مشاركة مع الأصدقاء' : 'Share with friends'}</div>
              <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{lang === 'ar' ? 'تظهر في مدينتك المنشورة فقط إذا فعّلت ذلك' : 'Appears on your published city only if enabled'}</div>
            </div>
            <Toggle on={!!m.shared} onChange={() => useGame.getState().toggleMemoryShared(m.id)} />
          </div>
        )}
        <Btn tone={confirm ? 'danger' : 'ghost'} full onClick={() => {
          if (!confirm) return setConfirm(true)
          deletePhoto(m.photoKey)
          useGame.getState().deleteMemory(m.id)
        }}>
          <Icon name="trash" size={17} /> {confirm ? t('confirmDelete') : t('delete')}
        </Btn>
      </div>
    </Modal>
  )
}

/** Gallery overlay opened from inside a building. */
export function GalleryOverlay() {
  const t = useT()
  const id = useGame((s) => s.galleryFor)
  const lang = useGame((s) => s.lang)
  const mems = useGame(useShallow((s) => s.memories.filter((m) => m.landmarkId === s.galleryFor)))
  if (!id) return null
  const close = () => useGame.getState().setUi({ galleryFor: null })
  return (
    <Modal open onClose={close} title={`${t('memoriesHere')} · ${LANDMARK_MAP[id].name[lang]}`} z={70}>
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 rounded-xl bg-pine-800/6 px-3 py-2 text-[calc(12px*var(--fs))] text-pine-800"><Icon name="lock" size={13} /> {t('privateNote')}</div>
        {mems.length ? (
          <div className="grid grid-cols-2 gap-2">
            {[...mems].reverse().map((m) => (
              <div key={m.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-900/5">
                <Thumb m={m} className="aspect-[4/3] w-full rounded-none" />
                <div className="p-2">
                  <div className="line-clamp-2 text-[calc(12.5px*var(--fs))]">{m.note || '—'}</div>
                  <div className="text-[calc(11px*var(--fs))] text-ink-500">{fmtDate(m.date, lang)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-[calc(13.5px*var(--fs))] text-ink-500">{t('noPhotosYet')}</p>
        )}
        <Btn tone="primary" full onClick={() => useGame.getState().setUi({ composer: { landmarkId: id } })}><Icon name="camera" size={18} /> {t('addMemory')}</Btn>
      </div>
    </Modal>
  )
}

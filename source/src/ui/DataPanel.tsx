import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/gameStore'
import { Modal, Btn, Toggle } from './components/Sheet'
import { Icon } from './components/Icon'
import { applyBackup, createRestorePoint, exportBackup, listRestorePoints, readBackupFile, restorePoint, summarise, type BackupFile, type RestorePoint } from '../lib/backup'
import { cloudAvailable, deleteCloudCopy } from '../state/cloudSync'
import { fmtDate, num } from '../lib/format'

const ERR: Record<string, [string, string]> = {
  'not-json': ['هذا الملف ليس ملف نسخة احتياطية صالحًا.', 'This file is not a valid backup.'],
  'not-a-backup': ['هذا الملف ليس نسخة احتياطية من «مدينتي بعيوني».', 'This file is not a “My City, My Story” backup.'],
  'newer-version': ['النسخة من إصدار أحدث من اللعبة.', 'This backup comes from a newer version of the game.'],
  'too-large': ['الملف كبير جدًا.', 'The file is too large.'],
  broken: ['الملف تالف أو ناقص.', 'The file is damaged or incomplete.'],
}

const REASON: Record<RestorePoint['reason'], [string, string]> = {
  auto: ['تلقائية (يومية)', 'Automatic (daily)'],
  unlock: ['بعد فتح معلم', 'After an unlock'],
  'before-import': ['قبل الاستيراد', 'Before import'],
  'before-reset': ['قبل البدء من جديد', 'Before reset'],
  manual: ['قبل الاسترجاع', 'Before a restore'],
}

/** “My data & privacy”: where data lives, opt-in cloud backup, export/import, restore points. */
export function DataPanel() {
  const open = useGame((s) => s.panel === 'data')
  const lang = useGame((s) => s.lang)
  const privacy = useGame((s) => s.privacy)
  const cloud = useGame((s) => s.cloud)
  const memCount = useGame((s) => s.memories.filter((m) => !m.sample).length)
  const photoCount = useGame((s) => s.memories.filter((m) => m.photoKey && !m.sample).length)
  const g = useGame.getState
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const [withPhotos, setWithPhotos] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [points, setPoints] = useState<RestorePoint[]>([])
  const [hasCloud, setHasCloud] = useState<boolean | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    listRestorePoints().then(setPoints)
    cloudAvailable().then(setHasCloud)
    setMsg(null)
    setPending(null)
  }, [open])

  const doExport = async () => {
    setBusy('export')
    const r = await exportBackup(withPhotos)
    setBusy(null)
    setMsg(r === 'saved' ? { ok: true, text: L('تم تجهيز ملف النسخة الاحتياطية.', 'Your backup file is ready.') } : r === 'declined' ? { ok: false, text: L('أُلغي الحفظ.', 'Saving was cancelled.') } : { ok: false, text: L('تعذّر حفظ الملف هنا.', "Couldn't save the file here.") })
  }
  const pick = async (f?: File) => {
    if (!f) return
    try {
      setPending(await readBackupFile(f))
      setMsg(null)
    } catch (e) {
      const k = (e as Error).message
      setMsg({ ok: false, text: (ERR[k] ?? ERR.broken)[lang === 'ar' ? 0 : 1] })
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  const confirmImport = async () => {
    if (!pending) return
    setBusy('import')
    await applyBackup(pending)
    setBusy(null)
    setPending(null)
    setPoints(await listRestorePoints())
    setMsg({ ok: true, text: L('تم استرجاع رحلتك. حُفظت نقطة استرجاع لحالتك السابقة.', 'Your journey was restored. A restore point of your previous state was kept.') })
  }
  const doRestore = async (id: string) => {
    setBusy(id)
    const ok = await restorePoint(id)
    setBusy(null)
    setPoints(await listRestorePoints())
    setMsg(ok ? { ok: true, text: L('تم الاسترجاع.', 'Restored.') } : { ok: false, text: L('تعذّر الاسترجاع.', 'Could not restore.') })
  }
  const manualPoint = async () => {
    await createRestorePoint('manual')
    setPoints(await listRestorePoints())
  }

  const sum = pending ? summarise(pending.state, pending.exportedAt, Object.keys(pending.photos ?? {}).length) : null
  return (
    <Modal open={open} onClose={() => g().setUi({ panel: null })} title={L('بياناتي والخصوصية', 'My data & privacy')}>
      <div className="space-y-4 text-ink-900">
        {/* where data lives */}
        <section className="rounded-2xl bg-white p-3.5 ring-1 ring-ink-900/5">
          <h3 className="mb-2 flex items-center gap-2 text-[calc(14px*var(--fs))] font-bold text-pine-900"><Icon name="lock" size={16} /> {L('أين تُحفظ بياناتك', 'Where your data lives')}</h3>
          <ul className="space-y-1.5 text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700">
            <li>📱 {L(`على هذا الجهاز فقط: تقدّمك و${num(memCount, lang)} ذكرى و${num(photoCount, lang)} صورة.`, `On this device only: your progress, ${memCount} memories and ${photoCount} photos.`)}</li>
            <li>☁️ {privacy.cloudBackup ? L('النسخة السحابية الخاصة: مفعّلة', 'Private cloud backup: on') : L('النسخة السحابية الخاصة: متوقفة — لا يُرفع شيء.', 'Private cloud backup: off — nothing is uploaded.')}</li>
            <li>👥 {privacy.publish ? L('مدينتك منشورة للأصدقاء حسب إعدادات الخصوصية.', 'Your city is shared with friends, within your privacy settings.') : L('مدينتك غير منشورة.', 'Your city is not shared.')}</li>
            <li>🖼️ {L('الصور لا تغادر جهازك أبدًا إلا إن صدّرتها بنفسك في ملف، أو اخترت مشاركة صورة مصغّرة مع الأصدقاء.', 'Photos never leave your device unless you export them into a file yourself, or choose to share a thumbnail with friends.')}</li>
          </ul>
        </section>

        {/* opt-in cloud backup */}
        <section className="rounded-2xl bg-white p-3.5 ring-1 ring-ink-900/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[calc(14px*var(--fs))] font-bold">{L('نسخة سحابية خاصة', 'Private cloud backup')}</div>
              <div className="text-[calc(11.5px*var(--fs))] leading-relaxed text-ink-500">{L('تحفظ تقدّمك في مساحتك الخاصة بحسابك، فلا يراها غيرك. تعمل فقط حين تُفتح اللعبة داخل Claude.', 'Keeps your progress in your own private space on your account — nobody else can see it. Only works when the game is opened inside Claude.')}</div>
            </div>
            <Toggle label={L('نسخة سحابية خاصة', 'Private cloud backup')} on={privacy.cloudBackup} onChange={(v) => g().setPrivacy({ cloudBackup: v, cloudNotes: v ? privacy.cloudNotes : false })} />
          </div>
          {privacy.cloudBackup && (
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink-900/6 pt-2">
              <div className="min-w-0">
                <div className="text-[calc(13px*var(--fs))] font-semibold">{L('تضمين نصوص الذكريات', 'Include memory notes')}</div>
                <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{L('النصوص والتواريخ فقط — الصور لا تُرفع أبدًا.', 'Notes and dates only — photos are never uploaded.')}</div>
              </div>
              <Toggle label={L('تضمين نصوص الذكريات', 'Include memory notes')} on={privacy.cloudNotes} onChange={(v) => g().setPrivacy({ cloudNotes: v })} />
            </div>
          )}
          <div className="mt-2 text-[calc(11.5px*var(--fs))] text-ink-500">
            {hasCloud === false ? L('⚠️ غير متاحة هنا (ليست داخل Claude أو لم تسجّل الدخول).', '⚠️ Not available here (not inside Claude, or not signed in).') : privacy.cloudBackup ? (cloud === 'synced' ? L('✓ تمت المزامنة', '✓ Synced') : cloud === 'syncing' ? L('جارٍ المزامنة…', 'Syncing…') : cloud === 'error' ? L('تعذّرت المزامنة', 'Sync failed') : '') : ''}
          </div>
          {!privacy.cloudBackup && hasCloud && (
            <button onClick={async () => { if (!confirmDelete) { setConfirmDelete(true); return } const ok = await deleteCloudCopy(); setConfirmDelete(false); setMsg(ok ? { ok: true, text: L('حُذفت النسخة السحابية.', 'Cloud copy deleted.') } : { ok: false, text: L('تعذّر الحذف.', 'Could not delete.') }) }} className="btn-press mt-1 text-[calc(12px*var(--fs))] font-semibold text-red-700 underline">
              {confirmDelete ? L('تأكيد حذف النسخة السحابية', 'Confirm: delete cloud copy') : L('حذف أي نسخة سحابية سابقة', 'Delete any earlier cloud copy')}
            </button>
          )}
        </section>

        {/* export / import */}
        <section className="rounded-2xl bg-white p-3.5 ring-1 ring-ink-900/5">
          <h3 className="mb-1 text-[calc(14px*var(--fs))] font-bold">{L('نسخة احتياطية في ملف', 'Backup file')}</h3>
          <p className="mb-2 text-[calc(11.5px*var(--fs))] leading-relaxed text-ink-500">{L('احفظ رحلتك في ملف على جهازك، واسترجعها لاحقًا أو على جهاز آخر.', 'Save your journey to a file on your device, and restore it later or on another device.')}</p>
          <label className="mb-2 flex items-center gap-2 text-[calc(12.5px*var(--fs))]">
            <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="h-4 w-4 accent-[#1b6b51]" />
            {L('تضمين صوري في الملف (يكبر حجمه)', 'Include my photos in the file (larger file)')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Btn tone="primary" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={doExport} disabled={busy === 'export'}>⬇️ {L('تصدير', 'Export')}</Btn>
            <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => fileRef.current?.click()}>⬆️ {L('استيراد', 'Import')}</Btn>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label={L('اختر ملف النسخة الاحتياطية', 'Choose a backup file')} onChange={(e) => pick(e.target.files?.[0])} />
          {sum && (
            <div className="mt-3 rounded-xl bg-gold-300/20 p-3 text-[calc(12.5px*var(--fs))] ring-1 ring-gold-500/30" role="alertdialog" aria-label={L('تأكيد الاستيراد', 'Confirm import')}>
              <div className="font-semibold">{L('محتوى الملف', 'In this file')}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{fmtDate(sum.exportedAt, lang)}</div>
              <div className="mt-1 text-ink-700">{L(`${num(sum.unlocked, lang)} معالم، ${num(sum.memories, lang)} ذكرى · ${num(sum.photos, lang)} صورة`, `${sum.unlocked} landmarks · ${sum.memories} memories · ${sum.photos} photos`)}</div>
              <div className="mt-1 text-[calc(11.5px*var(--fs))] text-ink-500">{L('سيحلّ محل تقدّمك الحالي، وستُحفظ نقطة استرجاع لحالتك الحالية أولًا. إعدادات الخصوصية لا تتغير.', 'It will replace your current progress; a restore point of your current state is kept first. Privacy settings are not changed.')}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Btn tone="primary" className="py-2 text-[calc(12.5px*var(--fs))]" onClick={confirmImport} disabled={busy === 'import'}>{L('استبدال واسترجاع', 'Replace & restore')}</Btn>
                <Btn tone="ghost" className="py-2 text-[calc(12.5px*var(--fs))]" onClick={() => setPending(null)}>{L('إلغاء', 'Cancel')}</Btn>
              </div>
            </div>
          )}
        </section>

        {/* restore points */}
        <section className="rounded-2xl bg-white p-3.5 ring-1 ring-ink-900/5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[calc(14px*var(--fs))] font-bold">{L('نقاط الاسترجاع', 'Restore points')}</h3>
            <button onClick={manualPoint} className="btn-press rounded-full bg-pine-800/8 px-2.5 py-1 text-[calc(11.5px*var(--fs))] font-semibold text-pine-800">+ {L('إنشاء الآن', 'Create now')}</button>
          </div>
          <p className="mb-2 text-[calc(11.5px*var(--fs))] text-ink-500">{L('تُحفظ تلقائيًا على هذا الجهاز بعد كل معلم جديد ومرة يوميًا (آخر ٦).', 'Saved automatically on this device after each new landmark and once a day (last 6).')}</p>
          {points.length === 0 && <div className="text-[calc(12px*var(--fs))] text-ink-500">{L('لا توجد نقاط بعد.', 'None yet.')}</div>}
          <ul className="divide-y divide-ink-900/6">
            {points.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0 text-[calc(12px*var(--fs))]">
                  <div className="font-semibold">{fmtDate(p.at, lang)}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{new Date(p.at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-ink-500">{REASON[p.reason][lang === 'ar' ? 0 : 1]}<span className="mx-1.5 opacity-40" aria-hidden="true">|</span>{L(`${num(p.summary.unlocked, lang)} ${p.summary.unlocked === 1 ? 'معلم' : 'معالم'}، ${num(p.summary.memories, lang)} ذكرى`, `${p.summary.unlocked} landmarks, ${p.summary.memories} memories`)}</div>
                </div>
                <button onClick={() => doRestore(p.id)} disabled={busy === p.id} className="btn-press shrink-0 rounded-full bg-ink-900/6 px-3 py-1.5 text-[calc(12px*var(--fs))] font-semibold">{L('استرجاع', 'Restore')}</button>
              </li>
            ))}
          </ul>
        </section>

        {msg && <div role="status" className={`rounded-xl px-3 py-2 text-[calc(12.5px*var(--fs))] font-semibold ${msg.ok ? 'bg-pine-800/10 text-pine-900' : 'bg-red-600/10 text-red-800'}`}>{msg.text}</div>}
      </div>
    </Modal>
  )
}

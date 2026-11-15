import { useEffect, useState } from 'react'
import { useGame, usePoints, useCompletion } from '../state/gameStore'
import { LANDMARKS, LANDMARK_IDS, LANDMARK_MAP } from '../data/landmarks'
import { allHidden } from '../data/progression'
import type { SharedCity } from '../data/types'
import { fmtDate, num, pctText } from '../lib/format'
import { snapshot, makePostcard } from '../lib/snapshot'
import { social, shareLink, publishNow } from '../state/social'
import { startReplay } from '../state/director'
import { Icon } from './components/Icon'
import { Btn, Modal, Pill, ProgressRing, Toggle } from './components/Sheet'
import { LandmarkEmblem } from './components/LandmarkEmblem'

async function saveFile(filename: string, dataUrl: string): Promise<'saved' | 'unavailable' | 'declined'> {
  try {
    const host = window.claude
    const dl = host ? ((await Promise.race([host.use('downloads'), new Promise((r) => setTimeout(() => r(null), 4000))])) as { save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null) : null
    const blob = await (await fetch(dataUrl)).blob()
    if (dl) { await dl.save({ filename, data: blob }); return 'saved' }
    // plain browser (outside the hosted frame)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return 'saved'
  } catch (e) {
    return (e as { code?: string })?.code === 'declined' ? 'declined' : 'unavailable'
  }
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

/* ------------------------------ Share my city ------------------------------ */
export function ShareModal() {
  const open = useGame((s) => s.panel === 'share')
  const lang = useGame((s) => s.lang)
  const privacy = useGame((s) => s.privacy)
  const code = useGame((s) => s.shareCode)
  const name = useGame((s) => s.profileName)
  const progress = useGame((s) => s.progress)
  const memories = useGame((s) => s.memories)
  const st = useGame((s) => s)
  const points = usePoints()
  const completion = useCompletion()
  const [card, setCard] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const g = useGame.getState

  useEffect(() => {
    if (!open) { setCard(null); setMsg(null); return }
    let alive = true
    ;(async () => {
      const shot = snapshot.capture?.()
      if (!shot) return
      const url = await makePostcard({
        shot, lang, name: privacy.showName ? name : undefined, completion,
        landmarks: LANDMARK_IDS.filter((id) => progress[id]?.unlocked).map((id) => LANDMARK_MAP[id].name[lang]),
        points, memories: memories.filter((m) => !m.sample).length, collectibles: allHidden(st),
        dateText: fmtDate(new Date().toISOString(), lang),
      })
      if (alive) setCard(url)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lang])

  if (!open) return null
  const link = shareLink(code)
  return (
    <Modal open onClose={() => g().setUi({ panel: null })} title={L('شارك مدينتك', 'Share your city')} z={70}>
      <div className="space-y-3">
        <div className="overflow-hidden rounded-3xl bg-pine-900 ring-1 ring-gold-500/30">
          {card ? <img src={card} alt={L('بطاقة مدينتي', 'My city card')} className="w-full" /> : <div className="grid aspect-[4/5] place-items-center text-sand-200/70">{L('جارٍ تجهيز اللقطة…', 'Preparing snapshot…')}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Btn tone="gold" disabled={!card || busy} onClick={async () => {
            if (!card) return
            setBusy(true)
            const r = await saveFile('my-madinah-city.jpg', card)
            setBusy(false)
            setMsg(r === 'saved' ? L('تم حفظ الصورة', 'Image saved') : r === 'declined' ? L('أُلغي الحفظ', 'Save cancelled') : L('الحفظ غير متاح هنا — اضغط مطوّلًا على الصورة لحفظها', 'Saving isn’t available here — long-press the image to save it'))
          }}><Icon name="download" size={17} /> {L('حفظ الصورة', 'Save image')}</Btn>
          <Btn tone="primary" onClick={async () => {
            if (!privacy.publish) { g().setPrivacy({ publish: true }); await publishNow() }
            const ok = await copy(link)
            setMsg(ok ? L('نُسخ الرابط — يصل إليه من شاركت معهم هذه الصفحة', 'Link copied — works for people this page is shared with') : link)
          }}><Icon name="link" size={17} /> {L('نسخ الرابط', 'Copy link')}</Btn>
        </div>
        {msg && <div className="break-all rounded-2xl bg-gold-300/25 p-3 text-[calc(12.5px*var(--fs))] text-ink-700">{msg}</div>}
        <PrivacyControls compact />
      </div>
    </Modal>
  )
}

/* ------------------------------ Privacy controls ------------------------------ */
export function PrivacyControls({ compact = false }: { compact?: boolean }) {
  const lang = useGame((s) => s.lang)
  const p = useGame((s) => s.privacy)
  const socialKind = useGame((s) => s.social)
  const canPublish = useGame((s) => s.canPublish)
  const sharedMem = useGame((s) => s.memories.filter((m) => m.shared).length)
  const g = useGame.getState
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const row = (label: string, key: keyof typeof p, desc?: string) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><div className="text-[calc(13.5px*var(--fs))] font-semibold">{label}</div>{desc && <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{desc}</div>}</div>
      <Toggle on={!!p[key]} onChange={(v) => g().setPrivacy({ [key]: v })} />
    </div>
  )
  return (
    <div className="rounded-2xl bg-white px-4 py-2 ring-1 ring-ink-900/5">
      <div className="flex items-center justify-between gap-3 border-b border-ink-900/5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[calc(14.5px*var(--fs))] font-bold text-pine-900"><Icon name="eye" size={16} /> {L('اجعل مدينتي مرئية للأصدقاء', 'Make my city visible to friends')}</div>
          <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{socialKind === 'shared' ? L('يراها من شاركت معهم هذه الصفحة فقط', 'Only people this page is shared with can see it') : L('معاينة محلية — المشاركة الفعلية تعمل عند استضافة الصفحة ومشاركتها', 'Local preview — real sharing works when the page is hosted and shared')}</div>
        </div>
        <Toggle on={p.publish} onChange={(v) => g().setPrivacy({ publish: v })} />
      </div>
      {canPublish === false && <div className="my-2 rounded-xl bg-red-50 p-2 text-[calc(12px*var(--fs))] text-red-800">{L('لا تملك صلاحية النشر في هذه الصفحة (يمكنك زيارة مدن الآخرين فقط).', 'You don’t have permission to publish on this page (you can still visit others’ cities).')}</div>}
      <div className={p.publish ? '' : 'pointer-events-none opacity-45'}>
        {row(L('إظهار اسمي', 'Show my name'), 'showName', L('اسم حامل الجواز', 'Your passport name'))}
        {row(L('إظهار تواريخ الزيارات', 'Show visit dates'), 'showDates')}
        {!compact && row(L('إظهار الإحصائيات والنقاط', 'Show stats & points'), 'showStats')}
        {!compact && row(L('إظهار مقتنياتي', 'Show my collection'), 'showCollection')}
        {row(L('صور الذكريات المختارة', 'Photos of chosen memories'), 'sharePhotos', L(`الذكريات المختارة للمشاركة: ${sharedMem} — اختر من شاشة الذكرى`, `Memories chosen to share: ${sharedMem} — choose from a memory`))}
      </div>
    </div>
  )
}

/* ------------------------------ Friends' cities ------------------------------ */
export function FriendsSection() {
  const lang = useGame((s) => s.lang)
  const socialKind = useGame((s) => s.social)
  const publish = useGame((s) => s.privacy.publish)
  const [list, setList] = useState<SharedCity[] | null>(null)
  const [loading, setLoading] = useState(false)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const load = async () => {
    setLoading(true)
    try { setList(await social.list()) } catch { setList([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [socialKind, publish])
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-pine-800 p-4 text-sand-50">
        <div className="flex items-center gap-2 font-display text-[calc(18px*var(--fs))] font-semibold"><Icon name="users" size={18} /> {L('مدن الأصدقاء', 'Friends’ cities')}</div>
        <p className="mt-1 text-[calc(12.5px*var(--fs))] leading-relaxed text-sand-100/85">
          {socialKind === 'shared'
            ? L('كل من شاركت معه هذه الصفحة يستطيع نشر مدينته وزيارة مدن الآخرين. أنت تختار ما يظهر منها.', 'Everyone this page is shared with can publish their city and visit others’. You choose what is visible.')
            : L('أنت في وضع المعاينة المحلية: تظهر مدن تجريبية فقط. عند استضافة الصفحة ومشاركتها تظهر مدن الأصدقاء الحقيقية.', 'Local preview: only sample cities appear. When the page is hosted and shared, real friends’ cities appear.')}
        </p>
      </div>
      <PrivacyControls />
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[calc(17px*var(--fs))] font-semibold text-pine-900">{L('مدن منشورة', 'Published cities')}</h3>
        <button onClick={load} className="btn-press flex items-center gap-1 rounded-full bg-ink-900/5 px-3 py-1.5 text-[calc(12px*var(--fs))] font-semibold"><Icon name="reset" size={14} /> {loading ? '…' : L('تحديث', 'Refresh')}</button>
      </div>
      {list === null ? <div className="py-6 text-center text-[calc(13px*var(--fs))] text-ink-500">…</div> : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 p-5 text-center text-[calc(13px*var(--fs))] text-ink-500">{L('لا توجد مدن منشورة بعد.', 'No published cities yet.')}</div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => <CityCard key={c.uid} c={c} />)}
        </div>
      )}
      <div className="rounded-2xl border border-dashed border-gold-500/40 bg-gold-300/10 p-4">
        <div className="flex items-center gap-2 font-semibold text-pine-900">🗓️ {L('قريبًا: استكشاف جماعي', 'Planned: explore together')}</div>
        <p className="mt-1 text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-500">{L('تجوّل مع أصدقائك داخل المعالم في الوقت نفسه. البنية جاهزة للإضافة لاحقًا ولم تُفعَّل بعد.', 'Walk through landmarks with friends at the same time. The structure is ready for it; it is not enabled yet.')}</p>
      </div>
    </div>
  )
}

function CityCard({ c }: { c: SharedCity }) {
  const lang = useGame((s) => s.lang)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const isMe = c.uid === social.uid
  const title = isMe ? L('مدينتي (كما يراها الأصدقاء)', 'My city (as friends see it)') : c.sample ? L(`مدينة تجريبية ${c.code.slice(-1)}`, `Sample city ${c.code.slice(-1)}`) : c.name || L(`مستكشف ${c.code}`, `Explorer ${c.code}`)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink-900/5">
      <ProgressRing value={c.completion / 100} size={50} stroke={5}><span className="text-[calc(11px*var(--fs))] font-bold text-pine-800">{pctText(c.completion, lang)}</span></ProgressRing>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="truncate text-[calc(14.5px*var(--fs))] font-semibold">{title}</div>
          {c.sample && <Pill tone="gold">{L('مثال', 'Sample')}</Pill>}
        </div>
        <div className="mt-1 flex gap-1">
          {LANDMARKS.map((l) => (
            <span key={l.id} className={`grid h-7 w-7 place-items-center rounded-lg ${c.unlocked[l.id] ? 'bg-pine-800' : 'bg-ink-900/8'}`}>
              <LandmarkEmblem id={l.id} size={20} tone={c.unlocked[l.id] ? 'gold' : 'dark'} className={c.unlocked[l.id] ? '' : 'opacity-30'} />
            </span>
          ))}
        </div>
        {c.stats && <div className="mt-1 text-[calc(11px*var(--fs))] text-ink-500">{num(c.stats.points, lang)} {L('نقطة', 'pts')}<span className="mx-1.5 opacity-40">|</span>{num(c.stats.collectibles, lang)} {L('مقتنيات', 'collectibles')}</div>}
      </div>
      <Btn tone={isMe ? 'outline' : 'primary'} className="px-3 py-2 text-[calc(13px*var(--fs))]" onClick={() => useGame.getState().visit(c)}>{L('زيارة', 'Visit')}</Btn>
    </div>
  )
}

/* ------------------------------ Visit mode banner ------------------------------ */
export function VisitBanner() {
  const v = useGame((s) => s.visiting)
  const lang = useGame((s) => s.lang)
  const replay = useGame((s) => s.replay.active)
  if (!v || replay) return null
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const isMe = v.uid === social.uid
  const who = isMe ? L('مدينتك كما يراها الأصدقاء', 'Your city as friends see it') : v.sample ? L('مدينة تجريبية (مثال)', 'Sample city') : v.name || L(`مستكشف ${v.code}`, `Explorer ${v.code}`)
  const count = Object.keys(v.unlocked).length
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[92px] z-30 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-md flex-1 items-center gap-3 rounded-2xl bg-gold-300 px-3 py-2.5 text-pine-950 shadow-xl anim-rise">
        <Icon name="users" size={20} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[calc(13.5px*var(--fs))] font-bold">{L('تزور', 'Visiting')}: {who}</div>
          <div className="text-[calc(11.5px*var(--fs))]">{num(count, lang)}/{num(4, lang)} {L('معالم', 'landmarks')}<span className="mx-1.5 opacity-40">|</span>{pctText(v.completion, lang)}</div>
        </div>
        {count > 0 && <button onClick={() => startReplay()} className="btn-press grid h-9 w-9 place-items-center rounded-xl bg-pine-900/10" aria-label="replay"><Icon name="play" size={15} fill /></button>}
        <button onClick={() => useGame.getState().visit(null)} className="btn-press rounded-xl bg-pine-900 px-3 py-2 text-[calc(12.5px*var(--fs))] font-bold text-sand-50">{L('العودة لمدينتي', 'My city')}</button>
      </div>
    </div>
  )
}

/** Read-only panel for a landmark in a friend's city. */
export function VisitSheet() {
  const v = useGame((s) => s.visiting)
  const id = useGame((s) => s.selected)
  const open = useGame((s) => s.sheetOpen && !!s.visiting && s.mode === 'city')
  const lang = useGame((s) => s.lang)
  if (!open || !v || !id) return null
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const lm = LANDMARK_MAP[id]
  const u = v.unlocked[id]
  const mems = v.memories.filter((m) => m.landmarkId === id)
  return (
    <div className="absolute inset-x-0 bottom-0 z-50 max-h-[60dvh] overflow-y-auto rounded-t-[28px] bg-sand-50 p-5 shadow-2xl anim-rise md:inset-x-auto md:bottom-4 md:end-4 md:w-[380px] md:rounded-[28px]" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${u ? 'bg-pine-800' : 'bg-ink-700/70'}`}><LandmarkEmblem id={id} size={34} tone={u ? 'gold' : 'light'} /></div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[calc(20px*var(--fs))] font-semibold text-pine-900">{lm.name[lang]}</div>
          <div className="text-[calc(12.5px*var(--fs))] text-ink-500">{u ? (typeof u === 'string' ? `${L('زاره في', 'Visited on')} ${fmtDate(u, lang)}` : L('تمت زيارته', 'Visited')) : L('لم يزره بعد', 'Not visited yet')}</div>
        </div>
        <button onClick={() => useGame.getState().closeSheet()} className="btn-press grid h-9 w-9 place-items-center rounded-full bg-ink-900/6"><Icon name="x" size={17} /></button>
      </div>
      <div className="mt-3 space-y-2">
        {mems.length ? mems.map((m, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-900/5">
            {m.photo && <img src={m.photo} alt="" className="h-40 w-full object-cover" />}
            <div className="p-3 text-[calc(13.5px*var(--fs))]">{m.note}{m.date && <div className="mt-1 text-[calc(11px*var(--fs))] text-ink-500">{fmtDate(m.date, lang)}</div>}</div>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-ink-900/15 p-4 text-center text-[calc(12.5px*var(--fs))] text-ink-500">{L('لم يشارك ذكريات من هذا المعلم', 'No shared memories from this landmark')}</div>}
      </div>
      <p className="mt-3 text-[calc(11.5px*var(--fs))] text-ink-500">{L('تعرض الزيارة ما اختار صاحب المدينة مشاركته فقط.', 'A visit shows only what the city’s owner chose to share.')}</p>
    </div>
  )
}

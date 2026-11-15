import { useEffect, useState } from 'react'
import { useGame } from '../state/gameStore'
import { LANDMARK_MAP } from '../data/landmarks'
import { ModelViewer } from './ModelViewer'
import { AR_ADAPTERS, arContentFor, detectAR, type ARSupport } from '../ar'
import { Modal, Pill } from './components/Sheet'
import { Icon } from './components/Icon'

export function ARPanel() {
  const id = useGame((s) => (s.panel === 'ar' ? s.arFor : null))
  const lang = useGame((s) => s.lang)
  const [sup, setSup] = useState<ARSupport | null>(null)
  useEffect(() => { if (id) detectAR().then(setSup) }, [id])
  if (!id) return null
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const content = arContentFor(id)
  const yes = (v: boolean | 'unknown') => (v === true ? '✅' : v === 'unknown' ? '❔' : '—')
  return (
    <Modal open onClose={() => useGame.getState().setUi({ panel: null, arFor: null })} z={74} wide title={<span className="flex items-center gap-2"><Icon name="cube" size={18} /> {L('عرض ثلاثي الأبعاد والواقع المعزز', '3D view & AR')}</span>}>
      <div className="space-y-3">
        <div className="h-[42dvh] overflow-hidden rounded-3xl ring-1 ring-ink-900/10"><ModelViewer id={id} /></div>
        <p className="text-center text-[calc(12px*var(--fs))] text-ink-500">{L('اسحب لتدوير النموذج وقرّب بإصبعين — نموذج مبسّط للعبة', 'Drag to rotate, pinch to zoom — simplified game model')}</p>
        <div className="rounded-2xl border border-gold-500/40 bg-gold-300/15 p-3">
          <div className="flex items-center gap-2 font-semibold text-pine-900"><Pill tone="gold">{L('مخطّط له', 'Planned')}</Pill> {L('الواقع المعزز عبر الكاميرا', 'Camera AR')}</div>
          <p className="mt-1.5 text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700">
            {L('الواقع المعزز غير مفعّل في هذه النسخة. البنية جاهزة: النموذج نفسه ونقطة الموقع الحقيقية ومعلومات المعلم معدّة لجلسة واقع معزز لاحقًا.', 'AR is not active in this version. The structure is ready: the same model, the real-world anchor point and the landmark information are prepared for a future AR session.')}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[calc(11.5px*var(--fs))] text-ink-700">
            <div>{L('موقع الربط', 'Anchor')}: {content.anchor.lat.toFixed(4)}, {content.anchor.lng.toFixed(4)}</div>
            <div>{L('حجم المجسّم', 'Tabletop size')}: {content.tabletopSizeM} m</div>
            <div>{L('طبقات معلومات', 'Info overlays')}: {content.overlays.length}</div>
            <div>{L('دليل صوتي', 'Narration')}: ✅</div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/5">
          <div className="mb-1.5 text-[calc(12.5px*var(--fs))] font-bold text-pine-800">{L('فحص جهازك الحالي', 'This device')}</div>
          {sup ? (
            <div className="grid grid-cols-2 gap-1 text-[calc(12px*var(--fs))]">
              <div>WebXR AR: {yes(sup.webxrAR)}</div>
              <div>{L('واجهة الكاميرا', 'Camera API')}: {yes(sup.camera)}</div>
              <div>{L('اتصال آمن', 'Secure context')}: {yes(sup.secureContext)}</div>
              <div>{L('داخل إطار مضمّن', 'Embedded frame')}: {sup.inFrame ? L('نعم (يمنع الكاميرا)', 'yes (blocks camera)') : L('لا', 'no')}</div>
            </div>
          ) : <div className="text-[calc(12px*var(--fs))] text-ink-500">…</div>}
        </div>
        <div className="space-y-1.5">
          {AR_ADAPTERS.map((a) => (
            <div key={a.id} className="flex items-start gap-2 rounded-2xl bg-white/70 p-2.5 text-[calc(12px*var(--fs))] ring-1 ring-ink-900/5">
              <span>🗓️</span>
              <div><div className="font-semibold">{a.name[lang]}</div><div className="text-ink-500">{L('يتطلب', 'Needs')}: {a.needs[lang]}</div></div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

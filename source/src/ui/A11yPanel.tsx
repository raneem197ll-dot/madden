import { useGame } from '../state/gameStore'
import { Modal, Toggle } from './components/Sheet'
import { ChoiceChip } from './components/Bits'

/** Text size, motion and captions. */
export function A11yPanel() {
  const open = useGame((s) => s.panel === 'a11y')
  const lang = useGame((s) => s.lang)
  const a = useGame((s) => s.a11y)
  const g = useGame.getState
  const L = (x: string, y: string) => (lang === 'ar' ? x : y)
  const sizes: [number, string][] = [[1, L('عادي', 'Normal')], [1.15, L('كبير', 'Large')], [1.3, L('أكبر', 'Larger')]]
  return (
    <Modal open={open} onClose={() => g().setUi({ panel: null })} title={L('سهولة الاستخدام', 'Accessibility')}>
      <div className="space-y-3">
        <section className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/6">
          <h3 className="text-[calc(14px*var(--fs))] font-bold">{L('حجم النص', 'Text size')}</h3>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label={L('حجم النص', 'Text size')}>
            {sizes.map(([v, label]) => <ChoiceChip key={v} on={a.textScale === v} onClick={() => g().setA11y({ textScale: v })}><span style={{ fontSize: `${13 * v}px` }}>{label}</span></ChoiceChip>)}
          </div>
          <p className="mt-2 text-[calc(13px*var(--fs))] text-ink-700">{L('معاينة: يُعدّ مسجد قباء أول مسجد أُسّس في الإسلام.', 'Preview: Quba Mosque is regarded as the first mosque founded in Islam.')}</p>
        </section>
        <section className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/6">
          <h3 className="text-[calc(14px*var(--fs))] font-bold">{L('تقليل الحركة', 'Reduce motion')}</h3>
          <p className="text-[calc(11.5px*var(--fs))] text-ink-500">{L('يوقف تحريك الكاميرا والدوران التلقائي والمؤثرات المتحركة.', 'Stops camera glides, auto-rotation and animated effects.')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['system', 'on', 'off'] as const).map((m) => <ChoiceChip key={m} on={a.reduceMotion === m} onClick={() => g().setA11y({ reduceMotion: m })}>{m === 'system' ? L('حسب الجهاز', 'Follow device') : m === 'on' ? L('مفعّل', 'On') : L('متوقف', 'Off')}</ChoiceChip>)}
          </div>
        </section>
        <section className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink-900/6">
          <div>
            <h3 className="text-[calc(14px*var(--fs))] font-bold">{L('الترجمة النصية للصوت', 'Captions for audio')}</h3>
            <p className="text-[calc(11.5px*var(--fs))] text-ink-500">{L('تُظهر الجملة المنطوقة أثناء الدليل الصوتي. النص الكامل متاح دائمًا تحت كل دليل.', 'Shows the sentence being spoken during audio guides. The full transcript is always available under each guide.')}</p>
          </div>
          <Toggle label={L('الترجمة النصية', 'Captions')} on={a.captions} onChange={(v) => g().setA11y({ captions: v })} />
        </section>
        <section className="rounded-2xl bg-pine-800/6 p-3 text-[calc(12px*var(--fs))] leading-relaxed text-ink-700">
          <b>{L('التنقّل بلوحة المفاتيح: ', 'Keyboard: ')}</b>
          {L('Tab للتنقّل بين الأزرار، Enter للاختيار، Esc لإغلاق النوافذ. داخل المعالم: W A S D أو الأسهم للمشي، E للفحص.', 'Tab moves between buttons, Enter selects, Esc closes windows. Inside landmarks: W A S D or arrows to walk, E to inspect.')}
        </section>
      </div>
    </Modal>
  )
}

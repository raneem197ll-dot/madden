import { useGame } from '../state/gameStore'
import { Modal } from './components/Sheet'

const WORKS: [string, string][] = [
  ['مدينتك ثلاثية الأبعاد وجولات المعالم من الداخل', 'Your 3D city and walking inside the landmarks'],
  ['كل معلومات المعالم والمقتنيات والقصص و«الماضي والحاضر» (مضمّنة في اللعبة)', 'All landmark info, collectibles, stories and Then & Now (built into the game)'],
  ['ذكرياتك وصورك — محفوظة على هذا الجهاز', 'Your memories and photos — stored on this device'],
  ['الاختبارات والإنجازات والتحديات وجواز رحلتي', 'Quizzes, achievements, challenges and your passport'],
  ['مخطِّط الزيارة (تقديرات محسوبة على جهازك)', 'The visit planner (estimates worked out on your device)'],
  ['المرشد السياحي من المصادر المحفوظة، والإجابات السابقة', 'The tourism guide from saved sources, and earlier answers'],
  ['قصة رحلتي وملخصها وبطاقتها', 'Your travel story, summary image and postcard'],
  ['نقاط الاسترجاع والنسخة الاحتياطية في ملف', 'Restore points and file backups'],
]
const NEEDS: [string, string][] = [
  ['إجابات المرشد المصاغة بواسطة Claude', 'Guide answers written by Claude'],
  ['النسخة السحابية الخاصة', 'Private cloud backup'],
  ['مدن الأصدقاء وروابط المشاركة ونشر مدينتك', "Friends' cities, share links and publishing your city"],
  ['الاتجاهات في خرائط Google وروابط المصادر', 'Directions in Google Maps and source links'],
  ['الخطوط العربية عند أول تحميل (وإلا يُستخدم خط الجهاز)', 'The Arabic fonts on first load (otherwise the device font is used)'],
  ['بعض أصوات الجهاز للدليل الصوتي', 'Some device voices for the audio guide'],
]

/** What works without a connection, and whether the game can re-open offline here. */
export function OfflinePanel() {
  const open = useGame((s) => s.panel === 'offline')
  const lang = useGame((s) => s.lang)
  const online = useGame((s) => s.online)
  const sw = useGame((s) => s.swStatus)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const i = lang === 'ar' ? 0 : 1
  return (
    <Modal open={open} onClose={() => useGame.getState().setUi({ panel: null })} title={L('العمل دون اتصال', 'Offline use')}>
      <div className="space-y-3">
        <div className={`rounded-2xl px-3 py-2.5 text-[calc(13px*var(--fs))] font-semibold ${online ? 'bg-pine-800/8 text-pine-900' : 'bg-red-600/10 text-red-800'}`} role="status">
          {online ? L('📶 متصل الآن', '📶 Online now') : L('📴 أنت دون اتصال الآن', "📴 You're offline right now")}
        </div>
        <div className="rounded-2xl bg-white p-3 text-[calc(12.5px*var(--fs))] leading-relaxed ring-1 ring-ink-900/6">
          <b>{L('إعادة فتح اللعبة دون اتصال: ', 'Re-opening without a connection: ')}</b>
          {sw === 'active' ? L('مفعّلة — حُفظت اللعبة على هذا الجهاز.', 'on — the game is saved on this device.')
            : sw === 'pending' ? L('جارٍ التجهيز…', 'setting up…')
            : L('غير متاحة في هذا المكان. أبقِ الصفحة مفتوحة، أو استضف اللعبة على موقعها الخاص لتعمل كتطبيق دون اتصال. ما دامت مفتوحة فهي تعمل دون اتصال.', "not available here. Keep the page open, or host the game on its own website to use it as an offline app. While it's open, it keeps working offline.")}
        </div>
        <section>
          <h3 className="mb-1.5 text-[calc(13.5px*var(--fs))] font-bold text-pine-900">✅ {L('يعمل دون اتصال', 'Works offline')}</h3>
          <ul className="space-y-1 text-[calc(12.5px*var(--fs))] text-ink-700">{WORKS.map((w) => <li key={w[1]}>• {w[i]}</li>)}</ul>
        </section>
        <section>
          <h3 className="mb-1.5 text-[calc(13.5px*var(--fs))] font-bold text-pine-900">📶 {L('يحتاج اتصالًا بالإنترنت', 'Needs an internet connection')}</h3>
          <ul className="space-y-1 text-[calc(12.5px*var(--fs))] text-ink-700">{NEEDS.map((w) => <li key={w[1]}>• {w[i]}</li>)}</ul>
        </section>
      </div>
    </Modal>
  )
}

/** Small pill on the map when the device is offline. */
export function OfflinePill() {
  const online = useGame((s) => s.online)
  const lang = useGame((s) => s.lang)
  if (online) return null
  return (
    <button onClick={() => useGame.getState().setUi({ panel: 'offline' })} className="btn-press pointer-events-auto fixed start-1/2 top-[calc(env(safe-area-inset-top)+118px)] z-30 -translate-x-1/2 rounded-full bg-ink-900/85 px-3 py-1.5 text-[calc(12px*var(--fs))] font-semibold text-sand-50 shadow-lg rtl:translate-x-1/2" role="status">
      📴 {lang === 'ar' ? 'دون اتصال — مدينتك وذكرياتك متاحة' : 'Offline — your city and memories still work'}
    </button>
  )
}

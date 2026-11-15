import { useGame } from '../state/gameStore'
import { LANDMARKS } from '../data/landmarks'
import { PLACES } from '../data/places'
import { LANDMARK_SOURCES } from '../data/collectibles'
import { Modal } from './components/Sheet'
import { SourceList } from './Collection'

type Status = 'done' | 'partial' | 'visual' | 'planned'
type F = { s: Status; ar: string; en: string; noteAr?: string; noteEn?: string }
const FEATURES: F[] = [
  // fully implemented
  { s: 'done', ar: 'مدينة ثلاثية الأبعاد تُبنى وتنمو مع كل معلم تفتحه', en: 'A 3D city that builds and grows with every landmark you unlock' },
  { s: 'done', ar: 'خريطة بالاتجاهات الحقيقية: ٢٩ مكانًا — ١٥ معلمًا بنماذج ثلاثية الأبعاد و١٤ مكانًا على الخريطة', en: 'A real-direction map: 29 places — 15 landmarks with 3D models and 14 map places', noteAr: 'الاتجاهات من الإحداثيات الحقيقية، والمسافات مضغوطة كي تتسع المدينة على الطاولة', noteEn: 'Directions come from real coordinates; distances are compressed to fit the table' },
  { s: 'done', ar: 'وسط المدينة حول المسجد النبوي: الفنادق والأسواق والطرق الدائرية الثلاثة وممشى قباء', en: 'Downtown around the Prophet’s Mosque: hotels, markets, the three ring roads and the Quba walkway' },
  { s: 'done', ar: 'دليل الأماكن: بحث وتصنيفات وترتيب حسب القرب، وفتح الموقع في الخرائط', en: 'Places directory: search, categories, sort by distance, open in Maps' },
  { s: 'done', ar: 'المشي داخل المعالم: متحف سكة الحجاز كاملًا، وثلاثة معالم مبسّطة، وساحات المسجد النبوي', en: 'Walking inside landmarks: the full Hejaz museum, three simplified sites and the Prophet’s Mosque plazas', noteAr: 'في المسجد النبوي الساحات والمظلات فقط — بلا روضة ولا حجرة ولا مقتنيات، احترامًا للمكان', noteEn: 'At the Prophet’s Mosque: plazas and umbrellas only — no Rawdah, no chamber, no collectibles, out of respect' },
  { s: 'done', ar: '١٢ مقتنًى مخفيًا بمعلومات موثّقة ومصادرها', en: '12 hidden collectibles with verified facts and sources' },
  { s: 'done', ar: 'قصص تفاعلية: أدلة تجدها داخل المعالم وأسئلة وتأمل', en: 'Interactive stories: clues found inside landmarks, questions and reflection' },
  { s: 'done', ar: 'الماضي والحاضر: خطوط زمنية موثّقة، ومحطة الحجاز ١٩٠٨ مقابل اليوم', en: 'Then & Now: documented timelines, and the Hejaz station in 1908 vs today' },
  { s: 'done', ar: 'المرشد السياحي: إجابات من مصادر موثّقة مع روابطها، والاقتراحات منفصلة', en: 'Tourism guide: answers from verified sources with links; suggestions kept separate' },
  { s: 'done', ar: 'مخطّط الزيارة: قصيرة ونصف يوم ويوم كامل، حسب اهتماماتك ووسيلة تنقّلك', en: 'Visit planner: short, half-day and full-day routes by interest and transport' },
  { s: 'done', ar: 'تحديات موسمية ومجموعات موضوعية تُنجز بالاكتشاف الحقيقي فقط', en: 'Seasonal challenges and themed collections completed only by real discoveries' },
  { s: 'done', ar: 'قصة رحلتي: صورك وتواريخك وملاحظاتك، وصورة ملخّص، وفيديو', en: 'My travel story: your photos, dates and notes, a summary image and a video' },
  { s: 'done', ar: 'الذكريات الخاصة، وإعادة عيش الرحلة، والنقاط والإنجازات والجواز والاختبارات', en: 'Private memories, journey replay, points, achievements, passport and quizzes' },
  { s: 'done', ar: 'لوحة الإحصائيات والخط الزمني للرحلة', en: 'Statistics dashboard and journey timeline' },
  { s: 'done', ar: 'الوقت من الشروق إلى الليل، ووقت المدينة الحقيقي، وظلال متحركة', en: 'Sunrise to night, live Madinah time, moving shadows' },
  { s: 'done', ar: 'بياناتي: نسخة احتياطية في ملف، واستيراد، ونقاط استرجاع تلقائية', en: 'My data: backup file export, import and automatic restore points' },
  { s: 'done', ar: 'خصوصية أولًا: لا يُرفع شيء إلا بموافقتك، والصور لا تغادر جهازك', en: 'Privacy first: nothing is uploaded without your consent; photos stay on your device' },
  { s: 'done', ar: 'جودة رسوم تتكيّف مع جهازك وتنخفض تلقائيًا إن تباطأت الحركة', en: 'Graphics quality that adapts to your device and steps down if it slows' },
  { s: 'done', ar: 'سهولة الاستخدام: حجم النص، وتقليل الحركة، وترجمة نصية للصوت', en: 'Accessibility: text size, reduced motion, captions for audio' },
  { s: 'done', ar: 'يعمل دون اتصال بعد فتحه، مع قائمة بما يحتاج إنترنت', en: 'Keeps working offline once open, with a list of what needs internet' },
  // partially implemented
  { s: 'partial', ar: 'إجابات المرشد المصاغة بواسطة Claude', en: 'Guide answers written by Claude', noteAr: 'تعمل فقط حين تُفتح اللعبة داخل Claude وتسمح بذلك، وتستهلك من استخدامك. تُعرض دائمًا مع البطاقات الموثّقة التي استندت إليها.', noteEn: 'Only when the game is opened inside Claude and you allow it; uses your Claude usage. Always shown with the verified cards it cites.' },
  { s: 'partial', ar: 'إعادة فتح اللعبة دون اتصال', en: 'Re-opening the game offline', noteAr: 'متاحة حين تُستضاف اللعبة على موقعها الخاص؛ داخل Claude يعتمد ذلك على المضيف', noteEn: 'Works when the game is hosted on its own website; inside Claude it depends on the host' },
  { s: 'partial', ar: 'التحقق من الزيارة (QR والموقع)', en: 'Visit check-in (QR & location)', noteAr: 'رموز QR الحالية تجريبية وثابتة، ووضع التجربة مفعّل افتراضيًا؛ الموقع يحتاج استضافة خاصة', noteEn: 'Current QR codes are fixed demo codes and demo mode is on by default; location needs own hosting' },
  { s: 'partial', ar: 'مواضع بعض الأماكن على الخريطة', en: 'Some map positions', noteAr: 'أحد عشر مكانًا موضعها تقريبي (مثل سوق التمور ومحطة القطار وممشى العقيق) ومعلَّمة بـ ≈', noteEn: 'Eleven places have approximate positions (e.g. the dates market, the railway station, the Aqiq walkway), marked ≈' },
  { s: 'partial', ar: 'أزمنة التنقل والمسافات في المخطّط', en: 'Planner travel times and distances', noteAr: 'تقديرات (خط مستقيم × ١٫٣٥)، والاتجاهات الفعلية عبر خرائط Google', noteEn: 'Estimates (straight line × 1.35); real directions via Google Maps' },
  { s: 'partial', ar: 'الدليل الصوتي بالعربية والإنجليزية', en: 'Arabic & English audio guide', noteAr: 'يستخدم صوت الجهاز؛ جودته وتوفّره يختلفان', noteEn: 'Uses the device voice; quality and availability vary' },
  { s: 'partial', ar: 'زيارة مدن الأصدقاء', en: 'Visiting friends’ cities', noteAr: 'بين من تُشارَك معهم هذه الصفحة؛ النشر يتطلب صلاحية مساهم', noteEn: 'Among people this page is shared with; publishing needs contributor access' },
  { s: 'partial', ar: 'النسخة السحابية الخاصة وحفظ الملفات', en: 'Private cloud backup and saving files', noteAr: 'تعتمد على ما يتيحه المكان الذي تُفتح فيه اللعبة', noteEn: 'Depend on what the place hosting the game allows' },
  // visual demonstrations
  { s: 'visual', ar: 'السيارات والمشاة والطيور', en: 'Cars, pedestrians and birds', noteAr: 'حركة جمالية، وليست بيانات حقيقية', noteEn: 'Ambient animation, not live data' },
  { s: 'visual', ar: 'الطقس (غائم، مطر خفيف)', en: 'Weather (cloudy, light rain)', noteAr: 'مؤثر تختاره أنت، وليس طقس المدينة الفعلي', noteEn: 'An effect you choose, not Madinah’s real weather' },
  { s: 'visual', ar: 'التضاريس: الحرّات وجبل عير ووادي العقيق والطرق الدائرية', en: 'Terrain: lava fields, Mount Ayr, Wadi al-Aqiq and the ring roads', noteAr: 'رسم رمزي في مواضع تقريبية، وليس مسحًا جغرافيًا', noteEn: 'Drawn symbolically at approximate positions, not a survey' },
  { s: 'visual', ar: 'المظلات تنطوي ليلًا وتنفتح نهارًا', en: 'Umbrellas fold at night and open by day', noteAr: 'تمثيل عام لعمل المظلات، وليس جدولها الفعلي', noteEn: 'A general depiction, not their actual schedule' },
  // planned
  { s: 'planned', ar: 'الواقع المعزز عبر الكاميرا', en: 'Camera AR', noteAr: 'البنية وعارض النموذج جاهزان', noteEn: 'Architecture and model viewer are ready' },
  { s: 'planned', ar: 'صور تاريخية مرخّصة في «الماضي والحاضر»', en: 'Licensed historical photos in Then & Now', noteAr: 'المكان جاهز في ملفات المحتوى (مع ذكر المصدر والترخيص)', noteEn: 'Ready in the content files (with credit and licence)' },
  { s: 'planned', ar: 'تسجيلات صوتية احترافية للدليل', en: 'Studio narration for the audio guide' },
  { s: 'planned', ar: 'استكشاف جماعي في الوقت نفسه', en: 'Real-time multiplayer exploration' },
  { s: 'planned', ar: 'خادم خاص: مشاركة عامة وتحقق من الزيارة لا يُزوَّر', en: 'Own backend: public sharing and tamper-proof check-ins' },
]
const BADGE: Record<Status, { icon: string; ar: string; en: string; cls: string }> = {
  done: { icon: '✅', ar: 'مكتمل', en: 'Implemented', cls: 'bg-pine-700 text-sand-50' },
  partial: { icon: '🟡', ar: 'جزئي', en: 'Partial', cls: 'bg-gold-300 text-pine-950' },
  visual: { icon: '🎨', ar: 'عرض بصري', en: 'Visual only', cls: 'bg-sky-700/15 text-sky-900' },
  planned: { icon: '🗓️', ar: 'مخطّط', en: 'Planned', cls: 'bg-ink-900/10 text-ink-700' },
}

export function FeatureStatus() {
  const open = useGame((s) => s.panel === 'features')
  const lang = useGame((s) => s.lang)
  if (!open) return null
  return (
    <Modal open onClose={() => useGame.getState().setUi({ panel: null })} title={lang === 'ar' ? 'حالة الميزات' : 'Feature status'} z={76}>
      <div className="space-y-1.5 pb-2">
        {FEATURES.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-2xl bg-white p-2.5 ring-1 ring-ink-900/5">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[calc(10.5px*var(--fs))] font-bold ${BADGE[f.s].cls}`}>{BADGE[f.s].icon} {BADGE[f.s][lang]}</span>
            <div className="min-w-0 text-[calc(13px*var(--fs))]">
              <div className="font-semibold">{lang === 'ar' ? f.ar : f.en}</div>
              {(f.noteAr || f.noteEn) && <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{lang === 'ar' ? f.noteAr : f.noteEn}</div>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export function ContentPolicy() {
  const open = useGame((s) => s.panel === 'content')
  const lang = useGame((s) => s.lang)
  if (!open) return null
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const points = lang === 'ar'
    ? [
        'كل تاريخ أو رقم أو حدث في اللعبة مأخوذ من مصادر مذكورة تحت كل معلم وكل مقتنى، ولا تُضاف أحداث مخترعة.',
        'تُوسم المعلومات بـ «معلومة موثّقة»، وتُوسم الأشياء المصمّمة للعب (المجسّمات، المقتنيات الرمزية، البوصلة، شباك التذاكر) بـ «عنصر من اللعبة».',
        'النماذج ثلاثية الأبعاد تمثيلات مبسّطة وليست إعادة بناء دقيقة، ويُذكر ذلك داخل كل معلم.',
        'احترامًا للأماكن الدينية: لا تُصوَّر شخصيات داخل المساجد، ولا تُعرض تفاصيل مقبرة شهداء أحد، وتتوقف الموسيقى تلقائيًا داخل المساجد.',
        'عند اختلاف المصادر (مثل اليوم الدقيق لغزوة أحد) نكتفي بما اتفقت عليه.',
        'الخريطة: اتجاه كل مكان من المسجد النبوي حقيقي، والمسافات مضغوطة؛ والأماكن ذات الموضع التقريبي معلَّمة بـ ≈.',
        'في المسجد النبوي نعرض الساحات والمظلات فقط بلا ألعاب ولا مقتنيات، وفي البقيع السور والمدخل فقط دون القبور.',
        'وسم «الأبرز» ومدد الزيارة وأفضل الأوقات اقتراحات منّا، وليست تقييمات رسمية.',
      ]
    : [
        'Every date, number or event comes from the sources listed under each landmark and collectible; no events are invented.',
        'Facts are labelled “Verified fact”; things designed for play (models, symbolic collectibles, the compass, the ticket window) are labelled “Game element”.',
        '3D models are simplified representations, not accurate reconstructions — stated inside every landmark.',
        'Out of respect for religious sites: no figures are shown inside mosques, the Uhud Martyrs’ Cemetery is not depicted, and music pauses automatically inside mosques.',
        'Where sources differ (e.g. the exact day of the Battle of Uhud) we keep only what they agree on.',
        'The map: each place’s direction from the Prophet’s Mosque is real and distances are compressed; places with approximate positions are marked ≈.',
        'At the Prophet’s Mosque we show only the plazas and umbrellas, with no games or collectibles; at al-Baqi only the wall and entrance, no graves.',
        '“Top picks”, visit lengths and best times are our suggestions, not official ratings.',
      ]
  return (
    <Modal open onClose={() => useGame.getState().setUi({ panel: null })} title={L('دقّة المحتوى والمصادر', 'Content accuracy & sources')} z={76}>
      <div className="space-y-3 pb-2">
        <ul className="space-y-2">{points.map((p, i) => <li key={i} className="flex gap-2 text-[calc(13.5px*var(--fs))] leading-relaxed"><span className="text-gold-600">◆</span><span>{p}</span></li>)}</ul>
        {LANDMARKS.map((l) => <SourceList key={l.id} sources={LANDMARK_SOURCES[l.id]} title={l.name[lang]} />)}
        {PLACES.map((p) => <SourceList key={p.id} sources={p.sources} title={p.name[lang]} />)}
      </div>
    </Modal>
  )
}

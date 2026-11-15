import { useGame, useT } from '../state/gameStore'
import { LANDMARK_MAP, hasInterior } from '../data/landmarks'
import { enterLabel } from './LandmarkSheet'
import { fmtDate } from '../lib/format'
import { enterBuilding } from '../state/director'
import { Btn } from './components/Sheet'
import { Icon } from './components/Icon'
import { LandmarkEmblem } from './components/LandmarkEmblem'

export function CelebrationCard() {
  const t = useT()
  const id = useGame((s) => s.celebrate)
  const lang = useGame((s) => s.lang)
  const visit = useGame((s) => (id ? s.progress[id]?.visitDate : undefined))
  const show = useGame((s) => !!s.celebrate && s.mode === 'city' && s.tab === 'city' && !s.replay.active && !s.placeFor && !s.sheetOpen)
  if (!show || !id) return null
  const lm = LANDMARK_MAP[id]
  const close = () => useGame.getState().setUi({ celebrate: null })
  return (
    <div className="absolute inset-x-0 bottom-[96px] z-[55] flex justify-center px-4 safe-x" onPointerDown={(e) => e.stopPropagation()}>
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-gradient-to-br from-pine-800 to-pine-950 p-5 text-sand-50 shadow-2xl ring-1 ring-gold-400/40 anim-pop">
        <div className="pattern-geo absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-dashed border-gold-400 anim-stamp">
              <LandmarkEmblem id={id} size={44} tone="gold" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[calc(12px*var(--fs))] font-semibold text-gold-300">{lm.alwaysBuilt ? (lang === 'ar' ? 'سُجّلت زيارتك' : 'Visit recorded') : t('built')} · +100</div>
            <div className="font-display text-[calc(22px*var(--fs))] font-semibold leading-tight">{lm.name[lang]}</div>
            <div className="text-[calc(12.5px*var(--fs))] text-sand-200/80">{lm.alwaysBuilt ? (lang === 'ar' ? 'أُضيفت إلى جوازك' : 'Added to your passport') : t('addedToCity')}<span className="mx-1.5 opacity-40">|</span>{fmtDate(visit, lang)}</div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          {hasInterior(id)
            ? <Btn tone="gold" className="px-2 text-[calc(14px*var(--fs))]" onClick={() => { close(); enterBuilding(id) }}><Icon name="door" size={17} /> {enterLabel(id, lang)}</Btn>
            : <Btn tone="gold" className="px-2 text-[calc(14px*var(--fs))]" onClick={() => { close(); useGame.getState().setUi({ quizFor: id }) }}>❓ {lang === 'ar' ? 'اختبر معلوماتك' : 'Take the quiz'}</Btn>}
          <Btn tone="light" className="px-2 text-[calc(14px*var(--fs))]" onClick={() => { close(); useGame.getState().setUi({ composer: { landmarkId: id } }) }}><Icon name="camera" size={17} /> {t('addMemory')}</Btn>
        </div>
        <button onClick={close} className="relative mt-2 w-full py-1.5 text-[calc(13px*var(--fs))] text-sand-200/80">{t('later')}</button>
      </div>
    </div>
  )
}

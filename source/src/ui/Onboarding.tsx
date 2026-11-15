import { useGame, useT } from '../state/gameStore'
import { Icon } from './components/Icon'
import { Btn } from './components/Sheet'
import { sfx } from '../lib/sfx'

export function Onboarding() {
  const t = useT()
  const onboarded = useGame((s) => s.onboarded)
  const lang = useGame((s) => s.lang)
  const s = useGame.getState
  if (onboarded) return null
  const steps = [
    { icon: 'gps' as const, text: t('onboard1') },
    { icon: 'qr' as const, text: t('onboard2') },
    { icon: 'door' as const, text: t('onboard3') },
  ]
  return (
    <div className="fixed inset-0 z-[95] flex flex-col justify-end bg-gradient-to-b from-pine-950/30 via-pine-900/80 to-pine-950 text-sand-50 safe-bottom safe-x anim-fade">
      <div className="absolute end-4 top-0 safe-top">
        <button onClick={() => s().setLang(lang === 'ar' ? 'en' : 'ar')} className="btn-press mt-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold">
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>
      <div className="mx-auto w-full max-w-md px-6 pb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3 py-1 text-[calc(12px*var(--fs))] font-semibold text-gold-300">
          <Icon name="sparkle" size={14} /> {lang === 'ar' ? 'المدينة المنورة' : 'Al Madinah'}
        </div>
        <h1 className="font-display text-[calc(44px*var(--fs))] font-bold leading-[1.1]">
          <span className="gold-text">{lang === 'ar' ? 'مدينتي بعيوني' : 'My City, My Story'}</span>
        </h1>
        <div className="mt-1 text-[calc(15px*var(--fs))] text-sand-200/80">{lang === 'ar' ? 'My City, My Story' : 'مدينتي بعيوني'}</div>
        <p className="mt-4 text-[calc(17px*var(--fs))] leading-relaxed text-sand-100">{t('appTagline')}</p>
        <ol className="mt-6 space-y-3">
          {steps.map((x, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 anim-rise" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-400/20 text-gold-300"><Icon name={x.icon} size={20} /></span>
              <span className="text-[calc(14.5px*var(--fs))] leading-snug">{x.text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[calc(12.5px*var(--fs))] text-sand-200/70">{t('demoNotice')}</p>
        <Btn tone="gold" full className="mt-5 py-4 text-[calc(17px*var(--fs))]" onClick={() => { sfx.unlockAudio(); sfx.success(s().soundOn); s().finishOnboarding() }}>
          {t('start')} <Icon name={lang === 'ar' ? 'back' : 'chevron'} size={18} />
        </Btn>
      </div>
    </div>
  )
}

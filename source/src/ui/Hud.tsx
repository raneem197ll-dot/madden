import { useGame, usePoints, useT, useUnlockedCount, useCompletion, type Tab } from '../state/gameStore'
import { phaseOf } from '../three/shared/environment'
import { LANDMARK_IDS } from '../data/landmarks'
import { num, pct } from '../lib/format'
import { Icon, type IconName } from './components/Icon'
import { ProgressRing } from './components/Sheet'
import { startReplay } from '../state/director'
import { sfx } from '../lib/sfx'

export function TopHud() {
  const t = useT()
  const lang = useGame((s) => s.lang)
  const hour = useGame((s) => s.hour)
  const demo = useGame((s) => s.demoMode)
  const points = usePoints()
  const unlocked = useUnlockedCount()
  const completion = useCompletion()
  const total = LANDMARK_IDS.length
  const s = useGame.getState
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 safe-top safe-x px-3">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-[22px] glass-dark px-3 py-2.5 text-sand-50 shadow-xl shadow-pine-950/30">
        <button onClick={() => { s().setTab('achievements'); s().setUi({ achTab: 'stats' }) }} aria-label={t('cityProgress')}>
          <ProgressRing value={completion / 100} size={48}>
            <span className="text-[calc(11px*var(--fs))] font-bold leading-none">{pct(completion, lang)}</span>
          </ProgressRing>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[calc(17px*var(--fs))] font-semibold leading-tight">{t('appName')}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[calc(11.5px*var(--fs))] text-sand-200/90">
            <span>{lang === 'ar' ? 'المعالم' : 'Landmarks'} {num(unlocked, lang)}/{num(total, lang)}</span>
            <span className="opacity-40">•</span>
            <span className="font-semibold text-gold-300">{num(points, lang)} {t('points')}</span>
            {demo && <span className="rounded-full bg-gold-400/20 px-1.5 py-px text-[calc(10px*var(--fs))] font-bold text-gold-300">{t('demo')}</span>}
          </div>
        </div>
        <HudBtn icon="sun" label={phaseOf(hour)[lang]} emoji={phaseOf(hour).icon} onClick={() => { s().setUi({ panel: 'env' }); sfx.tap(s().soundOn) }} />
        <HudBtn icon="globe" label={lang === 'ar' ? 'EN' : 'ع'} onClick={() => s().setLang(lang === 'ar' ? 'en' : 'ar')} text />
        <HudBtn icon="settings" label={t('settings')} onClick={() => s().setUi({ settingsOpen: true })} />
      </div>
    </div>
  )
}

function HudBtn({ icon, label, onClick, text, emoji }: { icon: IconName; label: string; onClick: () => void; text?: boolean; emoji?: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="btn-press grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-sand-50">
      {emoji ? <span className="text-[calc(18px*var(--fs))] leading-none">{emoji}</span> : text ? <span className="text-[calc(13px*var(--fs))] font-bold">{label}</span> : <Icon name={icon} size={19} />}
    </button>
  )
}

export function ReplayButton() {
  const t = useT()
  const sheetOpen = useGame((s) => s.sheetOpen)
  if (sheetOpen) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[92px] z-20 flex justify-center px-4 safe-x">
      <button
        onClick={() => { sfx.unlockAudio(); startReplay() }}
        className="pointer-events-auto btn-press anim-pulse flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-3 text-[calc(15px*var(--fs))] font-bold text-pine-950 shadow-xl shadow-pine-950/30"
      >
        <Icon name="play" size={17} fill />
        {t('replay')}
      </button>
    </div>
  )
}

const TABS: { id: Tab; icon: IconName; key: 'navCity' | 'navExplore' | 'navPassport' | 'navMemories' | 'navAchievements' }[] = [
  { id: 'city', icon: 'city', key: 'navCity' },
  { id: 'explore', icon: 'compass', key: 'navExplore' },
  { id: 'passport', icon: 'passport', key: 'navPassport' },
  { id: 'memories', icon: 'image', key: 'navMemories' },
  { id: 'achievements', icon: 'trophy', key: 'navAchievements' },
]

export function BottomNav() {
  const t = useT()
  const tab = useGame((s) => s.tab)
  const setTab = useGame((s) => s.setTab)
  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 safe-bottom safe-x px-3 pt-1">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between rounded-[24px] glass-dark p-1.5 shadow-2xl shadow-pine-950/40">
        {TABS.map((x) => {
          const on = tab === x.id
          return (
            <button
              key={x.id}
              onClick={() => { setTab(x.id); sfx.tap(useGame.getState().soundOn) }}
              className={`btn-press relative flex flex-1 flex-col items-center gap-0.5 rounded-[18px] py-2 text-[calc(10.5px*var(--fs))] font-semibold transition-colors ${on ? 'bg-sand-50 text-pine-800' : 'text-sand-100/80'}`}
              aria-current={on ? 'page' : undefined}
            >
              <Icon name={x.icon} size={21} stroke={on ? 2.1 : 1.7} />
              <span className="leading-tight">{t(x.key)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[86px] z-[90] flex flex-col items-center gap-2 px-4 safe-x">
      {toasts.map((x) => (
        <button
          key={x.id}
          onClick={() => dismiss(x.id)}
          className={`pointer-events-auto anim-toast flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-start shadow-xl ${x.kind === 'achievement' ? 'bg-gradient-to-br from-pine-800 to-pine-950 text-sand-50 ring-1 ring-gold-400/60' : x.kind === 'error' ? 'bg-red-800 text-white' : 'glass text-ink-900'}`}
        >
          {x.icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${x.kind === 'achievement' ? 'bg-gold-400/20' : 'bg-pine-800/8'}`}>{x.icon}</span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[calc(14px*var(--fs))] font-bold leading-snug">{x.title}</span>
            {x.body && <span className={`block text-[calc(12.5px*var(--fs))] ${x.kind === 'achievement' ? 'text-gold-300' : 'text-ink-500'}`}>{x.body}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

export function FadeOverlay() {
  const fade = useGame((s) => s.fade)
  const lang = useGame((s) => s.lang)
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-gradient-to-b from-sand-100 to-sand-300 transition-opacity duration-500"
      style={{ opacity: fade.on ? 1 : 0 }}
    >
      {fade.label && (
        <div className="text-center">
          <div className="pattern-geo mx-auto mb-4 h-16 w-16 rounded-2xl bg-pine-800/90" />
          <div className="font-display text-3xl font-semibold text-pine-800">{fade.label[lang]}</div>
        </div>
      )}
    </div>
  )
}

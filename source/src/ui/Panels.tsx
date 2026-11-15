import { useEffect, useState, type ReactNode } from 'react'
import { useGame } from '../state/gameStore'
import { LANDMARKS } from '../data/landmarks'
import type { LandmarkId, TimeMode, Weather } from '../data/types'
import { PHASES, phaseOf, madinahHour } from '../three/shared/environment'
import { env } from '../three/shared/env'
import { audio } from '../lib/audio'
import { Icon, type IconName } from './components/Icon'
import { Toggle } from './components/Sheet'

/** Small anchored popover sheet used by the map tools. */
export function Popover({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[62]" onPointerDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-x-3 bottom-[96px] mx-auto max-w-md rounded-[26px] bg-sand-50 p-4 shadow-2xl anim-rise md:bottom-auto md:end-20 md:start-auto md:top-[96px] md:w-[360px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-[calc(17px*var(--fs))] font-semibold text-pine-900">{title}</div>
          <button onClick={onClose} className="btn-press grid h-8 w-8 place-items-center rounded-full bg-ink-900/6" aria-label="close"><Icon name="x" size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`btn-press flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[calc(12px*var(--fs))] font-semibold ${on ? 'bg-pine-800 text-sand-50' : 'bg-white text-ink-700 ring-1 ring-ink-900/8'}`}>
      {children}
    </button>
  )
}

const fmtHour = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`

export function EnvPanel() {
  const open = useGame((s) => s.panel === 'env')
  const lang = useGame((s) => s.lang)
  const hour = useGame((s) => s.hour)
  const mode = useGame((s) => s.timeMode)
  const weather = useGame((s) => s.weather)
  const quality = useGame((s) => s.quality)
  const tier = useGame((s) => s.tier)
  const g = useGame.getState
  const [now, setNow] = useState(env.hour)
  useEffect(() => { if (!open) return; const i = setInterval(() => setNow(env.hour), 500); return () => clearInterval(i) }, [open])
  const ph = phaseOf(mode === 'manual' ? hour : now)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  return (
    <Popover open={open} onClose={() => g().setUi({ panel: null })} title={L('الوقت والطقس', 'Time & weather')}>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {PHASES.map((p) => (
            <Chip key={p.id} on={mode === 'manual' && ph.id === p.id} onClick={() => g().setHour(p.hour)}>
              <span className="text-lg">{p.icon}</span>{lang === 'ar' ? p.ar : p.en}
            </Chip>
          ))}
        </div>
        <div>
          <input
            type="range" min={0} max={23.9} step={0.1} value={mode === 'manual' ? hour : now}
            onChange={(e) => g().setHour(Number(e.target.value))}
            className="w-full accent-[#c9a24a]" aria-label={L('الساعة', 'Hour')}
          />
          <div className="flex justify-between text-[calc(11.5px*var(--fs))] text-ink-500"><span>00:00</span><span className="font-bold text-pine-800">{fmtHour(mode === 'manual' ? hour : now)}</span><span>24:00</span></div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {([['manual', '🎛️', 'يدوي', 'Manual'], ['live', '🕰️', 'وقت المدينة', 'Madinah time'], ['cycle', '🔄', 'دورة يوم', 'Day cycle']] as [TimeMode, string, string, string][]).map(([m, i, ar, en]) => (
            <Chip key={m} on={mode === m} onClick={() => g().setPrefs({ timeMode: m, ...(m === 'live' ? { hour: madinahHour() } : {}) })}><span className="text-base">{i}</span>{L(ar, en)}</Chip>
          ))}
        </div>
        <div className="text-[calc(12.5px*var(--fs))] font-semibold text-ink-500">{L('الطقس', 'Weather')}</div>
        <div className="grid grid-cols-3 gap-1.5">
          {([['clear', '☀️', 'صافٍ', 'Clear'], ['cloudy', '⛅', 'غائم', 'Cloudy'], ['rain', '🌧️', 'مطر خفيف', 'Light rain']] as [Weather, string, string, string][]).map(([w, i, ar, en]) => (
            <Chip key={w} on={weather === w} onClick={() => g().setPrefs({ weather: w })}><span className="text-base">{i}</span>{L(ar, en)}</Chip>
          ))}
        </div>
        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink-900/5">
          <div className="text-[calc(13.5px*var(--fs))] font-semibold">{L('جودة الرسوم', 'Graphics quality')}</div>
          <div className="text-[calc(11.5px*var(--fs))] text-ink-500">{L('«تلقائي» يختار حسب جهازك ويخفّض الجودة إن تباطأت الحركة.', '“Auto” picks for your device and steps down if the frame rate drops.')}</div>
          <div className="mt-1.5 flex rounded-xl bg-ink-900/6 p-1" role="radiogroup" aria-label={L('جودة الرسوم', 'Graphics quality')}>
            {(['auto', 'high', 'medium', 'low'] as const).map((q) => (
              <button key={q} role="radio" aria-checked={quality === q} onClick={() => g().setPrefs({ quality: q })} className={`btn-press flex-1 rounded-lg px-1.5 py-1 text-[calc(12px*var(--fs))] font-semibold ${quality === q ? 'bg-pine-800 text-sand-50' : 'text-ink-700'}`}>{q === 'auto' ? L('تلقائي', 'Auto') : q === 'high' ? L('عالية', 'High') : q === 'medium' ? L('متوسطة', 'Medium') : L('منخفضة', 'Low')}</button>
            ))}
          </div>
          <div className="mt-1 text-[calc(11px*var(--fs))] text-ink-500">{L('المستخدم الآن: ', 'In use now: ')}{tier === 'high' ? L('عالية (ظلال)', 'high (shadows)') : tier === 'medium' ? L('متوسطة', 'medium') : L('منخفضة (موفّرة)', 'low (battery saver)')}</div>
        </div>
      </div>
    </Popover>
  )
}

function Slider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return <input type="range" min={0} max={1} step={0.05} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-24 accent-[#1b6b51] disabled:opacity-40" />
}

export function AudioPanel() {
  const open = useGame((s) => s.panel === 'audio')
  const lang = useGame((s) => s.lang)
  const a = useGame((s) => s.audio)
  const soundOn = useGame((s) => s.soundOn)
  const g = useGame.getState
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const Row = ({ icon, label, desc, children }: { icon: string; label: string; desc?: string; children: ReactNode }) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink-900/5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-lg">{icon}</span>
        <div className="min-w-0"><div className="text-[calc(13.5px*var(--fs))] font-semibold">{label}</div>{desc && <div className="text-[calc(11.5px*var(--fs))] leading-snug text-ink-500">{desc}</div>}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
  return (
    <Popover open={open} onClose={() => g().setUi({ panel: null })} title={L('الصوت', 'Audio')}>
      <div className="space-y-2">
        <Row icon="🔊" label={L('كل الأصوات', 'All sound')}><Toggle on={a.master} onChange={(v) => { audio.ensure(); g().setAudio({ master: v }) }} /></Row>
        <Row icon="🌬️" label={L('أصوات المكان', 'Ambience')} desc={L('رياح وطيور نهارًا وصراصير ليلًا ومطر', 'Wind, birds by day, crickets at night, rain')}>
          <Slider value={a.ambientVol} disabled={!a.ambient} onChange={(v) => g().setAudio({ ambientVol: v })} />
          <Toggle on={a.ambient} onChange={(v) => { audio.ensure(); g().setAudio({ ambient: v }) }} />
        </Row>
        <Row icon="🎵" label={L('موسيقى هادئة', 'Background music')} desc={L('مقام الحجاز — تتوقف تلقائيًا داخل المساجد', 'Hijaz scale — pauses automatically inside mosques')}>
          <Slider value={a.musicVol} disabled={!a.music} onChange={(v) => g().setAudio({ musicVol: v })} />
          <Toggle on={a.music} onChange={(v) => { audio.ensure(); g().setAudio({ music: v }) }} />
        </Row>
        <Row icon="✨" label={L('المؤثرات', 'Sound effects')}><Toggle on={soundOn} onChange={(v) => { audio.ensure(); g().setPrefs({ soundOn: v, audio: { ...g().audio, sfx: v } }) }} /></Row>
        <Row icon="🎧" label={L('لغة الدليل الصوتي', 'Audio-guide language')}>
          <div className="flex rounded-xl bg-ink-900/6 p-1">
            {(['ar', 'en'] as const).map((l) => (
              <button key={l} onClick={() => g().setAudio({ voiceLang: l })} className={`btn-press rounded-lg px-2.5 py-1 text-[calc(12px*var(--fs))] font-semibold ${a.voiceLang === l ? 'bg-pine-800 text-sand-50' : 'text-ink-700'}`}>{l === 'ar' ? 'عربي' : 'EN'}</button>
            ))}
          </div>
        </Row>
      </div>
    </Popover>
  )
}

/** Vertical map toolbar on the city screen. */
export function MapTools() {
  const lang = useGame((s) => s.lang)
  const showRoutes = useGame((s) => s.showRoutes)
  const hour = useGame((s) => s.hour)
  const mode = useGame((s) => s.timeMode)
  const muted = useGame((s) => !s.audio.master)
  const sheetOpen = useGame((s) => s.sheetOpen)
  const visiting = useGame((s) => !!s.visiting)
  const g = useGame.getState
  const [focusIdx, setFocusIdx] = useState(-1)
  if (sheetOpen) return null
  const ph = phaseOf(mode === 'manual' ? hour : env.hour)
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const Btn = ({ icon, emoji, label, on, onClick }: { icon?: IconName; emoji?: string; label: string; on?: boolean; onClick: () => void }) => (
    <button onClick={onClick} title={label} aria-label={label} className={`btn-press grid h-11 w-11 place-items-center rounded-2xl shadow-lg ${on ? 'bg-gold-400 text-pine-950' : 'glass-dark text-sand-50'}`}>
      {emoji ? <span className="text-[calc(19px*var(--fs))] leading-none">{emoji}</span> : <Icon name={icon!} size={20} />}
    </button>
  )
  const nextFocus = () => {
    const i = (focusIdx + 1) % LANDMARKS.length
    setFocusIdx(i)
    g().camTo('focus', LANDMARKS[i].id as LandmarkId)
    g().toast({ kind: 'info', icon: '🎯', title: LANDMARKS[i].name[lang] })
  }
  return (
    <div className={`pointer-events-none absolute end-3 z-20 ${visiting ? 'top-[168px]' : 'top-[104px]'}`}>
      {/* wraps into a second column on short screens instead of running under the bottom bar */}
      <div className={`pointer-events-auto flex flex-col flex-wrap content-start gap-2 ${visiting ? 'max-h-[calc(100dvh-168px-150px)]' : 'max-h-[calc(100dvh-104px-150px)]'}`}>
        <Btn icon="city" label={L('عرض المدينة كاملة', 'Whole city')} onClick={() => { setFocusIdx(-1); g().camTo('home') }} />
        <Btn icon="route" label={L('مسارات التنقل', 'Navigation paths')} on={showRoutes} onClick={() => g().setPrefs({ showRoutes: !showRoutes })} />
        <Btn emoji="🎯" label={L('تركيز على معلم', 'Focus a landmark')} onClick={nextFocus} />
        <Btn emoji={ph.icon} label={L('الوقت والطقس', 'Time & weather')} onClick={() => g().setUi({ panel: 'env' })} />
        <Btn icon={muted ? 'mute' : 'sound'} label={L('الصوت', 'Audio')} onClick={() => { audio.ensure(); g().setUi({ panel: 'audio' }) }} />
        <Btn icon="share" label={L('مشاركة مدينتي', 'Share my city')} onClick={() => g().setUi({ panel: 'share' })} />
        <Btn emoji="🧭" label={L('المرشد السياحي', 'Tourism guide')} onClick={() => g().setUi({ panel: 'guide' })} />
      </div>
    </div>
  )
}

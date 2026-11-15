import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Centered modal (desktop) / bottom sheet (mobile). Accessible dialog: Escape closes, focus moves in and back. */
export function Modal(props: { open: boolean; onClose?: () => void; children: ReactNode; title?: ReactNode; wide?: boolean; dark?: boolean; z?: number }) {
  if (!props.open) return null
  return <ModalBody {...props} />
}

function ModalBody({ onClose, children, title, wide = false, dark = false, z = 60 }: { onClose?: () => void; children: ReactNode; title?: ReactNode; wide?: boolean; dark?: boolean; z?: number }) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    // focus the dialog itself so screen readers announce it; Tab then moves inside
    box.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) { e.stopPropagation(); closeRef.current() }
      if (e.key === 'Tab' && box.current) {
        const f = box.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([type="hidden"]):not(.hidden), select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.({ preventScroll: true }) }
  }, [])
  const lang = typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ar'
  return (
    <div className="fixed inset-0 flex items-end justify-center sm:items-center anim-fade" style={{ zIndex: z }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-pine-950/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? id : undefined}
        tabIndex={-1}
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] shadow-2xl anim-rise safe-bottom outline-none ${dark ? 'bg-pine-900 text-sand-50' : 'bg-sand-50 text-ink-900'}`}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <h2 id={id} className="min-w-0 flex-1 font-display text-lg font-semibold">{title}</h2>
            {onClose && (
              <button onClick={onClose} className={`btn-press grid h-10 w-10 place-items-center rounded-full ${dark ? 'bg-white/10' : 'bg-ink-900/5'}`} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}>
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="scroll-y min-h-0 flex-1 px-5 pb-4">{children}</div>
      </div>
    </div>
  )
}

export function Pill({ children, tone = 'sand', className = '' }: { children: ReactNode; tone?: 'sand' | 'green' | 'gold' | 'dark'; className?: string }) {
  const t = {
    sand: 'bg-sand-200 text-ink-700',
    green: 'bg-pine-700 text-sand-50',
    gold: 'bg-gold-400/25 text-gold-600',
    dark: 'bg-white/12 text-sand-100',
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[calc(11px*var(--fs))] font-semibold ${t} ${className}`}>{children}</span>
}

export function Btn({ children, onClick, tone = 'primary', className = '', disabled, full }: { children: ReactNode; onClick?: () => void; tone?: 'primary' | 'gold' | 'ghost' | 'outline' | 'danger' | 'light'; className?: string; disabled?: boolean; full?: boolean }) {
  const t = {
    primary: 'bg-pine-800 text-sand-50 shadow-lg shadow-pine-900/20',
    gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-pine-950 shadow-lg shadow-gold-600/25',
    ghost: 'bg-ink-900/5 text-ink-900',
    outline: 'border border-pine-800/20 text-pine-800 bg-white/60',
    danger: 'bg-red-700 text-white',
    light: 'bg-white/14 text-sand-50 border border-white/15',
  }[tone]
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`btn-press inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[calc(15px*var(--fs))] font-semibold disabled:opacity-40 ${full ? 'w-full' : ''} ${t} ${className}`}
    >
      {children}
    </button>
  )
}

export function ProgressRing({ value, size = 46, stroke = 4.5, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.18)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#gold-grad)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.34,1.56,.64,1)' }}
        />
        <defs>
          <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ecd594" />
            <stop offset="1" stopColor="#c9a24a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`btn-press relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-pine-600' : 'bg-ink-900/20'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'start-[22px]' : 'start-0.5'}`} />
    </button>
  )
}

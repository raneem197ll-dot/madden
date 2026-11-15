import type { ReactNode } from 'react'
import { useGame } from '../../state/gameStore'

/** Selectable chip (toggle button) with proper pressed state for screen readers. */
export function ChoiceChip({ on, onClick, children, className = '' }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button aria-pressed={on} onClick={onClick} className={`btn-press rounded-full px-3 py-1.5 text-[calc(12.5px*var(--fs))] font-semibold ${on ? 'bg-pine-800 text-sand-50' : 'bg-white text-ink-700 ring-1 ring-ink-900/10'} ${className}`}>
      {children}
    </button>
  )
}

/** Labels that separate kinds of information: verified history vs suggestions vs estimates vs illustrations. */
export function KindBadge({ kind, onDark = false }: { kind: 'fact' | 'suggestion' | 'estimate' | 'illustrative' | 'ai'; onDark?: boolean }) {
  const ar = useGame((s) => s.lang) === 'ar'
  const map = {
    fact: ['bg-pine-700 text-sand-50', '✔', 'معلومة موثّقة', 'Verified fact'],
    suggestion: ['bg-sky-700/12 text-sky-900 ring-1 ring-sky-800/20', '💡', 'اقتراح', 'Suggestion'],
    estimate: ['bg-ink-900/8 text-ink-700', '≈', 'تقدير', 'Estimate'],
    illustrative: ['bg-gold-400/25 text-gold-600', '🎨', 'تصوّر توضيحي', 'Illustrative'],
    ai: ['bg-violet-700/10 text-violet-900 ring-1 ring-violet-800/20', '✦', 'ملخّص كتبه Claude', 'Summary by Claude'],
  }[kind]
  if (onDark && (kind === 'suggestion' || kind === 'estimate')) map[0] = kind === 'suggestion' ? 'bg-sky-300/20 text-sky-50 ring-1 ring-sky-200/30' : 'bg-white/15 text-sand-50'
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[calc(10.5px*var(--fs))] font-bold ${map[0]}`}>{map[1]} {ar ? map[2] : map[3]}</span>
}

/** Small "needs internet" marker. */
export function NeedsNet() {
  const ar = useGame((s) => s.lang) === 'ar'
  const online = useGame((s) => s.online)
  return <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[calc(10px*var(--fs))] font-semibold ${online ? 'bg-ink-900/6 text-ink-500' : 'bg-red-600/12 text-red-800'}`}>📶 {ar ? 'يحتاج اتصالًا' : 'Needs internet'}</span>
}

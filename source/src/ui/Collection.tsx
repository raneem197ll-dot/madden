import { useGame } from '../state/gameStore'
import { LANDMARKS, LANDMARK_MAP } from '../data/landmarks'
import { COLLECTIBLES, COLLECTIBLE_MAP, RARITY_LABEL, collectiblesFor, type Collectible, type Source } from '../data/collectibles'
import { fmtDate, num } from '../lib/format'
import { Icon } from './components/Icon'
import { Btn, Modal, Pill } from './components/Sheet'

const RARITY_STYLE: Record<Collectible['rarity'], string> = {
  common: 'from-sand-200 to-sand-300',
  rare: 'from-pine-300/60 to-pine-500/60',
  legendary: 'from-gold-300 to-gold-500',
}

export function SourceList({ sources, title }: { sources: Source[]; title?: string }) {
  const lang = useGame((s) => s.lang)
  return (
    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-ink-900/5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[calc(12px*var(--fs))] font-bold text-pine-800"><Icon name="book" size={14} /> {title ?? (lang === 'ar' ? 'المصادر' : 'Sources')}</div>
      <ul className="space-y-1">
        {sources.map((s) => (
          <li key={s.url} className="text-[calc(12px*var(--fs))] leading-snug">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-pine-700 underline decoration-pine-300 underline-offset-2" dir="ltr">{s.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Verified-vs-game labelling used across info and collectible cards. */
export function TruthBadge({ kind }: { kind: 'verified' | 'game' }) {
  const lang = useGame((s) => s.lang)
  return kind === 'verified'
    ? <Pill tone="green">✔ {lang === 'ar' ? 'معلومة موثّقة' : 'Verified fact'}</Pill>
    : <Pill tone="gold">🎮 {lang === 'ar' ? 'عنصر من اللعبة' : 'Game element'}</Pill>
}

export function CollectionGrid() {
  const lang = useGame((s) => s.lang)
  const disc = useGame((s) => s.discoveries)
  const progress = useGame((s) => s.progress)
  const found = COLLECTIBLES.filter((c) => disc[`hidden:${c.landmark}:${c.id}`]).length
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  return (
    <div className="space-y-4">
      <div className="rounded-[22px] bg-gradient-to-br from-pine-800 to-pine-950 p-4 text-sand-50">
        <div className="flex items-center justify-between">
          <div className="font-display text-[calc(19px*var(--fs))] font-semibold">{L('خزانة مقتنياتي', 'My collection')}</div>
          <div className="font-display text-[calc(20px*var(--fs))] font-bold text-gold-300">{num(found, lang)}/{num(COLLECTIBLES.length, lang)}</div>
        </div>
        <p className="mt-1 text-[calc(12.5px*var(--fs))] leading-relaxed text-sand-100/80">{L('ابحث داخل المعالم عن البريق الخافت. كل مقتنى بطاقة رقمية رمزية تحمل معلومة تاريخية موثّقة بمصدرها.', 'Look for a faint sparkle inside landmarks. Each item is a symbolic digital card carrying a verified historical fact with its source.')}</p>
      </div>
      {LANDMARKS.filter((l) => collectiblesFor(l.id).length > 0).map((l) => (
        <div key={l.id}>
          <div className="mb-2 flex items-center justify-between">
            <div className="font-display text-[calc(16px*var(--fs))] font-semibold text-pine-900">{l.name[lang]}</div>
            {!progress[l.id]?.unlocked && <span className="text-[calc(11.5px*var(--fs))] text-ink-500">🔒 {L('افتح المعلم لتبحث داخله', 'Unlock to search inside')}</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {collectiblesFor(l.id).map((c) => {
              const at = disc[`hidden:${c.landmark}:${c.id}`]
              return (
                <button
                  key={c.id}
                  disabled={!at}
                  onClick={() => useGame.getState().setUi({ collectionView: `${c.landmark}:${c.id}` })}
                  className={`btn-press relative flex aspect-[3/4] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl p-2 text-center ring-1 ${at ? `bg-gradient-to-b ${RARITY_STYLE[c.rarity]} ring-gold-500/30` : 'bg-ink-900/5 ring-ink-900/5'}`}
                >
                  <span className={`text-3xl ${at ? '' : 'opacity-25 grayscale'}`}>{at ? c.icon : '❔'}</span>
                  <span className={`text-[calc(11px*var(--fs))] font-semibold leading-tight ${at ? 'text-pine-950' : 'text-ink-500'}`}>{at ? c.name[lang] : L('لم يُكتشف', 'Undiscovered')}</span>
                  {at && <span className="text-[calc(9.5px*var(--fs))] text-pine-900/70">{RARITY_LABEL[c.rarity][lang]}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CollectibleModal() {
  const key = useGame((s) => s.collectionView)
  const lang = useGame((s) => s.lang)
  const at = useGame((s) => (key ? s.discoveries[`hidden:${key}`] : undefined))
  if (!key) return null
  const c = COLLECTIBLE_MAP[key]
  if (!c) return null
  return <CollectibleCardModal c={c} at={typeof at === 'string' ? at : undefined} onClose={() => useGame.getState().setUi({ collectionView: null })} lang={lang} />
}

export function CollectibleCardModal({ c, at, onClose, lang, fresh }: { c: Collectible; at?: string; onClose: () => void; lang: 'ar' | 'en'; fresh?: boolean }) {
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  return (
    <Modal open onClose={onClose} z={86} title={
      <div className="flex items-center gap-2">
        <span className="text-2xl">{c.icon}</span>
        <div><div>{c.name[lang]}</div><div className="text-[calc(11.5px*var(--fs))] font-normal text-ink-500">{LANDMARK_MAP[c.landmark].name[lang]} · {RARITY_LABEL[c.rarity][lang]}</div></div>
      </div>
    }>
      <div className="space-y-3">
        {fresh && <div className="rounded-2xl bg-gold-300/30 p-2.5 text-center text-[calc(13px*var(--fs))] font-bold text-pine-900">✨ {L('أُضيف إلى مقتنياتك', 'Added to your collection')}</div>}
        <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/5">
          <div className="mb-1.5"><TruthBadge kind="game" /></div>
          <p className="text-[calc(13.5px*var(--fs))] text-ink-700">{c.object[lang]}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-pine-700/20">
          <div className="mb-1.5"><TruthBadge kind="verified" /></div>
          <p className="text-[calc(15px*var(--fs))] leading-[1.85] text-ink-900">{c.fact[lang]}</p>
        </div>
        <SourceList sources={c.sources} />
        {at && <div className="text-center text-[calc(11.5px*var(--fs))] text-ink-500">{L('اكتُشف في', 'Found on')} {fmtDate(at, lang)}</div>}
        <Btn tone="primary" full onClick={onClose}>{L('إغلاق', 'Close')}</Btn>
      </div>
    </Modal>
  )
}

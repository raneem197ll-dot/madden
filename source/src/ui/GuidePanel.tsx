import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/gameStore'
import { Modal, Toggle } from './components/Sheet'
import { KindBadge, NeedsNet } from './components/Bits'
import { Icon } from './components/Icon'
import { KB_MAP, SUGGESTED, answerLocally, answerWithClaude, getSample, GuideError } from '../lib/guide'
import { SPOT_MAP } from '../data/places'
import type { GuideEntry } from '../data/types'
import { uid } from '../lib/format'

const ERR: Record<string, [string, string]> = {
  not_granted: ['لم يُسمح باستخدام Claude لهذه الصفحة — أجبتُ من المصادر المحفوظة.', 'Claude was not allowed for this page — answered from the saved sources.'],
  rate_limited: ['طلبات كثيرة الآن — أجبتُ من المصادر المحفوظة. حاول لاحقًا.', 'Too many requests right now — answered from the saved sources. Try later.'],
  unavailable: ['Claude غير متاح هنا — أجبتُ من المصادر المحفوظة.', 'Claude is not available here — answered from the saved sources.'],
  offline: ['أنت دون اتصال — أجبتُ من المصادر المحفوظة على جهازك.', "You're offline — answered from the sources saved on your device."],
}

function Answer({ e }: { e: GuideEntry }) {
  const lang = useGame((s) => s.lang)
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const cards = e.factIds.map((id) => KB_MAP[id]).filter(Boolean)
  return (
    <div className="space-y-2">
      {e.answer && (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/6">
          <div className="mb-1"><KindBadge kind="ai" /></div>
          <p className="text-[calc(13.5px*var(--fs))] leading-relaxed" dir={e.lang === 'ar' ? 'rtl' : 'ltr'}>{e.answer}</p>
          {cards.length > 0 && <div className="mt-1 text-[calc(11px*var(--fs))] text-ink-500">{L('مبنيّ على البطاقات الموثّقة أدناه فقط.', 'Based only on the verified cards below.')}</div>}
        </div>
      )}
      {cards.map((c) => (
        <article key={c.id} className="rounded-2xl bg-white p-3 ring-1 ring-pine-800/12">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <KindBadge kind="fact" />
            <span className="text-[calc(11px*var(--fs))] font-semibold text-pine-800">{SPOT_MAP[c.landmark]?.name[e.lang]}</span>
          </div>
          <h4 className="text-[calc(13px*var(--fs))] font-bold text-pine-900" dir={e.lang === 'ar' ? 'rtl' : 'ltr'}>{c.title[e.lang]}</h4>
          <p className="mt-0.5 text-[calc(13px*var(--fs))] leading-relaxed text-ink-700" dir={e.lang === 'ar' ? 'rtl' : 'ltr'}>{c.text[e.lang]}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {c.sources.slice(0, 3).map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[calc(11px*var(--fs))] text-pine-700 underline" dir="ltr">{s.title}</a>)}
          </div>
        </article>
      ))}
      {e.unknown && !e.rec && (
        <div className="rounded-2xl bg-ink-900/5 p-3 text-[calc(13px*var(--fs))] text-ink-700">
          {L('لا أملك مصدرًا موثّقًا يجيب عن هذا السؤال، لذلك لن أخمّن. جرّب السؤال عن تاريخ أحد معالم المدينة وأماكنها.', "I don't have a verified source that answers this, so I won't guess. Try asking about the history of one of Madinah’s landmarks and places.")}
        </div>
      )}
      {e.rec && (
        <div className="rounded-2xl bg-sky-700/8 p-3 ring-1 ring-sky-800/15">
          <div className="mb-1"><KindBadge kind="suggestion" /></div>
          <p className="text-[calc(13px*var(--fs))] leading-relaxed text-ink-900" dir={e.lang === 'ar' ? 'rtl' : 'ltr'}>{e.rec}</p>
          {e.planLink && (
            <button onClick={() => useGame.getState().setUi({ panel: 'plan' })} className="btn-press mt-2 rounded-full bg-pine-800 px-3 py-1.5 text-[calc(12px*var(--fs))] font-semibold text-sand-50">🗺️ {L('افتح «خطّط زيارتك»', 'Open “Plan your visit”')}</button>
          )}
        </div>
      )}
    </div>
  )
}

/** Interactive tourism guide: grounded answers from verified sources + clearly labelled suggestions. */
export function GuidePanel() {
  const open = useGame((s) => s.panel === 'guide')
  const lang = useGame((s) => s.lang)
  const log = useGame((s) => s.guideLog)
  const online = useGame((s) => s.online)
  const plan = useGame((s) => s.plan)
  const g = useGame.getState
  const L = (a: string, b: string) => (lang === 'ar' ? a : b)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [useClaude, setUseClaude] = useState(false)
  const [claudeOk, setClaudeOk] = useState<boolean | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const ctl = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) getSample().then((s) => setClaudeOk(!!s)) }, [open])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [log.length, open, busy])

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setQ('')
    setNote(null)
    const qLang = /[؀-ۿ]/.test(question) ? 'ar' : /[a-z]/i.test(question) ? 'en' : lang
    const push = (r: Omit<GuideEntry, 'id' | 'at'>) => g().logGuide({ ...r, id: uid(), at: new Date().toISOString() })
    if (!useClaude || !claudeOk) { push(answerLocally(question, qLang, plan)); return }
    if (!online) { setNote(ERR.offline[lang === 'ar' ? 0 : 1]); push(answerLocally(question, qLang, plan)); return }
    setBusy(true)
    ctl.current = new AbortController()
    try {
      push(await answerWithClaude(question, qLang, plan, ctl.current.signal))
    } catch (e) {
      const code = e instanceof GuideError ? e.code : 'upstream_error'
      if (code !== 'cancelled') {
        if (code === 'not_granted' || code === 'sampling_disabled' || code === 'unavailable') { setClaudeOk(false); setUseClaude(false) }
        setNote((ERR[code] ?? [`تعذّر الوصول إلى Claude (${code}) — أجبتُ من المصادر المحفوظة.`, `Couldn't reach Claude (${code}) — answered from the saved sources.`])[lang === 'ar' ? 0 : 1])
        push(answerLocally(question, qLang, plan))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={() => g().setUi({ panel: null })} title={<span className="flex items-center gap-2">🧭 {L('المرشد السياحي', 'Tourism guide')}</span>} wide>
      <div className="flex h-[min(72dvh,640px)] flex-col">
        <div className="mb-2 rounded-2xl bg-pine-800/6 p-2.5 text-[calc(11.5px*var(--fs))] leading-relaxed text-ink-700">
          {L('أجيب من مصادر موثّقة محفوظة في اللعبة وأعرضها لك، وأفصل الاقتراحات عن الحقائق. لا أخمّن التواريخ ولا الأحكام الشرعية.', "I answer from verified sources stored in the game and show them to you, and keep suggestions separate from facts. I don't guess dates or give religious rulings.")}
        </div>
        <div ref={listRef} className="scroll-y min-h-0 flex-1 space-y-3 pe-1" aria-live="polite">
          {log.length === 0 && (
            <div className="space-y-1.5">
              <div className="text-[calc(12px*var(--fs))] font-semibold text-ink-500">{L('جرّب أن تسأل:', 'Try asking:')}</div>
              {SUGGESTED[lang].map((s) => (
                <button key={s} onClick={() => ask(s)} className="btn-press block w-full rounded-2xl bg-white px-3 py-2 text-start text-[calc(13px*var(--fs))] ring-1 ring-ink-900/8">{s}</button>
              ))}
            </div>
          )}
          {log.map((e) => (
            <div key={e.id} className="space-y-1.5">
              <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-ee-md bg-pine-800 px-3 py-2 text-[calc(13.5px*var(--fs))] text-sand-50" dir={e.lang === 'ar' ? 'rtl' : 'ltr'}>{e.q}</div></div>
              <Answer e={e} />
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-[calc(12.5px*var(--fs))] text-ink-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pine-600" /> {L('يفكّر Claude…', 'Claude is thinking…')}
              <button onClick={() => ctl.current?.abort()} className="rounded-full bg-ink-900/6 px-2 py-0.5 text-[calc(11px*var(--fs))]">{L('إيقاف', 'Stop')}</button>
            </div>
          )}
          {note && <div role="status" className="rounded-xl bg-gold-300/25 px-3 py-1.5 text-[calc(11.5px*var(--fs))] text-ink-700">{note}</div>}
        </div>
        <div className="mt-2 space-y-2 border-t border-ink-900/6 pt-2">
          {claudeOk && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[calc(12.5px*var(--fs))] font-semibold">✦ {L('إجابات مصاغة بواسطة Claude', 'Answers written by Claude')} <NeedsNet /></div>
                <div className="text-[calc(10.5px*var(--fs))] text-ink-500">{L('يُرسل سؤالك والمصادر فقط إلى Claude على حسابك — لا تُرسل ذكرياتك ولا صورك.', 'Only your question and the sources are sent to Claude on your account — never your memories or photos.')}</div>
              </div>
              <Toggle label={L('إجابات Claude', 'Claude answers')} on={useClaude} onChange={setUseClaude} />
            </div>
          )}
          <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); ask(q) }}>
            <label className="sr-only" htmlFor="guide-q">{L('سؤالك', 'Your question')}</label>
            <input id="guide-q" value={q} onChange={(ev) => setQ(ev.target.value)} maxLength={400} placeholder={L('اسأل عن معلم أو عن وقت زيارتك…', 'Ask about a landmark or your visit…')} className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5 text-[calc(14px*var(--fs))] ring-1 ring-ink-900/10 focus:ring-2 focus:ring-pine-600" />
            <button type="submit" disabled={!q.trim() || busy} aria-label={L('إرسال', 'Send')} className="btn-press grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pine-800 text-sand-50 disabled:opacity-40"><Icon name={lang === 'ar' ? 'back' : 'chevron'} size={18} /></button>
          </form>
          {log.length > 0 && <button onClick={() => g().clearGuide()} className="text-[calc(11px*var(--fs))] text-ink-500 underline">{L('مسح المحادثة', 'Clear conversation')}</button>}
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { useGame, useT } from '../state/gameStore'
import { LANDMARK_MAP } from '../data/landmarks'
import { num } from '../lib/format'
import { sfx } from '../lib/sfx'
import { Btn, Modal } from './components/Sheet'
import { Icon } from './components/Icon'

export function QuizModal() {
  const t = useT()
  const id = useGame((s) => s.quizFor)
  const lang = useGame((s) => s.lang)
  const [i, setI] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [queue, setQueue] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    const st = useGame.getState().quiz
    setQueue(LANDMARK_MAP[id].quiz.filter((q) => !(q.id in st)).map((q) => q.id))
    setI(0); setChoice(null); setScore(0); setDone(false)
  }, [id])

  if (!id) return null
  const lm = LANDMARK_MAP[id]
  const q = lm.quiz.find((x) => x.id === queue[i])
  const close = () => useGame.getState().setUi({ quizFor: null })

  const choose = (k: number) => {
    if (choice !== null || !q) return
    setChoice(k)
    const ok = k === q.answer
    if (ok) { setScore((s) => s + 1); sfx.success(useGame.getState().soundOn) } else sfx.tap(useGame.getState().soundOn)
    useGame.getState().answerQuiz(q.id, ok)
  }
  const next = () => {
    if (i + 1 >= queue.length) { setDone(true); return }
    setI(i + 1); setChoice(null)
  }

  return (
    <Modal open onClose={close} title={`${t('quizzes')} · ${lm.name[lang]}`} z={75}>
      {done || !q ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-gold-300/30 text-4xl">🏅</div>
          <div className="font-display text-2xl font-semibold text-pine-900">{t('quizScore')}: {num(score, lang)}/{num(queue.length, lang)}</div>
          <div className="mt-1 text-[calc(13.5px*var(--fs))] text-ink-500">+{num(score * 30, lang)} {t('points')}</div>
          <Btn tone="primary" className="mt-5" onClick={close}>{t('finish')}</Btn>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[calc(12px*var(--fs))] font-semibold text-ink-500">
            {queue.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-gold-500' : 'bg-ink-900/10'}`} />)}
          </div>
          <div className="font-display text-[calc(19px*var(--fs))] font-semibold leading-snug text-pine-900">{q.q[lang]}</div>
          <div className="grid gap-2">
            {q.options.map((o, k) => {
              const state = choice === null ? 'idle' : k === q.answer ? 'right' : k === choice ? 'wrong' : 'dim'
              return (
                <button
                  key={k}
                  onClick={() => choose(k)}
                  className={`btn-press flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-start text-[calc(15px*var(--fs))] font-semibold ring-1 transition-colors ${
                    state === 'idle' ? 'bg-white ring-ink-900/8' : state === 'right' ? 'bg-pine-700 text-sand-50 ring-pine-700' : state === 'wrong' ? 'bg-red-100 text-red-800 ring-red-300' : 'bg-white/60 text-ink-500 ring-ink-900/5'
                  }`}
                >
                  {o[lang]}
                  {state === 'right' && <Icon name="check" size={18} />}
                  {state === 'wrong' && <Icon name="x" size={18} />}
                </button>
              )
            })}
          </div>
          {choice !== null && (
            <div className="anim-rise rounded-2xl bg-gold-300/20 p-3 text-[calc(13.5px*var(--fs))] leading-relaxed">
              <div className="font-bold">{choice === q.answer ? t('correct') : t('wrong')}</div>
              {q.explain[lang]}
            </div>
          )}
          {choice !== null && <Btn tone="primary" full onClick={next}>{i + 1 >= queue.length ? t('finish') : t('next')}</Btn>}
        </div>
      )}
    </Modal>
  )
}

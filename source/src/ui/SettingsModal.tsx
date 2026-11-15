import { createRestorePoint } from '../lib/backup'
import { useState } from 'react'
import { useGame, useT } from '../state/gameStore'
import { Btn, Modal, Toggle } from './components/Sheet'
import { Icon } from './components/Icon'

export function SettingsModal() {
  const t = useT()
  const open = useGame((s) => s.settingsOpen)
  const lang = useGame((s) => s.lang)
  const demo = useGame((s) => s.demoMode)
  const sound = useGame((s) => s.soundOn)
  const cloud = useGame((s) => s.cloud)
  const s = useGame.getState
  const [confirm, setConfirm] = useState(false)
  return (
    <Modal open={open} onClose={() => { s().setUi({ settingsOpen: false }); setConfirm(false) }} title={t('settings')}>
      <div className="space-y-3 pb-2">
        <Row label={t('language')}>
          <div className="flex rounded-xl bg-ink-900/6 p-1">
            {(['ar', 'en'] as const).map((l) => (
              <button key={l} onClick={() => s().setLang(l)} className={`btn-press rounded-lg px-3 py-1.5 text-sm font-semibold ${lang === l ? 'bg-pine-800 text-sand-50' : 'text-ink-700'}`}>
                {l === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t('demoMode')} desc={t('demoModeDesc')}>
          <Toggle on={demo} onChange={(v) => s().setDemo(v)} />
        </Row>
        <Row label={t('sound')}>
          <Toggle on={sound} onChange={(v) => s().setSound(v)} />
        </Row>
        <div className="rounded-2xl border border-gold-500/30 bg-gold-300/15 p-4">
          <div className="flex items-center gap-2 font-semibold text-pine-800"><Icon name="route" size={18} /> {t('demoJourney')}</div>
          <p className="mt-1 text-[calc(13px*var(--fs))] leading-relaxed text-ink-500">{t('demoJourneyDesc')}</p>
          <Btn tone="primary" className="mt-3" onClick={() => s().loadDemoJourney()}>{t('demoJourney')}</Btn>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'features' })}><Icon name="check" size={16} /> {lang === 'ar' ? 'حالة الميزات' : 'Feature status'}</Btn>
          <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'content' })}><Icon name="book" size={16} /> {lang === 'ar' ? 'المصادر والدقة' : 'Sources & accuracy'}</Btn>
          <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'env' })}>🌤️ {lang === 'ar' ? 'الوقت والطقس' : 'Time & weather'}</Btn>
          <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'audio' })}><Icon name="sound" size={16} /> {lang === 'ar' ? 'الصوت' : 'Audio'}</Btn>
          <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'data' })}><Icon name="lock" size={16} /> {lang === 'ar' ? 'بياناتي والخصوصية' : 'My data & privacy'}</Btn>
          <Btn tone="outline" className="py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'a11y' })}>♿ {lang === 'ar' ? 'سهولة الاستخدام' : 'Accessibility'}</Btn>
          <Btn tone="outline" className="col-span-2 py-2.5 text-[calc(13px*var(--fs))]" onClick={() => s().setUi({ settingsOpen: false, panel: 'offline' })}>📶 {lang === 'ar' ? 'العمل دون اتصال' : 'Offline use'}</Btn>
        </div>
        <div className="flex items-start gap-2 rounded-2xl bg-pine-800/6 p-3 text-[calc(12.5px*var(--fs))] leading-relaxed text-ink-700">
          <Icon name="info" size={16} className="mt-0.5 shrink-0" /> {t('aboutModels')}
        </div>
        <div className="flex items-center gap-2 text-[calc(12.5px*var(--fs))] text-ink-500">
          <Icon name={cloud === 'synced' ? 'cloud' : 'lock'} size={15} /> {cloud === 'synced' ? t('cloudSynced') : lang === 'ar' ? 'محفوظ على هذا الجهاز فقط — النسخة السحابية اختيارية' : 'Saved on this device only — cloud backup is optional'}
        </div>
        <Btn tone={confirm ? 'danger' : 'ghost'} full onClick={async () => { if (confirm) { await createRestorePoint('before-reset'); s().resetProgress(); setConfirm(false) } else setConfirm(true) }}>
          <Icon name="reset" size={17} /> {confirm ? t('resetConfirm') : t('resetProgress')}
        </Btn>
      </div>
    </Modal>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-ink-900/5">
      <div className="min-w-0">
        <div className="text-[calc(15px*var(--fs))] font-semibold">{label}</div>
        {desc && <div className="text-[calc(12.5px*var(--fs))] text-ink-500">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

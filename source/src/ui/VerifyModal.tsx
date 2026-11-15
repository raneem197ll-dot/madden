import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { useGame, useT } from '../state/gameStore'
import { LANDMARK_MAP, LANDMARKS } from '../data/landmarks'
import { getPosition, haversine } from '../lib/geo'
import { fmtDistance } from '../lib/format'
import { Btn, Modal } from './components/Sheet'
import { Icon } from './components/Icon'

async function decodeQR(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    for (const max of [1000, 1600, 600]) {
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc)
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0, w, h)
      const res = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' })
      if (res?.data) return res.data.trim()
    }
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function VerifyModal() {
  const t = useT()
  const id = useGame((s) => s.verifyFor)
  const mode = useGame((s) => s.verifyMode)
  const lang = useGame((s) => s.lang)
  const demo = useGame((s) => s.demoMode)
  const s = useGame.getState
  const [qr, setQr] = useState<string>('')
  const [busy, setBusy] = useState<'scan' | 'locate' | null>(null)
  const [msg, setMsg] = useState<{ kind: 'err' | 'info'; text: string } | null>(null)
  const [code, setCode] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMsg(null); setBusy(null); setCode('')
    if (!id) return
    QRCode.toDataURL(LANDMARK_MAP[id].qrCode, { margin: 1, width: 360, color: { dark: '#0c3326', light: '#fdfaf3' } }).then(setQr).catch(() => setQr(''))
  }, [id, mode])

  if (!id) return null
  const lm = LANDMARK_MAP[id]
  const close = () => s().closeVerify()

  const accept = (method: 'qr' | 'gps' | 'demo') => s().unlock(id, method)

  const checkCode = (value: string) => {
    const v = value.trim().toUpperCase()
    if (v === lm.qrCode) return accept('qr')
    const other = LANDMARKS.find((l) => l.qrCode === v)
    setMsg({ kind: 'err', text: other ? `${t('qrWrong')} (${other.name[lang]})` : t('qrNotFound') })
  }

  const onFile = async (f?: File) => {
    if (!f) return
    setBusy('scan'); setMsg(null)
    try {
      const data = await decodeQR(f)
      if (!data) setMsg({ kind: 'err', text: t('qrNotFound') })
      else checkCode(data)
    } catch {
      setMsg({ kind: 'err', text: t('qrNotFound') })
    } finally {
      setBusy(null)
    }
  }

  const simulate = (kind: 'scan' | 'locate') => {
    setBusy(kind); setMsg(null)
    setTimeout(() => { setBusy(null); accept('demo') }, 1500)
  }

  const gps = async () => {
    setBusy('locate'); setMsg(null)
    const r = await getPosition(9000)
    setBusy(null)
    if (!r.ok) { setMsg({ kind: 'err', text: t('gpsDenied') }); return }
    const d = haversine(r, lm.coords)
    if (d <= lm.radiusM + Math.min(r.accuracy, 150)) accept('gps')
    else setMsg({ kind: 'info', text: `${t('gpsFar')} ${fmtDistance(d, lang)} ${t('gpsFarSuffix')}` })
  }

  return (
    <Modal open onClose={close} title={<span>{lm.name[lang]}</span>} z={70}>
      <div className="mb-3 flex rounded-2xl bg-ink-900/6 p-1">
        {(['qr', 'gps'] as const).map((m) => (
          <button key={m} onClick={() => s().setUi({ verifyMode: m })} className={`btn-press flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[calc(13.5px*var(--fs))] font-semibold ${mode === m ? 'bg-pine-800 text-sand-50' : 'text-ink-700'}`}>
            <Icon name={m === 'qr' ? 'qr' : 'gps'} size={16} /> {m === 'qr' ? t('scanQR') : t('gpsCheckin')}
          </button>
        ))}
      </div>

      {mode === 'qr' ? (
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-3xl bg-pine-950">
            {qr && demo ? <img src={qr} alt="demo QR" className="absolute inset-5 h-[calc(100%-40px)] w-[calc(100%-40px)] rounded-xl" /> : (
              <div className="absolute inset-0 grid place-items-center text-sand-200/60"><Icon name="camera" size={56} stroke={1.2} /></div>
            )}
            {['top-3 start-3 border-t-4 border-s-4', 'top-3 end-3 border-t-4 border-e-4', 'bottom-3 start-3 border-b-4 border-s-4', 'bottom-3 end-3 border-b-4 border-e-4'].map((c) => (
              <span key={c} className={`absolute h-10 w-10 rounded-md border-gold-400 ${c}`} />
            ))}
            {busy === 'scan' && <span className="absolute inset-x-4 h-1 rounded-full bg-gold-300 shadow-[0_0_18px_6px_rgba(236,213,148,.6)]" style={{ animation: 'scan-line 1.2s ease-in-out infinite' }} />}
          </div>
          {demo && <p className="text-center text-[calc(12px*var(--fs))] text-ink-500">{t('qrDemoCaption')}</p>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          <div className="grid gap-2">
            <Btn tone="primary" onClick={() => fileRef.current?.click()} disabled={!!busy}><Icon name="camera" size={18} /> {busy === 'scan' ? t('qrScanning') : t('qrTakePhoto')}</Btn>
            {demo && <Btn tone="gold" onClick={() => simulate('scan')} disabled={!!busy}><Icon name="sparkle" size={18} /> {t('qrSimulate')}</Btn>}
          </div>
          <div className="flex gap-2">
            <input
              value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('qrManual')} dir="ltr"
              className="min-w-0 flex-1 rounded-2xl border border-ink-900/10 bg-white px-4 py-3 text-[calc(14px*var(--fs))] outline-none focus:border-pine-600"
              onKeyDown={(e) => e.key === 'Enter' && checkCode(code)}
            />
            <Btn tone="outline" onClick={() => checkCode(code)} disabled={!code.trim()}>{t('qrCheck')}</Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative grid h-44 place-items-center overflow-hidden rounded-3xl bg-pine-950 text-gold-300">
            <div className={`absolute h-28 w-28 rounded-full border-2 border-gold-400/40 ${busy === 'locate' ? 'animate-ping' : ''}`} />
            <div className="absolute h-16 w-16 rounded-full border-2 border-gold-400/60" />
            <Icon name="gps" size={44} stroke={1.5} />
          </div>
          <p className="text-[calc(13px*var(--fs))] leading-relaxed text-ink-500">{t('gpsHint')}</p>
          <Btn tone="primary" full onClick={gps} disabled={!!busy}><Icon name="gps" size={18} /> {busy === 'locate' ? t('gpsLocating') : t('gpsCheck')}</Btn>
          {demo ? (
            <Btn tone="gold" full onClick={() => simulate('locate')} disabled={!!busy}><Icon name="sparkle" size={18} /> {t('gpsSimulate')}</Btn>
          ) : (
            <p className="text-center text-[calc(12px*var(--fs))] text-ink-500">{t('demoOnlyHint')}</p>
          )}
        </div>
      )}
      {msg && (
        <div className={`mt-3 flex items-start gap-2 rounded-2xl p-3 text-[calc(13px*var(--fs))] ${msg.kind === 'err' ? 'bg-red-50 text-red-800' : 'bg-gold-300/25 text-ink-700'}`}>
          <Icon name="info" size={16} className="mt-0.5 shrink-0" /> {msg.text}
        </div>
      )}
      <p className="mt-3 text-center text-[calc(11.5px*var(--fs))] text-ink-500">{t('photoOptional')}</p>
    </Modal>
  )
}

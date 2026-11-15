import { useGame } from '../state/gameStore'

/** Online/offline tracking and the offline cache (service worker) where hosting allows it. */
export function startNet() {
  const set = () => useGame.getState().setUi({ online: navigator.onLine !== false })
  window.addEventListener('online', set)
  window.addEventListener('offline', set)
  set()
  if (!import.meta.env.PROD) return
  const okProtocol = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  if (!('serviceWorker' in navigator) || !okProtocol) { useGame.getState().setUi({ swStatus: 'unsupported' }); return }
  useGame.getState().setUi({ swStatus: 'pending' })
  navigator.serviceWorker.register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => useGame.getState().setUi({ swStatus: 'active' }))
    .catch(() => useGame.getState().setUi({ swStatus: 'blocked' }))
}

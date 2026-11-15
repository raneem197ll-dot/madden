import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { startCloudSync } from './state/cloudSync'
import { startSocial } from './state/social'
import { startNet } from './lib/net'
import { useGame } from './state/gameStore'
import { startRestorePoints } from './lib/backup'

const root = createRoot(document.getElementById('root')!)
const shot = import.meta.env.DEV ? location.hash.match(/^#shot-([a-z]+)-(\d)$/) : null

if (shot) {
  // dev-only: build-time snapshot stage (tree-shaken from production)
  import('./three/ShotStage').then(({ ShotStage }) => root.render(<ShotStage id={shot[1] as never} view={Number(shot[2])} />))
} else {
  root.render(<App />)
  startCloudSync()
  startSocial()
  startNet()
  startRestorePoints()
  // seasonal challenges may have come into season since the last visit
  setTimeout(() => useGame.getState().runChecks(), 1500)
}

// test hook (dev only)
if (import.meta.env.DEV) {
  import('./state/gameStore').then((m) => { (window as unknown as Record<string, unknown>).__game = m.useGame })
}

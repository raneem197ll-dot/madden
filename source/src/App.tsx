import { Component, useEffect, type ReactNode } from 'react'
import { reducedMotion } from './lib/a11y'
import { DataPanel } from './ui/DataPanel'
import { GuidePanel } from './ui/GuidePanel'
import { PlanPanel } from './ui/PlanPanel'
import { StoriesPanel, InteriorStoryHud } from './ui/Stories'
import { ThenNowPanel } from './ui/ThenNowPanel'
import { ChallengesPanel } from './ui/Challenges'
import { OfflinePanel, OfflinePill } from './ui/OfflinePanel'
import { A11yPanel } from './ui/A11yPanel'
import { JourneyStory } from './ui/JourneyStory'
import { Captions } from './ui/AudioGuide'
import { useGame } from './state/gameStore'
import { tr } from './data/i18n'
import { GameCanvas } from './three/GameCanvas'
import { BottomNav, FadeOverlay, ReplayButton, Toasts, TopHud } from './ui/Hud'
import { LandmarkSheet } from './ui/LandmarkSheet'
import { LandmarkLabels } from './ui/LandmarkLabels'
import { VerifyModal } from './ui/VerifyModal'
import { CelebrationCard } from './ui/CelebrationCard'
import { ReplayOverlay } from './ui/ReplayOverlay'
import { InspectCard, InteriorHud, TouchControls } from './ui/Interior'
import { GalleryOverlay, MemoryComposer, MemoryViewer } from './ui/Memories'
import { QuizModal } from './ui/QuizModal'
import { SettingsModal } from './ui/SettingsModal'
import { Onboarding } from './ui/Onboarding'
import { AchievementsScreen, ExploreScreen, MemoriesScreen, PassportScreen } from './ui/Screens'
import { AudioPanel, EnvPanel, MapTools } from './ui/Panels'
import { MapFilterBar, PlaceSheet } from './ui/Places'
import { ShareModal, VisitBanner, VisitSheet } from './ui/Social'
import { CollectibleModal } from './ui/Collection'
import { ARPanel } from './ui/ARPanel'
import { ContentPolicy, FeatureStatus } from './ui/About'
import { AudioDirector, PerfDirector, PlayTimeTracker } from './ui/Directors'
import { RainOverlayCSS } from './three/shared/Weather'

class GLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { console.error(e) }
  render() {
    if (this.state.failed) {
      const lang = useGame.getState().lang
      return (
        <div className="absolute inset-0 grid place-items-center bg-pine-900 p-8 text-center text-sand-50">
          <div>
            <div className="font-display text-2xl">{tr('appName', lang)}</div>
            <p className="mt-2 text-sand-200/80">{tr('webglError', lang)}</p>
            <button className="mt-4 rounded-2xl bg-gold-400 px-5 py-3 font-semibold text-pine-950" onClick={() => this.setState({ failed: false })}>↻</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const lang = useGame((s) => s.lang)
  const mode = useGame((s) => s.mode)
  const tab = useGame((s) => s.tab)
  const replay = useGame((s) => s.replay.active)
  const onboarded = useGame((s) => s.onboarded)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  const a11y = useGame((s) => s.a11y)
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--fs', String(a11y.textScale || 1))
    const apply = () => { root.dataset.motion = reducedMotion() ? 'reduce' : 'full' }
    apply()
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    mq?.addEventListener?.('change', apply)
    return () => mq?.removeEventListener?.('change', apply)
  }, [a11y])

  const city = mode === 'city'
  return (
    <div className="relative h-full w-full overflow-hidden bg-pine-900">
      <GLBoundary>
        <GameCanvas />
      </GLBoundary>

      {city && tab === 'city' && <RainOverlayCSS />}
      {city && !replay && onboarded && tab === 'city' && <LandmarkLabels />}
      {city && !replay && onboarded && tab === 'city' && <TopHud />}
      {city && !replay && onboarded && tab === 'city' && <ReplayButton />}
      {city && !replay && onboarded && tab === 'city' && <MapTools />}
      {city && !replay && onboarded && tab === 'city' && <MapFilterBar />}
      {city && onboarded && tab === 'city' && <VisitBanner />}
      {city && !replay && tab === 'explore' && <ExploreScreen />}
      {city && !replay && tab === 'passport' && <PassportScreen />}
      {city && !replay && tab === 'memories' && <MemoriesScreen />}
      {city && !replay && tab === 'achievements' && <AchievementsScreen />}
      {city && !replay && onboarded && <BottomNav />}
      <LandmarkSheet />
      <PlaceSheet />
      <VisitSheet />
      <CelebrationCard />
      <ReplayOverlay />

      {!city && <TouchControls />}
      {!city && <InteriorHud />}
      {!city && <InteriorStoryHud />}
      {city && !replay && onboarded && tab === 'city' && <OfflinePill />}

      <VerifyModal />
      <InspectCard />
      <GalleryOverlay />
      <MemoryComposer />
      <MemoryViewer />
      <QuizModal />
      <SettingsModal />
      <EnvPanel />
      <AudioPanel />
      <ShareModal />
      <ARPanel />
      <CollectibleModal />
      <FeatureStatus />
      <ContentPolicy />
      <DataPanel />
      <GuidePanel />
      <PlanPanel />
      <StoriesPanel />
      <ThenNowPanel />
      <ChallengesPanel />
      <OfflinePanel />
      <A11yPanel />
      <JourneyStory />
      <Captions />
      <PerfDirector />
      <AudioDirector />
      <PlayTimeTracker />
      <Toasts />
      <FadeOverlay />
      <Onboarding />
    </div>
  )
}

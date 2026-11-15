# مدينتي بعيوني — My City, My Story

A mobile-first 3D exploration game for Al Madinah. Visit real landmarks, verify the visit (QR / GPS / demo), watch the landmark get built in your miniature city, then walk inside it.

> "Every visitor explores the same city, but builds a different version of it."

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run typecheck
npm run content:check  # validate src/content/*.json
npm run build          # → dist/index.html (single self-contained file) + dist/sw.js
npm run test:e2e       # Playwright regression suite (dev server running + fresh build)
```

Historical content lives in `src/content/*.json` — edit it there (see CLAUDE.md → Recipes).
For AI assistants and contributors, **CLAUDE.md** is the source of truth; the latest audit is in **docs/AUDIT.md**.

Regenerate the bundled in-game model snapshots (needs the dev server running + Playwright/Chrome):

```bash
python3 scripts/render_shots.py http://localhost:5173/
```

## Publish on GitHub Pages / النشر على GitHub Pages

The repository holds the **source**. Uploading it as-is gives a blank page, because `index.html` here loads `src/main.tsx`, which only works after a build. Two ways to publish:

**A — automatic (recommended).** Push the whole project (with `package.json` at the repository root, without `node_modules`/`dist`). Then in the repository open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The included workflow `.github/workflows/deploy.yml` builds and publishes on every push; watch it in the **Actions** tab. The site is `https://<user>.github.io/<repo>/`.

**B — manual.** Run `npm ci && npm run build` and upload only `dist/index.html` and `dist/sw.js` (plus `dist/.nojekyll`) to the repository or branch that Pages serves.

ملخص: المستودع يحوي الشيفرة المصدرية، ورفعها كما هي يعطي صفحة بيضاء. إمّا أن تختار من **Settings ← Pages ← Source** الخيار **GitHub Actions** فيبني النشر التلقائي الموقع عند كل رفع، أو ترفع ملفَّي `dist/index.html` و`dist/sw.js` الناتجين عن البناء فقط.

## Stack

React 19 + TypeScript · Three.js via React Three Fiber + Drei · Tailwind CSS v4 · Zustand (game state) · IndexedDB (photos) · Vite (single-file build).

## Structure

```
src/
  data/            landmark content (bilingual, sourced facts), achievements, decorations, i18n
  state/
    gameStore.ts   game state + actions (separate from rendering); persisted to localStorage
    director.ts    multi-step sequences: enter/exit building, "Relive my journey"
    photoStore.ts  private photos in IndexedDB (never uploaded)
    cloudSync.ts   optional sync of progress to the viewer's private space when hosted with a doc store
    social.ts      shared cities: SocialAdapter interface (hosted doc store / local sample adapter),
                   privacy-filtered city payload, share links (#city-CODE), visit mode
  three/
    shared/        time-of-day engine (environment.ts keyframes: sunrise/day/sunset/night),
                   sky + lights rig, clouds & rain, glow registry
    city/          miniature city: layout + district growth, roads/parks/lamps, traffic, pedestrians,
                   birds, navigation paths, camera rig, landmark slots + beacons, construction,
                   decorations, replay route, label projector, snapshot bridge
    models/        procedural low-poly landmark models (Quba, Uhud, Hejaz station + train, Qiblatain)
    interior/      first-person engine (AABB collision, interactables, joystick input) + 4 scenes
  data/collectibles.ts   12 collectibles: game object (fiction) + verified fact + source links
  data/narration.ts      Arabic & English audio-guide scripts (sourced facts only)
  lib/audio.ts     WebAudio engine: ambience layers, generative music, SFX bus, narration + ducking
  lib/snapshot.ts  1080×1350 postcard of your city
  ar/index.ts      AR module boundary: capability detection, per-landmark AR content, adapter slots
  ui/              HUD, bottom nav, landmark panel, verify modal, memories, quiz, passport,
                   achievements, interior HUD + touch controls, replay overlay, map tools,
                   environment & audio panels, stats dashboard, collection, share/friends,
                   AR preview, feature-status & content-policy pages
```

## Delivered experiences

| Requirement | Where |
|---|---|
| 3D miniature city, orbit/pan/zoom, day & night | `three/city/*` |
| Real-direction map: 15 landmarks with 3D models + 14 map places, Haram at the centre | `lib/geo.ts`, `data/landmarks.ts`, `data/places.ts`, `three/city/layout.ts` |
| Downtown: hotel towers, three ring roads, Quba walkway; lava fields, Mount Ayr, Wadi al-Aqiq | `three/city/layout.ts`, `CityEnvironment.tsx` |
| Places directory (search, categories, sort by distance), place sheets, map filter | `ui/Places.tsx` |
| Locked = construction site + ghost, unlocked = full model (the Haram and al-Baqi are always shown) | `LandmarkSlot.tsx`, `models/*` |
| Unlock + staged construction animation, progress indicator | `gameStore.unlock`, `BuildPart` |
| Landmark info panel (history, facts, photos, visit date, memories, quiz) | `ui/LandmarkSheet.tsx` |
| Fully explorable interior | **Hejaz Railway Museum** — hall, exhibits, platform, locomotive, 3 hidden details |
| Simplified walkable interiors | Quba Mosque, Qiblatain Mosque, Mount Uhud site, the Prophet's Mosque plazas (umbrellas only) |
| Mobile joystick (left) + swipe look (right) + tap to inspect; WASD/arrows + mouse | `ui/Interior.tsx`, `interior/engine.tsx` |
| Personal memories (camera/gallery photo, note, date), private by default | `ui/Memories.tsx`, `photoStore.ts` |
| "أعد عيش رحلتي" replay | `director.startReplay`, `ReplayRoute.tsx`, `ReplayOverlay.tsx` |
| Points, passport stamps, badges, achievements, decorations, quizzes | `data/progression.ts`, `ui/Screens.tsx` |
| Arabic RTL first, English secondary | `data/i18n.ts` |

## Feature status

The same list is in the app (Settings → Feature status) and in CLAUDE.md.

**Implemented** — real-direction map with 29 places (15 landmarks with 3D models + 14 map places) · downtown around the Prophet's Mosque (hotel towers, three ring roads, Quba walkway) · places directory with search, categories, distance sort and Open in Maps · map category filter with decluttered labels · 3D city that grows with unlocks · walkable interiors (Hejaz museum, three simplified sites, the Haram plazas) · 12 collectibles with sources · 4 interactive stories with clues found in 3D · Then & Now (documented timelines for four landmarks; Hejaz 1908 vs today, labelled illustrative) · tourism guide answering only from verified cards (all 29 places), suggestions labelled separately · visit planner over all places (short / half / full day, interests, walking or car, step-free) · 3 seasonal challenges + 4 themed collections · travel story with summary image and video export · memories, replay, points, 17 achievements, passport, quizzes, stats · time of day with camera-following shadows · backup export/import and automatic restore points · opt-in privacy (nothing uploaded by default, photos never) · adaptive graphics tiers · text size, reduced motion, captions · works offline once open.

**Partial** — 11 places have approximate map positions (marked ≈) · Claude-written guide answers (need the Claude host and the viewer's consent; verified against a simulated host) · re-opening offline (own hosting; depends on the host inside Claude) · visit check-in (fixed demo QR codes, demo mode on by default, GPS needs own hosting) · planner distances are estimates · audio guide uses device voices · friends' cities among people the page is shared with · cloud backup and saving files depend on the host.

**Visual only** — traffic, pedestrians and birds; weather; umbrellas folding at night; terrain drawn symbolically.

**Planned** — camera AR · licensed historical photos · studio narration · Then & Now for the new landmarks · real-time multiplayer · own backend with public sharing and tamper-proof check-ins.

## Honest limitations

- **The map compresses distances**: every place sits on its real bearing from the Prophet's Mosque, but distances shrink logarithmically so the centre gets room. Where an exact position couldn't be verified it is marked "≈" and the sheet says so.
- **3D models are simplified game representations**, inspired by documented features (e.g. Madinah station's 17-arch basalt façade, Qiblatain's twin domes/minarets) — not accurate reconstructions. This is stated in-app on every landmark.
- **Interior layouts are imagined** for the museum and simplified for the mosques. Hidden collectibles are labelled as symbolic game items. The Martyrs' cemetery is shown only as a symbolic wall.
- **Camera & GPS inside the hosted preview**: the hosted page runs in a sandboxed frame that blocks live camera and geolocation. QR verification therefore uses a photo of the code (decoded with jsQR) or manual entry; GPS shows a clear message. Demo mode simulates both. Deployed on your own domain, the GPS check-in works as written.
- **Persistence**: progress is saved in the browser (localStorage), and also synced to the viewer's private per-user space when the page is hosted where that's available. Photos never leave the device (IndexedDB). For production, swap `cloudSync.ts` for Firebase/Supabase.
- Landmark "photos" are snapshots of the in-game models (labelled as such), not photographs.

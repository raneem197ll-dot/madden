# CLAUDE.md — مدينتي بعيوني / My City, My Story

Guidance for AI coding assistants working in this repository. Read it fully before changing code. The last audit is in `docs/AUDIT.md`.

## What this is

A mobile-first 3D tourism game for Al Madinah. A visitor verifies a visit (QR / GPS / demo), the landmark is built in their personal miniature city, and they can walk inside it, find hidden historical details, follow short interactive stories, compare past and present, plan a real visit, ask a grounded tourism guide, keep private memories, and replay or export their journey.

**29 places on a real-direction map** (Arabic RTL first, English second):
- **15 landmarks with 3D models** (`LandmarkId`, `src/content/landmarks.json`): `haram` (the Prophet's Mosque — always shown, walkable *plazas only*), `quba`, `qiblatain`, `uhud`, `hejaz` (fully explorable museum), `ghamama`, `baqi` (wall + gate only), `jumuah`, `sabaa` (the Seven Mosques), `manaratain`, `ijabah`, `miqat` (Dhu al-Hulayfah), `quranComplex`, `rumah` (Bir Rumah), `aqiq` (Wadi al-Aqiq walkway, approximate position).
- **14 map-only places** (`src/content/places.json`): mosques, Saqifah, museums, the central area, the dates market, walkways, park, Mount Ayr, the railway station and airport — each with a verified summary + sources and a separate tip.

Walkable scenes: `hejaz` (full), `quba` / `qiblatain` / `uhud` (simplified), `haram` (courtyard: plazas + umbrellas; no Rawdah, no Prophet's chamber, no collectibles or games). The other landmarks have `interior: "none"` (city model + sheet + quiz + Open in Maps).

## Commands

```bash
npm install
npm run dev            # http://localhost:5173
npm run typecheck      # tsc --noEmit — must pass
npm run content:check  # validates src/content/*.json (also runs before build)
npm run build          # content check + dist/index.html (single self-contained file) + dist/sw.js
npm run test:e2e       # Playwright regression suite (needs `npm run dev` running and a fresh build)
```

## Stack

React 19 · TypeScript 7 · Vite 8 · three 0.187 via @react-three/fiber 9 + drei 10 · Zustand 5 (persist) · Tailwind CSS v4 · IndexedDB via idb-keyval (photos, restore points) · jsQR / qrcode. Tests: Python Playwright with system Chrome.

## Architecture

```
src/
  content/               EDITABLE CONTENT (JSON) — history, sources, stories, eras, itinerary data, challenges
    landmarks.json       15 landmarks: names, category, history, facts, quiz, coords (+approx), keywords, tips
    places.json          14 map-only places: summary (verified) + facts + tip (suggestion) + sources (+approx/near/noPlan)
    interiors.json       info cards inside each landmark (kind: verified | game)
    collectibles.json    12 hidden items: object (game) + fact (verified) + sources
    sources.json         per-landmark source list
    narration.json       audio-guide scripts
    then-now.json        documented eras + "then"/"now" panels (reconstruction: illustrative | none)
    stories.json         interactive stories (read / find / question / reflect steps)
    itinerary.json       visit lengths, tags (incl. `highlights`), access notes, speeds, start points — RECOMMENDATIONS & ESTIMATES
    challenges.json      seasonal challenges + themed collections (goals = real discoveries)
  data/                  typed loaders + game rules (no React)
    content.ts           INTERIORS, interiorInfo(), INFO_COUNT (derived — never hard-code counts)
    landmarks.ts         LANDMARKS (cityPos computed from coords + overlap relaxation), hasInterior(), CATEGORY_LABEL
    places.ts            PLACES, SPOTS (landmarks + places), SPOT_MAP, isLandmarkId()
    collectibles.ts, narration.ts (narrationFor: script or verified history), stories.ts, challenges.ts, progression.ts, i18n.ts, types.ts
  state/
    gameStore.ts         Zustand store (persisted v4 to localStorage 'madinah-my-story-v1'; `merge` migrates)
    director.ts          enter/exit building, replay
    cloudSync.ts         OPT-IN private backup to data/users/<id>/progress (privacy.cloudBackup)
    social.ts            shared cities (cities/<uid>), privacy-filtered, opt-in publish
    photoStore.ts        photos in IndexedDB — never uploaded
  lib/
    guide.ts             tourism guide: knowledge base from content, AR/EN retrieval, intents, Claude mode
    planner.ts           itinerary builder over all plannable spots: greedy insertion by value/minute + 2-opt/or-opt
    journey.ts           travel-story slides → canvas player, summary image, MediaRecorder video
    backup.ts            export / import / validate backups; IndexedDB restore points
    save.ts              saveFile(): host `downloads` capability or a normal download
    net.ts               online/offline + service worker registration (production only)
    device.ts            device → graphics tier (high / medium / low) and tier settings
    a11y.ts              reducedMotion()
    geo.ts               haversine, GPS, projectToCity() — bearing-true, log-compressed (r = 24·ln(1 + km/0.8)), Haram at 0,0
    audio.ts, sfx.ts, snapshot.ts, format.ts
  three/
    city/layout.ts       deterministic city: plots, 3 ring roads + access roads + avenues + Quba walkway (polylines,
                         kept out of plots), lava fields, Mount Ayr, Wadi al-Aqiq, occupancy grid, houses/towers, palms
    models/              one model per landmark (HaramModel, MosqueModels, SiteModels, + the original four); MODELS registry
    interior/scenes/     HejazInterior, QubaInterior, QiblatainInterior, UhudSite, HaramCourtyard
  ui/                    screens and panels: Places (directory, PlaceSheet, MapFilterBar), LandmarkSheet, GuidePanel,
                         PlanPanel, Stories, ThenNowPanel, Challenges, JourneyStory, DataPanel, OfflinePanel, A11yPanel
public/sw.js             offline cache: handles ONLY page navigations and Google Fonts
scripts/                 check-content.mjs, regression.py, shot.py, render_shots.py
```

Data flow: `content/*.json` → `data/*` loaders → `state/gameStore` → `three/*` and `ui/*`. Multi-step flows go through `state/director.ts`.

## Non-negotiable rules

1. **Historical accuracy.** Never invent events, dates, names, quotes or architecture. Every historical statement needs a reliable https source in the content JSON. If you can't source it, don't add it. Hadith cite collection + number and are quoted accurately.
2. **Separate fact, game, suggestion, estimate, illustration.** `InfoContent.kind` is `verified` or `game`. Collectibles keep `object` (game) and `fact` (verified) apart. Itinerary numbers are estimates, tips are suggestions, the Hejaz 1908 model is "illustrative". The UI shows a badge for each (`KindBadge`, `TruthBadge`) — keep them.
3. **The guide only states verified facts.** Local answers are knowledge-base cards shown verbatim with sources. Claude mode may only cite knowledge-base ids; ungrounded answers fall back to local retrieval; Claude's text is labelled "Summary by Claude"; no religious rulings; no live hours, prices or prayer times.
4. **No invented reconstructions.** Then & Now shows a documented description where sources don't describe the old building (`reconstruction: "none"`). Historical photos need `credit` + `license` (the validator enforces it).
5. **Respect for religious sites.** No combat, timers, penalties or point-farming. Stories at mosques and at Uhud use calm language; the battle is never depicted; the Martyrs' cemetery and al-Baqi are shown only as walls (no graves). The Prophet's Mosque: plazas and umbrellas only — never the Rawdah or the Prophet's chamber, no collectibles, games or people inside the scene; it is `alwaysBuilt` (no construction site) and a visit is recorded calmly. Music pauses inside mosques.
5b. **Honest map.** Directions come from real coordinates; distances are compressed. A place whose exact position we can't verify gets `approx: true` (+ `approxNote` for places) and shows "≈" everywhere. Terrain (harrat, Mount Ayr, the wadi) is symbolic. "Top picks" (`highlights` tag) are our suggestion, never a ranking.
6. **Privacy first.** Nothing leaves the device without explicit opt-in: `privacy.cloudBackup`, `privacy.cloudNotes`, `privacy.publish`, and per-memory `shared` all default to false. Photos are never uploaded (backups include them only in a file the player saves). Never require a photo to unlock anything. Never send memories to Claude.
7. **No fake features.** `ui/About.tsx` (in-app feature status) and the status section below must stay truthful: implemented / partial / visual only / planned.
8. **Don't break existing features.** Run the full regression suite after changes.

## Conventions

- Bilingual everything: `Bi` (`{ ar, en }`) in content, `useT()` keys in `data/i18n.ts`.
- RTL first: logical utilities (`ms-*`, `ps-*`, `start-*`, `text-start`). The joystick is always bottom-left.
- Font sizes: write `text-[calc(13px*var(--fs))]` (or Tailwind named sizes) so the text-size setting works. Never plain `text-[13px]`.
- Numbers: `num(n, lang)` and `pctText(n, lang)`. Don't put `·` next to Arabic digits (it reads as `٠`): use the `|` span, `،` or `—`.
- Dialogs: use `Modal` (role=dialog, Escape, focus handling). Give icon-only buttons and `Toggle`s an accessible `label` / `aria-label`.
- Motion: check `reducedMotion()` before camera glides, auto-rotation or Ken Burns effects.
- Graphics: 3D code reads `s.tier` and `TIER_SETTINGS`, never `s.quality` (that's the player's choice, which may be `auto`).
- Zustand: select narrowly; arrays/objects need `useShallow`. No hooks after an early `return`.
- Per-frame values live in `three/shared/env.ts`, not React state. 3D labels use the DOM anchor layer, not drei `<Html>`.
- Instanced "hidden" scale: collapse all axes to `0.0001`, never 0 on one axis.
- New persisted fields: add defaults and handle them in the store's `merge` migration; bump `version` if semantics change.

## Recipes

**Add a 3D landmark** → add it to `landmarks.json` (id, category, coords, footprint/scale, keywords/nameWords, sourced history/facts/quiz, `interior`), its sources to `sources.json`, an entry in `itinerary.json` `places`, a model in `three/models/` registered in `MODELS` (clearRadius ≈ footprint·scale + 1.2), and an emblem in `LandmarkEmblem`. Extend the `LandmarkId` union. Its city position is computed — never hard-code `cityPos`.

**Add a map-only place** → `places.json` (summary = verified, tip = suggestion, sources, `approx` + `approxNote` if unsure, `noPlan` if it shouldn't be an itinerary stop) and, unless `noPlan`, an `itinerary.json` entry. Pins, directory, guide and planner pick it up automatically.

**Add an interior info card** → add it to `src/content/interiors.json` (`id` = key, `kind`), then wrap the object in the scene with `<Interactive info={INFO.<key>}>`. Counts derive automatically.

**Add a collectible** → `src/content/collectibles.json` (sources required), then in the scene `<Interactive info={collectibleInfo('<landmark>', '<id>')} kind="hidden" marker={[x,y,z]}>`.

**Add a story** → `src/content/stories.json`. `find` targets are `info:<landmark>:<cardId>` or `hidden:<landmark>:<itemId>` in the same landmark. Questions need `answer` + `explain` (and `sources` for hadith).

**Add a challenge** → `src/content/challenges.json`. Goals: `discover` (key), `unlock` (landmark), `story` (id). Seasons: `always`, Gregorian `months`, or `hijri` months (Umm al-Qura).

**Add a Then & Now era** → `src/content/then-now.json`, with `when`, `title`, `text`, `sources`.

Always run `npm run content:check` — it checks bilingual text, https sources, ids, and that every story clue and challenge goal exists.

## Hosting constraints (Claude artifact)

- Sandboxed frame: no camera stream, geolocation or WebXR. Images only from `data:`/`blob:` (historical photos must be bundled).
- Host features via `window.claude.use(name)`; each may resolve `null` — always design for absence.
- Declared capabilities: `db` with rules `cities` (read view / write owner) and `cities/{self}` (read view / write interact), `user`, `downloads`, `sample` (Claude answers, spends the viewer's usage, asks consent). Declare a new capability on the artifact BEFORE publishing code that uses it.
- DB paths: private backup `data/users/<id>/progress`; shared city `cities/<uid>`.
- Hash routes are ASCII letters, digits, hyphens (`#city-ABC123`).
- The service worker may be blocked inside the host; the app reports that status honestly.

## Testing

`npm run test:e2e` runs `scripts/regression.py`:
1. **functional** (dev server, mocked host): privacy defaults and zero uploads before opt-in, cloud opt-in payloads, QR demo unlock, backup export/reset/import/invalid file, Escape, guide (grounded, refusal, suggestion, practical, Haram + map-place answers, Claude-mode grounding + fallbacks), planner (budgets respected), real-direction positions, places directory search + category filter, place sheet (fact / suggestion / sources / ≈ / Maps), Haram visit without construction + plazas scene + no collectibles, no-interior landmarks offer Maps, stories (3D clue pickup), challenges (season rules), Then & Now, journey image + video export, replay, accessibility settings.
2. **screens**: 320×568, 360×740, 390×844, 430×932, 768×1024, 844×390, 1280×800 at 100% and 130% text (explore, guide, place sheet) — no horizontal overflow, no errors.
3. **production**: dist boots, dev hook absent, service worker controls the page, re-opens offline.

Run a single group with `python3 scripts/regression.py functional`. Screenshots go to `/tmp/shots/e2e`. Also: `scripts/shot.py` for ad-hoc screenshots; dev hooks `window.__game` (store) and `window.__tp = [x, z, yaw]` (teleport in interiors). Look at the screenshots — passing checks don't prove the layout reads well.

## Feature status (keep in sync with `ui/About.tsx`)

- **Implemented:** real-direction map with 29 places (15 landmarks with 3D models + 14 map places); downtown around the Prophet's Mosque (hotel towers, three ring roads, Quba walkway); places directory (search, categories, sort by distance, Open in Maps); map category filter and decluttered labels; 3D city that grows with unlocks; walkable interiors (Hejaz full, three simplified, Haram plazas); 12 collectibles; 4 interactive stories; Then & Now (timelines for four landmarks, Hejaz 1908-vs-today model); tourism guide (local, grounded, covers all 29 places); visit planner over all places; 7 challenges; travel story with summary image and video; memories, replay, points, 17 achievements, passport, quizzes, stats; time of day; backups, import, restore points; opt-in privacy; adaptive graphics with camera-following shadows; text size, reduced motion, captions; works offline once open.
- **Partial:** 11 places have approximate map positions (marked ≈); Claude-written guide answers (needs the Claude host + viewer consent; tested only against a simulated host); offline re-open (works on own hosting; host-dependent inside Claude); visit check-in (fixed demo QR codes, demo mode on by default, GPS needs own hosting); planner distances are estimates; audio guide uses device voices (new landmarks read their verified history); friends' cities only among people the page is shared with; cloud backup and file saving depend on the host.
- **Visual only:** traffic, pedestrians, birds; weather; umbrellas folding at night; terrain (lava fields, Mount Ayr, Wadi al-Aqiq course) drawn symbolically.
- **Planned:** camera AR (boundary in `src/ar/`); licensed historical photos; studio narration; Then & Now for the new landmarks; real-time multiplayer; own backend with public sharing and tamper-proof check-ins.

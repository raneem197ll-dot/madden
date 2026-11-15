# Product & technical audit — مدينتي بعيوني

Date: 8 Nov 2026. Method: read the source for each feature's real code path, then ran the production build in Playwright (online and offline). This is the state **before** the audit-driven improvements.

## 1. Fully functional (checked in code and exercised in tests)

- **3D city**: orbit / zoom / pan; four landmark slots with ghost → construction → built states; staged construction animation; city growth (roads, districts, parks, lamps) driven by real unlocks; completion % computed from stored progress.
- **Interiors**: first-person engine with AABB collision; joystick, swipe-look and tap on mobile; WASD + mouse on desktop; info cards (Hejaz 11, others 6 each); 12 hidden collectibles with sources (a proximity pick-up bug was fixed in the previous round).
- **Progress systems**: points, 12 achievements, passport stamps, 12 quiz questions, decorations, stats dashboard and timeline, all derived from stored state.
- **Memories**: camera/gallery photo (compressed to 1280 px, stored in IndexedDB), note, date; private by default.
- **Replay**: camera fly-through, per-landmark cards with the user's photos and notes, summary card.
- **Time of day**: manual, live Asia/Riyadh clock, or 4-minute cycle; lighting, fog, stars; shadows on high quality.
- **Postcard**: 1080 × 1350 canvas image of the city.
- **Audio**: procedural ambience, music and SFX; audio guides via device speech with a live-highlighted transcript.
- **Languages**: Arabic RTL first, English.

## 2. Visual demonstrations only (look real, carry no real data)

- Traffic, pedestrians and birds — ambient animation, not live data.
- Weather — a user-chosen effect, not Madinah's real weather.
- Cranes, beacons — cosmetic.
- Demo journey and the two sample friend cities — labelled sample data.
- Landmark "photos" — snapshots of the game models (labelled), not photographs.

## 3. Partially implemented

- **Visit verification**: QR decoding from a photo works, but codes are fixed strings (e.g. `MCMS-QUBA`) anyone can type, and **demo mode is on by default**, so anyone can unlock everything. No physical QR signage exists. The GPS radius check is written but cannot run in the hosted page and has never been tested on a device.
- **Private cloud sync**: only when hosted for a signed-in viewer — and it **uploads memory notes automatically without asking**, which conflicts with the consent rule.
- **Friends' cities**: only among people the artifact is shared with; publishing needs Contributor access. The artifact is currently private, so today nobody else can see a shared city. No way to enter a friend's code, only links.
- **Route distances**: straight-line, not road routing.
- **Audio guides**: device voices; an Arabic voice may be missing on some phones.
- **Accessibility**: 15 of ~50 buttons have accessible names; no reduced-motion support; dialogs have no Escape key or dialog roles; fixed pixel font sizes down to 10.5 px; no text-size setting.
- **Performance**: a two-level quality switch that only changes life density, rain and shadows; no runtime FPS adaptation; pixel ratio up to 1.75; 2.6 MB single file, of which ≈0.85 MB is inline JPEG model renders.
- **Offline**: once loaded, the game keeps working offline (tested). Reloading offline fails (no service worker). Fonts come from Google Fonts.
- **Content management**: historical text lives in TypeScript files; interior info cards are written inside 3D scene components; nothing validates sources or bilingual completeness.

## 4. Missing

Tourism assistant; itinerary planner; Then & Now; interactive stories; seasonal challenges; journey story and video export; progress export / import / restore; offline indicator and internet-dependency list; captions overlay; text size and reduced motion; content validator. Planned and still missing: camera AR, real-time multiplayer.

## 5. Limits caused by the Claude artifact environment

- Sandboxed frame: no live camera stream, no geolocation, no WebXR. File inputs work (photo capture goes through the OS picker).
- Content Security Policy: images only from `data:` / `blob:` — historical photos cannot be loaded from the web; they would have to be bundled with a licence.
- No server code: only host capabilities (`db`, `user`, `downloads`, `sample`), each of which can be absent; access is governed by per-path rules and the viewer's role.
- Asking Claude (`sample`) spends the viewer's own usage and needs their consent per view.
- Offline reload and service workers are not guaranteed inside the host.
- Storage is per viewer and per browser and can be cleared; no push notifications.
- Everything ships as one file, so asset weight matters.

## 6. Needs external hosting or services

- Tamper-proof check-ins: signed or rotating QR codes or server-side verification, plus physical signs at the landmarks.
- GPS check-in: the game on its own HTTPS domain.
- Camera AR: WebXR / a native AR SDK on its own domain.
- Public social features and multiplayer: Firebase / Supabase with authentication and moderation.
- Live weather, opening hours, prayer times, traffic: data APIs.
- Turn-by-turn routing: a maps service (the game links out to Google Maps instead).
- Historical photographs: licensed archive images.
- Studio-quality narration: a TTS service.
- Installable offline app (PWA): own domain.

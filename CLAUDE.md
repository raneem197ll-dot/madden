# Repository layout

- `source/` — the project (React + Three.js game). Read `source/CLAUDE.md` before changing anything.
- `index.html`, `sw.js` (root) — build output served by GitHub Pages. Do not edit by hand: they are copied from `source/dist/` by `.github/workflows/build.yml` after `npm run build` in `source/`.

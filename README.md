# مدينتي بعيوني — My City, My Story

لعبة ثلاثية الأبعاد لاستكشاف المدينة المنورة: ٢٩ مكانًا في اتجاهاتها الحقيقية.

- **`index.html` و`sw.js` في أعلى المستودع** هما اللعبة الجاهزة (ملف واحد)، وهما ما يعرضه GitHub Pages.
- **مجلد `source/`** فيه الشيفرة المصدرية كاملة. للتشغيل محليًا: `cd source && npm ci && npm run dev`.
- عند تعديل أي شيء داخل `source/` يعيد ملف `.github/workflows/build.yml` بناء اللعبة ويحدّث الملفين في الأعلى تلقائيًا.

**GitHub Pages:** Settings ← Pages ← Source: **Deploy from a branch** ← الفرع **main** والمجلد **/ (root)**.

---

A 3D game for exploring Madinah — 29 places on their real bearings.

- **`index.html` + `sw.js` at the repository root** are the built game (one self-contained file) that GitHub Pages serves.
- **`source/`** holds the full source. Run locally: `cd source && npm ci && npm run dev`. Project guide for AI assistants: `source/CLAUDE.md`.
- Pushing changes under `source/` triggers `.github/workflows/build.yml`, which rebuilds the game and refreshes the root files.

**GitHub Pages:** Settings → Pages → Source: **Deploy from a branch** → branch **main**, folder **/ (root)**.

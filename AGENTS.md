# AGENTS.md

## Cursor Cloud specific instructions

This is a client-only single-page app: **MTG Game Tracker** (Vite + React 19 + TypeScript). There is no backend, database, or server-side state — all data is persisted in the browser's `localStorage`. Deploy target is GitHub Pages (see `.github/workflows/deploy.yml`).

### Services

Single frontend service. Standard commands live in `package.json` scripts:
- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-check (`tsc -b`) then production build.
- `npm run lint` — ESLint.
- `npm run preview` — serve the production build.

### Non-obvious notes

- **Base path is `/tracker/`.** `vite.config.ts` sets `base: '/tracker/'`, so the dev server serves the app at `http://localhost:5173/tracker/` (the bare `http://localhost:5173/` will 404). The same applies to `npm run preview`.
- `npm run lint` currently reports one pre-existing error in `src/context/DataContext.tsx` (`react-refresh/only-export-components`). This exists on a clean checkout and is unrelated to any new changes.
- App state is kept in `localStorage`; to reset to an empty state, clear site data / localStorage in the browser.

# Nebi client prototype — Projects

Clickable prototype of the reworked Nebi **client** UI (post 2026-09-04 architecture pivot): Projects list, Create project, and the tab-less project details screen with the version rail, Create new version and Publish. Started 2026-09-25 from the Figma frames listed in `src/figma-map.json`.

Earlier prototypes (pre-pivot) are in `../_archive/`. Don't build on them.

## Run

```sh
npm install
npm run dev
```

Opens on http://localhost:5173 at the Projects list. `/screens` lists every screen in scope, whether it's built, and a link to its Figma frame.

Built so far: Projects list (`1774:2940`) and project details (`2898:9525`, `2903:8908`) with the 2026-09-25 version-row layout pass (`2940:11386`), plus install / uninstall, push, pull, the older-version confirmation and the pixi.toml viewer. Buttons for screens that aren't built yet show an "isn't in the prototype yet" toast. State is in memory, so a reload resets the sample data (`src/data/sample.ts`).

Deployed on Vercel from the `main` branch of `smeragoel/nebi-client-prototype`; every push redeploys.

## Stack

- React 19 + Vite + TypeScript, React Router for screen-to-screen links.
- **Nebari Design System (NDS)** components from the `@nebari` shadcn registry (`components.json`). They live in `src/components/ui/` and the theme tokens in `src/index.css`. Storybook: https://nebari-dev.github.io/nebari-design/
- Tailwind v4, using NDS token classes (`text-foreground`, `bg-muted`, `border-border` …). **No raw hex values or Tailwind palette colours** — if a token is missing, raise it on nebari-design rather than hard-coding.
- Fonts: Geist (sans) and IBM Plex Mono (code), per NDS.

`@base-ui/react` is pinned to **1.6.0** to match nebari-design's lockfile; 1.8.0 breaks the toast types. Bump it only when nebari-design does.

## Updating NDS components

```sh
npx shadcn@latest add @nebari/<name> --overwrite
```

This overwrites local edits to that component. Keep prototype-specific changes in `src/components/` (outside `ui/`), not in the NDS files.

## Layout

```
src/
  components/ui/   NDS components (registry-managed)
  components/      prototype-specific pieces
  screens/         one file per screen; add a route in App.tsx and a `path` in screens/Start.tsx
  components/details/  rail + panel for project details
  state/store.tsx  shared in-memory state (install, uninstall, push, pull)
  data/sample.ts   sample projects, versions and packages
  figma-map.json   screen → Figma node IDs (file Wu8VTFA5IO5BjbvifZJMyZ)
```

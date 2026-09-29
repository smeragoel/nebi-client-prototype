# Nebi client prototype — Projects

Clickable prototype of the reworked Nebi **client** UI (post 2026-09-04 architecture pivot): Projects list, Create project, and the tab-less project details screen with the version rail, Create new version and Publish. Started 2026-09-25 from the Figma frames listed in `src/figma-map.json`.

Earlier prototypes (pre-pivot) are in `../_archive/`. Don't build on them.

## Run

```sh
npm install
npm run dev
```

Opens on http://localhost:5173 at the Projects list. `/screens` lists every screen in scope, whether it's built, and a link to its Figma frame.

Built so far (every frame in Figma section `01 Projects` `1811:17438`, as of 2026-09-28):
- **Projects list** (`1774:2940`); clicking anywhere on a row opens the project. With the New project split button (`2310:19662`) and both **empty states**: not connected (`1774:15524`) and connected (`2314:9604`). Open them with `/?scenario=empty-not-connected` or `/?scenario=empty-connected`; `/?scenario=default` restores the sample data.
- **Create project** (`1811:19075`): the form (`2309:16943`) and the pixi.toml editor (`2675:8526`) on one page at `/projects/new` (`?mode=toml`), entries carried across when switching, a discard dialog on Cancel (`2671:8341`), and Create / Create and install landing on the new project (the form is replaced in history).
- **Project details** (`2898:9525`, `2903:8908`) after the 2026-09-28 consistency pass: 36px page padding, title + meta → description → status card, and rail rows that follow the live `Version row` component (`2931:11315`). The version list and the version details scroll separately; the rail's heading, notices and search stay put. Includes install (`2925:10612`), uninstall (`2923:24190`), push and in sync (`2925:25499`: "Pushing…", then the server marker slides into the laptop's row, the pair turns green, and the notice collapses), pull when the server is ahead (`2917:24512`) and the pixi.toml viewer.
- Both create pages keep the Cancel / Create bar stuck to the bottom of the window.
- **Create new version** (`2914:9164`) at `/projects/:id/new-version?from=N`, with the older-version confirmation (`2916:9418`). Tags move off older versions, invalid tags show the "must start with a letter" error, and "Suggested from your changes" fills the description from the package diff. Saving lands on the new version with the fading highlight and the "Version N created" toast with Push to server (`2925:11253`).
- **Publish** (`2969:13055`, the simplified copy): one switch per registry, Edit for repository:tag before the first publish, and a warning only on a published row being switched off.
- **Jobs** (section `05 Jobs` `2399:6910`, 2026-09-29): the list at `/jobs` (`2399:7084`) with search, Status / Job type / Project filters (the Project menu has its own search, `2764:13743`), Started sorting and the row menu (`2429:7793`); and one job at `/jobs/:id`, failed (`2431:7330`) or running (`2435:7405`: the log streams in, the duration ticks, Cancel job). Log search highlights matches; Copy and Download work. Job types, statuses and Nebi's own log lines come from `internal/models/job.go`, `internal/executor/local.go` and `internal/worker/worker.go` in nebari-dev/nebi. Installing, uninstalling, creating a project and creating a version add live jobs; the install strip's View log and the pull toast's View in Jobs open them.

Not built: the Publish after-save results state (`2922:10106`, still on the old copy), and anything not designed yet (Share, Compare versions, Filters, Delete project, Connect to server, pull flows). Those buttons show an "isn't in the prototype yet" toast. State is in memory, so a reload resets the sample data (`src/data/sample.ts`).

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
  components/details/  rail, panel and Publish dialog for project details
  components/form/     fields shared by Create project and Create new version
  state/store.tsx  shared in-memory state (install, uninstall, push, pull)
  data/sample.ts   sample projects, versions and packages
  figma-map.json   screen → Figma node IDs (file Wu8VTFA5IO5BjbvifZJMyZ)
```

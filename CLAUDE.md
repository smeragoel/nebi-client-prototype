# CLAUDE.md

Clickable prototype of the post-pivot Nebi client UI. See README.md for what's built and the Figma node IDs.

## House rules

- **Don't build on `../_archive/`.** Those are pre-pivot prototypes.
- **Styling uses NDS tokens only.** Use token classes (`text-foreground`, `bg-muted`, `border-border` …). No raw hex values or Tailwind palette colours. If a token is missing, raise it on nebari-design instead of hard-coding it.
- **Don't edit `src/components/ui/`.** Those are registry-managed NDS components, and `npx shadcn@latest add @nebari/<name> --overwrite` wipes local edits. Put prototype-specific changes in `src/components/`.
- **Keep `@base-ui/react` pinned at 1.6.0** to match nebari-design's lockfile (1.8.0 breaks the toast types). Bump it only when nebari-design does.
- **New screens:** one file in `src/screens/`, plus a route in `App.tsx` and a `path` in `screens/Start.tsx` so it shows up on `/screens`. Record its Figma node IDs in `src/figma-map.json`.
- **Undesigned features** (Compare versions, Filters, Delete project, Connect to server, pull flows) stay as the "isn't in the prototype yet" toast. Don't invent UI for them.
- **State is in memory.** Shared state lives in `src/state/store.tsx` and sample data in `src/data/sample.ts`. A reload resets everything.
- **Every push to `main` redeploys to Vercel** (`smeragoel/nebi-client-prototype`), so push only when asked.
- Fonts are Geist (sans) and IBM Plex Mono (code), per NDS.

## Commands

- `npm run dev`: dev server on http://localhost:5173 (uses `PORT` if set)
- `npm run build`: type-check and build
- `npm run lint`: oxlint

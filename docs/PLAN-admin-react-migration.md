# PLAN: Admin React Migration & Block Editor

## Goal

Migrate `/admin` from plain HTML/CSS/JS to **React + Vite**, then evolve it into a **block-based visual editor** that:

- Edits JSON for pages, blocks, and block styles
- Supports adding pages, drag-and-drop reordering, live preview
- Publishes via Vercel serverless `/api/publish` (commits JSON to this repo)

---

## Current State (Scanned)

| Item | Current state |
|------|----------------|
| **Admin** | `index.html` + `app.js` + `styles.css`; Vite already present (no React). Loads `/content/content.json` and `/content/manifest.json`, renders pages with text blocks, Reload/Publish, POSTs to `/api/publish`. |
| **Content** | `content.json`: `{ pages: [{ id, title, blocks: [{ type, text }] }] }`. `manifest.json`: schemaVersion, contentVersion, compatibleAppVersions, pagesOrder, featureFlags. |
| **API** | `api/publish.js`: Node serverless; validates body (manifest + content), commits both files to GitHub (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO). Returns `{ ok: true }` or `{ error }`. |
| **Vercel** | Root `vercel.json`: `buildCommand: "npm run build"`, `outputDirectory: "public"`. Root build runs `scripts/build.js` (npm install + build in admin, copy `admin/dist` → `public`). No explicit routes for `/admin` or `/api` (api folder may be auto-detected). |
| **Android** | Fetches manifest + content, validates, renders page title + `block.text` for each block (single block type in model). |

---

## Schema Evolution (Minimal)

- **content.json** (interpret/emit):
  - `pages`: `[{ id, title, route?, blocks: [{ id?, type, data?, styles? }] }]`
  - Existing files have no `route`, no block `id`/`data`/`styles`. Admin will **normalize** on load (add defaults) and **emit** full shape on save. `route`: default `"/"` for first page, else `"/<id>"`.
- **manifest.json**:
  - Keep: `schemaVersion`, `contentVersion`, `compatibleAppVersions`, `pagesOrder`, `featureFlags`.
  - On publish: admin regenerates `pagesOrder` from current pages list and writes both JSONs.

Backward compatibility: existing content/manifest remain valid; admin adds missing optional fields when building payload.

---

## Phases and File-by-File Changes

### Phase 1: React + Vite scaffold and routing

**Objective:** Admin is a React app built with Vite, served at `/admin`, with no editor UI yet.

| Action | File / Path |
|--------|-------------|
| Add deps | `admin/package.json`: add `react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript` (dev). |
| TS config | Add `admin/tsconfig.json` (and `admin/tsconfig.node.json` if needed) for Vite + React. |
| Vite config | `admin/vite.config.js` → `admin/vite.config.ts` (or keep .js): set `base: "/admin"`, ensure React plugin. |
| Entry | Add `admin/index.html`: keep single entry, change script to `src="/src/main.tsx"` (Vite resolves from project root). |
| Entry TSX | Add `admin/src/main.tsx`: `createRoot` + `StrictMode` + `App`. |
| App shell | Add `admin/src/App.tsx`: minimal layout (header + placeholder for sidebar/canvas/inspector+preview). |
| Styles | Add `admin/src/styles.css`: migrate existing `admin/styles.css` (box-sizing, body, container, buttons, etc.). |
| Root build | `scripts/build.js`: keep copying `admin/dist` → `public`; ensure output is under `public/admin` when using `base: "/admin"` (so copy `admin/dist` → `public/admin`). |
| Vercel | `vercel.json`: set `outputDirectory: "public"`. Add rewrites so `/admin` and `/admin/*` (non-asset) serve admin SPA: e.g. `"rewrites": [{ "source": "/admin", "destination": "/admin/index.html" }, { "source": "/admin/", "destination": "/admin/index.html" }]` and for client routes `"source": "/admin/:path*", "destination": "/admin/index.html"` (only when no static file); Vercel convention: put `public/admin/index.html` and SPA fallback for subpaths. |
| Remove old | Remove or replace `admin/app.js` usage from `index.html` (already using `main.tsx`). Keep `admin/index.html` as Vite entry; delete `admin/app.js` after migration. |

**Deliverables:** `npm run dev` from `admin` runs React app; `npm run build` from root produces `public/admin/` with index and assets; Vercel serves admin at `/admin`.

---

### Phase 2: Data layer and content loading

**Objective:** Load manifest + content from `/content/manifest.json` and `/content/content.json`; normalize and validate; expose to React state.

| Action | File / Path |
|--------|-------------|
| Types | Add `admin/src/types.ts`: types for Manifest, Content, Page, Block (id, type, data, styles), BlockData by type (text, hero, button). |
| JSON helpers | Add `admin/src/lib/json.ts`: `loadManifest()`, `loadContent()` (fetch with cache: "no-store"), `normalizeContent(content)`, `normalizeManifest(manifest)`, `validateManifest()`, `validateContent()`, `buildContentForPublish(pages)`, `buildManifestForPublish(manifest, pagesOrder)`. Normalize: ensure pages[].route, blocks[].id and styles. |
| State | In `App.tsx` (or a small store/context): state for manifest, content (pages), selectedPageId, selectedBlockId, isDirty, isPublishing, loadError, publishError. |
| Load on mount | On mount, call loadManifest + loadContent; on success normalize and set state; on failure set loadError. |
| Status area | In App (or a StatusBar component): show loading / loaded / error for load; later publish status. |

**Deliverables:** Admin loads both JSONs, normalizes, and holds them in React state; no UI for editing yet.

---

### Phase 3: Pages sidebar and page CRUD

**Objective:** Left sidebar: list pages (by manifest.pagesOrder), select page, add page, delete page (with confirm), reorder (up/down).

| Action | File / Path |
|--------|-------------|
| PageList | Add `admin/src/components/PageList.tsx`: list pages in `pagesOrder` order; highlight selected; on select set selectedPageId; "Add page" opens prompt for title, then create page (id = slug from title, route = "/" if first else "/<id>") and append to pages + pagesOrder; delete with confirm; up/down buttons to reorder in pages and pagesOrder. |
| App layout | In `App.tsx`: left sidebar with `<PageList />`; middle and right placeholders. |
| Dirty state | Any page add/delete/reorder or later block edit sets isDirty; Publish button disabled when !isDirty or isPublishing. |

**Deliverables:** Can add/delete/reorder pages and select current page; isDirty and Publish disabled state wired.

---

### Phase 4: Block canvas and block library (no DnD yet)

**Objective:** Middle canvas shows blocks of selected page; Block Library (Text, Hero, Button) to add blocks; select block for inspector; toolbar mode switch (Edit / Layout).

| Action | File / Path |
|--------|-------------|
| Block types / registry | Add `admin/src/blocks/TextBlock.tsx`, `HeroBlock.tsx`, `ButtonBlock.tsx`: presentational components that take block `data` and `styles` and render (for preview and later canvas). Add `admin/src/blocks/index.ts`: registry map type string → component. |
| BlockLibrary | Add `admin/src/components/BlockLibrary.tsx`: buttons "Text", "Hero", "Button"; on click add a new block (with generated id, default data/styles) to current page's blocks. |
| BlockCanvas | Add `admin/src/components/BlockCanvas.tsx`: list current page blocks; in Edit mode render block preview (no handle); in Layout mode show drag handle per block; on block click set selectedBlockId; no reorder yet. |
| App | Middle column = `<BlockCanvas />`; above or beside it `<BlockLibrary />` and mode switch (Edit / Layout). |
| Toolbar | Add toolbar (in App or small component): "Edit" | "Layout" toggle; when Layout, BlockCanvas shows handles and enables DnD (Phase 5). |

**Deliverables:** Can add blocks from library, see them in canvas, select block; Edit vs Layout mode; no drag-and-drop yet.

---

### Phase 5: Drag-and-drop reorder (blocks)

**Objective:** In Layout mode, reorder blocks via @dnd-kit.

| Action | File / Path |
|--------|-------------|
| Deps | `admin/package.json`: add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. |
| BlockCanvas | Wrap block list in `DndContext`, `SortableContext`; each block row a `useSortable` item; in Layout mode show drag handle and allow reorder; on drag end update page.blocks order and set isDirty. |

**Deliverables:** In Layout mode, blocks can be reordered by drag-and-drop.

---

### Phase 6: Inspector (block data + styles)

**Objective:** Right panel: when a block is selected, show block data fields (by type) and common styles (width, padding, color, textAlign, fontSize, etc.); inputs are simple (text, select, color).

| Action | File / Path |
|--------|-------------|
| Inspector | Add `admin/src/components/Inspector.tsx`: if no selection, show "Select a block"; else show block type, then type-specific data fields (e.g. text → textarea; hero → title + subtitle; button → label + url), then common style inputs (width, padding, color, textAlign, fontSize, etc.). On change update block in state and set isDirty. |
| Styles shape | Use a common `BlockStyles` type (width?, padding?, color?, textAlign?, fontSize?, etc.); persist in block.styles. |

**Deliverables:** Selecting a block shows editable data and styles; changes mark dirty.

---

### Phase 7: Preview panel

**Objective:** Right side: phone-sized preview that renders the selected page using the same block renderers, from current editor state (no network).

| Action | File / Path |
|--------|-------------|
| PreviewPhone | Add `admin/src/components/PreviewPhone.tsx`: fixed width (e.g. 375px) container; inside, render current page's blocks using the block registry (TextBlock, HeroBlock, ButtonBlock) with block.data and block.styles; optional device chrome (optional). |
| App layout | Right column: top or bottom = Inspector, below/above = PreviewPhone (or side-by-side as specified: inspector + preview on right). |

**Deliverables:** Phone-sized live preview of selected page with same block components.

---

### Phase 8: Publish and API

**Objective:** Publish button calls `/api/publish` with built manifest + content; show success message per spec; handle errors.

| Action | File / Path |
|--------|-------------|
| Build payload | Before publish: `buildManifestForPublish(manifest, pagesOrder)` and `buildContentForPublish(pages)`; ensure pagesOrder = current page ids in order. |
| Publish | On Publish click: if isPublishing or !isDirty return; set isPublishing; POST `/api/publish` with `{ manifest, content, message? }`; on 200 and `response.ok === true`: set status message to "Success, new changes are published, please allow ~5min for the changes to take affect in the app", clear isDirty, clear isPublishing; on error: set error message, clear isPublishing. |
| API response | Ensure `api/publish.js` returns `{ ok: true, commitSha }` on success and `{ ok: false, error }` (or 4xx/5xx with body `{ error }`) on failure. Update handler to return commitSha from `createGitHubCommit`. |
| Status area | Show load/publish states and errors in status bar. |

**Deliverables:** Publish flow end-to-end; exact success message; API returns commitSha; no GitHub secrets in client.

---

### Phase 9: Vercel config and fetch paths

**Objective:** Production and local behavior correct; admin at `/admin`; content and API paths work.

| Action | File / Path |
|--------|-------------|
| Fetch paths | In admin: load content with `fetch("/content/content.json")`, `fetch("/content/manifest.json")`; publish with `fetch("/api/publish", { method: "POST", ... })`. For local dev with Vite, use proxy or same origin: if admin runs at root in dev, proxy `/content` and `/api` to Vite dev server or document running `vercel dev` from root for full stack. |
| Vite proxy (optional) | In `admin/vite.config.ts`: if dev server is only admin, add proxy: `/content` → e.g. `http://localhost:3000/content` (or another origin where content is served); `/api` → same. Alternatively, document that `vercel dev` from repo root serves both admin and api and content. |
| vercel.json | Root: `buildCommand`, `outputDirectory: "public"`. Ensure `scripts/build.js` copies admin dist to `public/admin` and content to `public/content`. Add rewrites: `/admin` → `/admin/index.html`, `/admin/:path*` → `/admin/index.html` (for SPA fallback; Vercel usually skips if file exists). |
| API branch | `api/publish.js`: use `process.env.GITHUB_BRANCH || "main"` for ref. |

**Deliverables:** Local: `cd admin && npm i && npm run dev` works (with or without proxy); `vercel dev` from root tests full stack; production: `/admin` serves SPA, `/api/publish` and `/content/*` work.

---

### Phase 10: Polish and README

**Objective:** Dirty state, Publish disabled when clean or publishing; README with run locally and deploy.

| Action | File / Path |
|--------|-------------|
| App | Publish button disabled when !isDirty or isPublishing; Reload (optional) to re-fetch and discard local changes. |
| admin/README.md | Add "How to run locally": `cd admin && npm i && npm run dev`; optional: `vercel dev` from repo root to test with `/api` and `/content`. "How to deploy": connect repo to Vercel, set Root Directory to repo root, set env vars (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, optional GITHUB_BRANCH); build command builds admin and copies to public; admin at `/admin`, API at `/api/publish`. |
| Root README | Optionally add a short section pointing to admin at `/admin` and linking to `admin/README.md`. |

**Deliverables:** Clear UX and docs for local run and deploy.

---

## File Summary (New/Changed)

| Path | Action |
|------|--------|
| `admin/package.json` | Add react, react-dom, @dnd-kit/*, typescript, @types/*; scripts dev/build/preview. |
| `admin/tsconfig.json` | New. |
| `admin/vite.config.js` or `.ts` | base: "/admin", React plugin. |
| `admin/index.html` | Entry script src for main.tsx. |
| `admin/src/main.tsx` | New. |
| `admin/src/App.tsx` | New; layout, state, load, toolbar, status. |
| `admin/src/styles.css` | New; migrate from admin/styles.css. |
| `admin/src/types.ts` | New. |
| `admin/src/lib/json.ts` | New; load, normalize, validate, build. |
| `admin/src/components/PageList.tsx` | New. |
| `admin/src/components/BlockLibrary.tsx` | New. |
| `admin/src/components/BlockCanvas.tsx` | New; DnD in Layout mode. |
| `admin/src/components/Inspector.tsx` | New. |
| `admin/src/components/PreviewPhone.tsx` | New. |
| `admin/src/blocks/TextBlock.tsx` | New. |
| `admin/src/blocks/HeroBlock.tsx` | New. |
| `admin/src/blocks/ButtonBlock.tsx` | New. |
| `admin/src/blocks/index.ts` | New; registry. |
| `api/publish.js` | Ensure returns commitSha; support optional message, GITHUB_BRANCH. |
| `scripts/build.js` | Copy admin/dist → public/admin; copy content → public/content. |
| `vercel.json` | outputDirectory, rewrites for /admin SPA. |
| `admin/README.md` | How to run locally; how to deploy. |
| `admin/app.js` | Remove after migration. |
| `admin/styles.css` | Remove after migration to src/styles.css. |

---

## Implementation Order

1. **Phase 1** – React + Vite scaffold, base path, build output under `public/admin`, Vercel rewrites.
2. **Phase 2** – Types, `lib/json.ts`, load manifest + content, normalize, state in App.
3. **Phase 3** – PageList sidebar, page CRUD, selection, dirty state.
4. **Phase 4** – Block registry, BlockLibrary, BlockCanvas, Edit/Layout toolbar.
5. **Phase 5** – @dnd-kit in BlockCanvas for block reorder.
6. **Phase 6** – Inspector for block data and styles.
7. **Phase 7** – PreviewPhone with block renderers.
8. **Phase 8** – Publish flow, success message, API commitSha.
9. **Phase 9** – Fetch paths, proxy/vercel dev, vercel.json final.
10. **Phase 10** – Button states, README, root README optional.

---

## Notes

- **Relative fetch paths:** Use `/content/content.json`, `/content/manifest.json`, `/api/publish` so they work on Vercel (same origin).
- **Android compatibility:** Extend content schema with optional `data`/`styles` and new block types; Android can ignore unknown keys until app is updated; admin emits backward-compatible text blocks (type + text) plus new fields when used.
- **Block types:** Start with Text, Hero, Button; Hero = title + subtitle (or image url); Button = label + url. Data shapes in `types.ts` and Inspector.

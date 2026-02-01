# Web2App CMS — Project Summary

This document organizes the project into **Frontend (admin)**, **API**, and **App (Android)** so it can be shared and understood quickly in subsequent Cursor windows.

---

## Project overview

**Web2App CMS** is a system for managing app content outside the Android app. Admins edit structured JSON in a block-based editor; the Android app fetches that JSON and renders it natively. Content can change without releasing a new APK.

**Data flow:** Admin (edit) → Publish → GitHub (content/manifest.json, content/content.json) → App fetches JSON from BASE_URL and renders.

**Root folders:**

| Folder   | Role |
|----------|------|
| `admin/` | React admin UI (block editor, publish) |
| `api/`   | Serverless publish endpoint (writes to GitHub) |
| `android/` | Kotlin/Compose app that consumes JSON |
| `content/` | Stored JSON and schema (manifest.json, content.json) |
| `docs/`  | Project docs and plans |
| `scripts/` | Root build script (installs admin, builds, copies to public) |

**Root build:** From repo root, `npm run build` runs `scripts/build.js`: installs admin deps, builds admin, copies `admin/dist` → `public/admin`, copies `content/` → `public/content`. Deploy output is `public/` (see `vercel.json`).

---

## 1. Frontend — `/admin`

### Purpose

Block-based visual editor to manage pages and content. Loads `manifest.json` and `content.json`, lets users add/edit/reorder pages and blocks (text, hero, button, grid), edit block data and styles, and **Publish** changes via `POST /api/publish`.

### Tech stack

- **React 18** + **TypeScript**
- **Vite 7** — dev server, build; `base: "/admin"`
- **Tailwind CSS** — styling
- **@dnd-kit** — drag-and-drop (pages, blocks, layout presets, canvas/cell drops)
- **react-icons** (e.g. HiOutlinePlus, MdSmartphone)
- **Devices.css** (picturepan2) — device frames in preview

### Entry and config

- **Entry:** `admin/index.html` → `admin/src/main.tsx` → `App.tsx`
- **Vite:** `admin/vite.config.ts` — base `/admin`, optional proxy to `VERCEL_DEV_URL` for `/content` and `/api`
- **Content in dev:** `predev`/`prebuild` run `admin/scripts/copy-content.js` to copy repo `content/` → `admin/public/content/`; Vite also has a middleware that serves `../content/` for `/content/*` when not using proxy

### Key files (admin/src)

| File | Role |
|------|------|
| **App.tsx** | Root state (manifest, pages, selectedPageId, selectedBlockId, editorMode, loadStatus, isDirty, isPublishing). Loads manifest + content via `lib/json`, validates, reorders pages by manifest. Handles publish (POST /api/publish), page CRUD, block add/reorder/delete/update, grid cell drops. DnD context and drag overlay. Layout: PageList \| BlockLibrary+BlockCanvas \| Inspector \| PreviewPhone. |
| **types.ts** | EditorMode, Manifest, Page, Block, BlockData (Text/Hero/Button/Grid), BlockStyles, RawBlock/RawPage/RawContent, ContentPayload. |
| **lib/json.ts** | Load manifest/content from `/content/manifest.json` and `/content/content.json`. Normalize and validate. `createBlock(type)`, `createGridBlock(columns)`. `buildContentForPublish`, `buildManifestForPublish` for API payload. |
| **blocks/index.ts** | Block registry and `getBlockComponent(type)` → TextBlock, HeroBlock, ButtonBlock, GridBlock. |
| **blocks/TextBlock.tsx, HeroBlock.tsx, ButtonBlock.tsx, GridBlock.tsx** | Presentational block components; accept `data` and `styles`. Grid renders cells and nested blocks. |
| **components/PageList.tsx** | Sortable page list; add page, edit title, delete (with Modal). Uses SortableContext + useSortable. |
| **components/BlockLibrary.tsx** | Buttons to add Text/Hero/Button blocks; draggable for dropping onto canvas or grid cells. |
| **components/BlockCanvas.tsx** | Renders current page blocks; sortable rows, inline editing for text/hero/button, grid cells with CellDropZone and nested blocks. Delete block with confirmation Modal. |
| **components/CanvasDropZone.tsx** | Droppable area for layout presets (dropping adds grid to canvas). |
| **components/Inspector/index.tsx** | Tabs Edit / Layout; Edit → EditInspector, Layout → LayoutInspector. |
| **components/Inspector/EditInspector.tsx** | Block type label, data fields (by type), and style fields (width, padding, color, textAlign, fontSize, backgroundColor). Button url → page route select. |
| **components/Inspector/LayoutInspector.tsx** | Add layout block presets (2–12 columns), draggable; when a grid block is selected, grid styles (gap, padding, backgroundColor). |
| **components/PreviewPhone.tsx** | Device frame preview; uses `useFitScale` and Devices.css classes; renders current page title + blocks via block registry. |
| **components/Modal.tsx** | Reusable modal (overlay, title, actions, escape/overlay close). |
| **utils/useFitScale.ts** | Scale to fit a given width inside a ref (for preview phone). |
| **utils/useScrollTopShadow.ts** | Exposes showShadow when scroll is past threshold (for sticky headers). |

### Editor modes

- **Edit:** Select blocks, edit inline on canvas or in EditInspector; BlockLibrary add/drag blocks; reorder blocks.
- **Layout:** Add layout (grid) presets from Inspector (click or drag to canvas); drop content blocks into grid cells. Switching to an input focuses Edit mode.

### Publish flow (admin → API)

1. User clicks Publish when `isDirty` and content is valid.
2. `buildManifestForPublish(manifest, pagesOrder)` and `buildContentForPublish(pages)`.
3. `POST /api/publish` with body `{ manifest, content }`.
4. On success, UI shows success message and clears dirty state.

### Run and build

- **Dev (admin only):** `cd admin && npm i && npm run dev` → http://localhost:5173/admin (content from public/content or middleware).
- **Full stack (admin + API + content):** From root, `vercel dev` → open printed URL (e.g. /admin). Optional: set `VERCEL_DEV_URL` and proxy from Vite to that URL.
- **Build:** Root `npm run build` builds admin and populates `public/admin` and `public/content`.

---

## 2. API — `/api`

### Purpose

Single serverless endpoint: **POST /api/publish**. Accepts manifest + content JSON, validates, then commits `content/manifest.json` and `content/content.json` to the connected GitHub repo (creates blobs, tree, commit, updates branch).

### File

- **api/publish.js** — Node serverless handler (Vercel serverless function).

### Behavior

1. **Method:** Only POST; otherwise 405.
2. **Env:** Requires `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`. Optional `GITHUB_BRANCH` (default `main`). If `VERCEL_GIT_REPO_OWNER` and `VERCEL_GIT_REPO_SLUG` are set, request is rejected unless they match owner/repo (prevents publishing to wrong repo).
3. **Body:** JSON `{ manifest, content [, message ] }`.
4. **Validation:** `validatePayload` checks manifest (schemaVersion, contentVersion, compatibleAppVersions.min/max, pagesOrder array) and content (pages array, each page id/title/blocks, each block type and required data/text). Returns 400 with error message if invalid.
5. **GitHub:** Reads branch ref, base commit, creates blobs for manifest and content JSON, creates tree with `content/manifest.json` and `content/content.json`, creates commit, PATCH ref. Uses GitHub REST API with Bearer token. Commit message from body or default "Update CMS content".
6. **Response:** 200 `{ ok: true, commitSha? }` or 500/403/400 `{ ok: false, error }`.

### Environment variables (for deploy)

- `GITHUB_TOKEN` — PAT with repo write.
- `GITHUB_OWNER` — org or user.
- `GITHUB_REPO` — repo name.
- `GITHUB_BRANCH` — (optional) branch to update; default `main`.

### Content paths written

- `content/manifest.json`
- `content/content.json`

---

## 3. App — `/android`

### Purpose

Android app that fetches `manifest.json` and `content.json` from a configurable BASE_URL, validates them, and renders pages and blocks with Jetpack Compose. No WebView; native UI only. Current implementation fetches on launch (no offline cache layer in code described here; see android/README for intended caching/offline design).

### Tech stack

- **Kotlin**, **Jetpack Compose**, **Material 3**
- **OkHttp** — HTTP for manifest and content JSON
- **kotlinx.serialization** — JSON parsing (custom parsing in MainActivity; models use @Serializable where applicable)
- **Coroutines** — IO and UI

### Config

- **android/app/build.gradle.kts:** `buildConfigField("String", "BASE_URL", "\"https://web2app-cms.vercel.app\"")` — change for your deployment. App fetches `BASE_URL/content/manifest.json` and `BASE_URL/content/content.json`.
- **AndroidManifest.xml:** INTERNET permission; single Activity (MainActivity) as launcher.

### Key files

| File | Role |
|------|------|
| **MainActivity.kt** | Sets up Compose, LaunchedEffect to fetch manifest then content, parse (custom parseManifest/parseContent/parseBlock), validate (validateManifest, validateContent). UiState: Loading / Loaded(ScreenState) / Error. Renders: Loading text, Error message, or Scrollable column with page title and BlockContent for each block. Navigation: currentPageId state; button URLs trigger in-app page switch by route or open external URL via Intent. BlockContent: text, hero, button, grid (cells with nested BlockContent). parseColor for CSS-like colors (hex + names) for backgroundColor. |
| **model/Content.kt** | Content, Page, Block (type, text, data, styles). BlockData sealed: Hero, Button, Grid. GridCell. BlockStyles(backgroundColor, color). |
| **model/Manifest.kt** | Manifest (schemaVersion, contentVersion, compatibleAppVersions, pagesOrder, featureFlags). CompatibleAppVersions, FeatureFlags. |
| **ui/theme/** | Material theme (Color, Theme, Type). |

### JSON consumption

- **Manifest:** schemaVersion, contentVersion, compatibleAppVersions.min/max, pagesOrder, featureFlags (showWelcomeBanner, enableHelpLink). Used to validate and to pick first page (pagesOrder.firstOrNull()).
- **Content:** pages[].id, title, blocks[]. For each block: type, optional top-level text, data (hero: title/subtitle/imageUrl; button: label/url; grid: columns, cells[].id, cells[].blocks). styles (backgroundColor, color). App validates and renders; button url can be in-app route (e.g. /about) or external link.

### Block rendering (Compose)

- **text:** MaterialTheme Text with block.text.
- **hero:** Column with title (headlineSmall) and subtitle (bodyMedium).
- **button:** Button; onClick calls onNavigate(url) — in-app page switch or Intent.OPEN.
- **grid:** Row with Columns per cell; each cell renders nested blocks via BlockContent.

### Folder structure (from android/README)

- `app/` — app module, MainActivity, manifest.
- Models live under `com.web2app.cms.model` (Content.kt, Manifest in separate package `model/Manifest.kt`).
- `ui/theme/` — Compose theme.

---

## Shared content and schema

### Location

- **Repo:** `content/manifest.json`, `content/content.json`.
- **Served (production):** After root build, `public/content/` is deployed; admin and app use the same JSON (admin from `/content/*`, app from `BASE_URL/content/*`).

### manifest.json

- schemaVersion, contentVersion, compatibleAppVersions.{min,max}, pagesOrder (list of page ids), featureFlags (e.g. showWelcomeBanner, enableHelpLink). See `content/SCHEMA.md`.

### content.json

- **pages:** Array of { id, title, route?, blocks }.
- **blocks:** Each has id, type (`text` | `hero` | `button` | `grid`), data (type-specific), styles (optional). Text blocks may have top-level `text` for compatibility. Grid blocks: data.columns, data.cells[].id, data.cells[].blocks (nested blocks). See `content/SCHEMA.md`.

### Conventions

- Preserve in manifest: schemaVersion, contentVersion, compatibleAppVersions.min/max, pagesOrder.
- Preserve in content: pages[].id, pages[].title, pages[].blocks[].type, pages[].blocks[].text (for text).
- pagesOrder must reference page ids that exist in content.json.

---

## Quick reference for Cursor

- **Editing admin UI:** Work in `admin/src` (App.tsx, components, blocks, lib, types). Use double quotes and arrow functions.
- **Changing publish behavior:** `api/publish.js` (validation, GitHub commit).
- **Changing app behavior / parsing / UI:** `android/` (MainActivity.kt, model/Content.kt, model/Manifest.kt). BASE_URL in `android/app/build.gradle.kts`.
- **Changing content shape:** Update `content/SCHEMA.md`, admin `types.ts` and `lib/json.ts`, API validation in `api/publish.js`, and Android parsing/validation in MainActivity.kt and models.
- **Deploy:** Connect repo to Vercel; root build command `npm run build`, output `public`. Set GITHUB_* env vars for Publish. Admin at `/admin`, API at `/api/publish`, content at `/content/*`.

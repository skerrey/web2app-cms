# Web2App CMS Admin

Block-based visual editor for managing pages and content. Edit pages, add/reorder blocks (Text, Hero, Button, Image, Grid), edit block data and styles, and publish changes to the repo via the `/api/publish` endpoint.

## Features

- **Block-based editor** - Text, Hero, Button, Image, and Grid blocks
- **Visual editing** - Drag-and-drop interface with live preview
- **Settings dialog** - Configure GitHub publishing with connection testing
- **Auto-save** - Changes automatically saved to browser localStorage
- **Preview mode** - Test without publishing to GitHub
- **Publishing mode** - Commit changes directly to GitHub

## How to Run Locally

### Preview Mode (No Publishing)

From the **admin** folder:

```bash
cd admin
npm install
npm run dev
```

- The app runs at **http://localhost:5173/admin**
- Content is loaded from `/content/manifest.json` and `/content/content.json`
- Changes save to browser localStorage automatically
- Publishing is disabled (preview only)

### Publishing Mode (With GitHub)

1. Create `admin/.env.local` with:

```bash
PREVIEW=false
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
```

2. Run the dev server:

```bash
cd admin
npm install
npm run dev
```

3. Open http://localhost:5173/admin
4. Click the Settings icon (⚙️) to test your connection
5. Make changes and click Publish to commit to GitHub

**Note:** The `/api/publish` endpoint is not available when only running Vite. To test the full stack (admin + content + API) locally, run from the **repo root**:

```bash
vercel dev
```

Then open the URL Vercel prints (e.g. http://localhost:3000/admin).

## Settings Dialog

Click the Settings icon (⚙️) in the header to:

- **View connection status** - See if GitHub is configured
- **Test connection** - Verify your credentials work
- **View preview mode status** - Check if publishing is enabled
- **Read setup instructions** - Step-by-step guide for configuration

## localStorage Persistence

The admin automatically saves your changes to browser localStorage:

- **Auto-save** - Every change is saved immediately
- **Survives refresh** - Content persists across browser sessions
- **Preview only** - localStorage is for preview, not publishing
- **Clear local changes** - Click "Reload" to discard and reload from server

**Note:** localStorage only stores content and manifest, never GitHub credentials.

## Preview Mode vs Publishing Mode

### Preview Mode (`PREVIEW=true`)
- Publishing is disabled
- Changes save to browser only
- Perfect for testing and demos
- No GitHub credentials needed

### Publishing Mode (`PREVIEW=false`)
- Publishing is enabled
- Changes can be committed to GitHub
- Requires GitHub credentials
- Changes still auto-save to localStorage

## How to Deploy

1. Connect this repo to [Vercel](https://vercel.com) and create a project
2. Set the **Root Directory** to the repo root (leave blank or `.`)
3. **Build**: Vercel runs `npm run build` from the root
4. **Output**: `outputDirectory` is `public`. The admin UI is served at **/admin**
5. **Environment variables** (add in Vercel project settings):
   - `PREVIEW` – Set to `false` to enable publishing
   - `GITHUB_TOKEN` – GitHub personal access token with `repo` scope
   - `GITHUB_OWNER` – GitHub org or user (e.g. `your-org`)
   - `GITHUB_REPO` – Repo name (e.g. `web2app-cms`)
   - `GITHUB_BRANCH` – (optional) Branch to commit to; default `main`

After deploy, the admin is at **https://your-project.vercel.app/admin** and Publish commits updated `content/manifest.json` and `content/content.json` to the connected GitHub repo.

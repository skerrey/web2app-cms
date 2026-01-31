# Web2App CMS Admin

Block-based visual editor for managing pages and content. Edit pages, add/reorder blocks (Text, Hero, Button), edit block data and styles, and publish changes to the repo via the `/api/publish` endpoint.

## How to run locally

From the **admin** folder:

```bash
cd admin
npm i
npm run dev
```

- The app runs at **http://localhost:5173/admin** (Vite uses `base: "/admin"`).
- Content is loaded from `/content/manifest.json` and `/content/content.json`. The `predev` script copies the repo `content/` into `admin/public/content/`, so in dev the content is served from there.
- **Publish** (`/api/publish`) is not available when only running Vite. To test the full stack (admin + content + API) locally, run from the **repo root**:

  ```bash
  vercel dev
  ```

  Then open the URL Vercel prints (e.g. http://localhost:3000/admin).

- Optional: to use Vite dev (5173) with API/content from another port, set `VERCEL_DEV_URL` (e.g. `http://localhost:3000`) and run `vercel dev` on that port; Vite will proxy `/content` and `/api` to it.

## How to deploy

1. Connect this repo to [Vercel](https://vercel.com) and create a project.
2. Set the **Root Directory** to the repo root (leave blank or `.`).
3. **Build**: Vercel runs `npm run build` from the root, which installs and builds the admin app and copies output to `public/admin` and `content/` to `public/content`.
4. **Output**: `outputDirectory` is `public`. The admin UI is served at **/admin**; the API at **/api/publish**; content at **/content/**.
5. **Environment variables** (for Publish to work):
   - `GITHUB_TOKEN` – GitHub personal access token with repo write (e.g. `repo` scope).
   - `GITHUB_OWNER` – GitHub org or user (e.g. `your-org`).
   - `GITHUB_REPO` – Repo name (e.g. `web2app-cms`).
   - `GITHUB_BRANCH` – (optional) Branch to commit to; default `main`.

After deploy, the admin is at **https://your-project.vercel.app/admin** and Publish commits updated `content/manifest.json` and `content/content.json` to the connected GitHub repo.

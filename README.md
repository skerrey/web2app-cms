# Web2App CMS

Web2App CMS is a simple system for managing app content outside the Android app. It lets an admin prepare structured content as JSON so the Android app can show updated content without changing the app itself.

It solves the problem of keeping app content current when the app release cycle is slower than content changes.

## High Level Architecture

```
Admin → JSON → Android App
```

## Quick Start (Preview Mode)

Want to try it out immediately? Clone and run:

```bash
git clone https://github.com/skerrey/web2app-cms.git
cd web2app-cms/admin
npm install
npm run dev
```

Open http://localhost:5173/admin and start editing! Your changes will save to your browser automatically. **Note:** Publishing is disabled in preview mode - changes are local only.

## Setup for Publishing (Your Own Repo)

To publish changes to your own GitHub repository:

### 1. Clone the Repository

```bash
git clone https://github.com/skerrey/web2app-cms.git
cd web2app-cms
```

### 2. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name (e.g., "Web2App CMS")
4. Select scope: **`repo`** (full repository access)
5. Click "Generate token" and copy it

### 3. Configure Environment Variables

Create a file `admin/.env.local` with:

```bash
PREVIEW=false
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
```

**Important:** You must set `PREVIEW=false` to enable publishing.

### 4. Run Locally

```bash
cd admin
npm install
npm run dev
```

Open http://localhost:5173/admin - you can now publish changes to GitHub!

### 5. Deploy to Vercel (Optional)

1. Push your repo to GitHub
2. Import to Vercel: https://vercel.com/new
3. Add environment variables in Vercel project settings:
   - `PREVIEW=false`
   - `GITHUB_TOKEN=your_token`
   - `GITHUB_OWNER=your_username`
   - `GITHUB_REPO=your_repo_name`
4. Deploy!

## Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `PREVIEW` | `true` = Changes save to browser only (demo mode)<br>`false` = Enables publishing to GitHub | Yes |
| `GITHUB_TOKEN` | Personal access token with `repo` scope | When `PREVIEW=false` |
| `GITHUB_OWNER` | Your GitHub username or organization | When `PREVIEW=false` |
| `GITHUB_REPO` | Repository name | When `PREVIEW=false` |
| `GITHUB_BRANCH` | Branch to commit to (defaults to `main`) | No |

## Project Structure

- **`admin/`** - React + Vite block editor; served at `/admin` when deployed. See [admin/README.md](admin/README.md)
- **`content/`** - Stored content and assets used by the system
- **`android/`** - Android app workspace that consumes the content
- **`docs/`** - Project documentation and guides
- **`api/`** - Serverless API endpoints for publishing

## What This System Does Not Do

- It does not define app features beyond content delivery
- It does not replace app development or app releases
- It does not provide analytics, marketing, or advertising tools

## Resetting Content with New JSON
- Example JSON files live in `content/manifest.json` and `content/content.json`.
- You can replace both files to reset the project without changing Android code.
- Preserve these fields in `manifest.json`: `schemaVersion`, `contentVersion`, `compatibleAppVersions.min`, `compatibleAppVersions.max`, `pagesOrder`.
- Preserve these fields in `content.json`: `pages[].id`, `pages[].title`, `pages[].blocks[].type`, `pages[].blocks[].text`.
- `pagesOrder` must reference page IDs that exist in `content.json`.
- `BASE_URL` is configured in `android/app/build.gradle.kts` as `buildConfigField("String", "BASE_URL", ...)`.

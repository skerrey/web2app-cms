# Vercel Deployment

This project can be hosted as static files. There is no backend and no database.

## Publicly Hosted Folders

- The admin editing tool is built and served at the site root (`/`).
- `content/` is hosted for `content.json` and `manifest.json`.
- `docs/` can be hosted for public documentation if desired.
- `android/` is not hosted on Vercel.

## Expected URLs

Replace `your-project.vercel.app` with your actual Vercel domain.

- Admin tool: `https://your-project.vercel.app/`
- Content JSON: `https://your-project.vercel.app/content/content.json`
- Manifest JSON: `https://your-project.vercel.app/content/manifest.json`
- APK files: `https://your-project.vercel.app/apk/your-app.apk`

## What A New User Must Configure After Forking

- Create a Vercel project from the forked repo.
- Set the **Root Directory** to the project root (leave blank or `.`) so the build uses `scripts/build.js` and outputs to `public/`.
- Deploy the project and note the public URL.
- Update `BASE_URL` in `android/app/build.gradle.kts` to your deployed URL (e.g. `https://your-project.vercel.app`).
- Upload APK files to an `apk/` folder in the repo if you want them hosted.

## Why Static Hosting Is Sufficient

- The admin tool is a static page that runs in the browser.
- The JSON files are plain files that can be downloaded directly.
- The Android app only needs a URL to read the latest JSON.

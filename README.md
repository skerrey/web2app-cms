Web2App CMS is a simple system for managing app content outside the Android app. It lets an admin prepare structured content as JSON so the Android app can show updated content without changing the app itself.

It solves the problem of keeping app content current when the app release cycle is slower than content changes.

High level architecture:

Admin
  |
  v
 JSON
  |
  v
Android App

Role of each folder:
- `admin/`: The admin area for managing and organizing content. React + Vite block editor; served at `/admin` when deployed. See [admin/README.md](admin/README.md) for how to run locally and deploy.
- `content/`: Stored content and assets used by the system.
- `android/`: The Android app workspace that consumes the content.
- `docs/`: Project documentation and guides.

What this system does not do:
- It does not define app features beyond content delivery.
- It does not replace app development or app releases.
- It does not provide analytics, marketing, or advertising tools.

Resetting content with new JSON
- Example JSON files live in `content/manifest.json` and `content/content.json`.
- You can replace both files to reset the project without changing Android code.
- Preserve these fields in `manifest.json`: `schemaVersion`, `contentVersion`, `compatibleAppVersions.min`, `compatibleAppVersions.max`, `pagesOrder`.
- Preserve these fields in `content.json`: `pages[].id`, `pages[].title`, `pages[].blocks[].type`, `pages[].blocks[].text`.
- `pagesOrder` must reference page IDs that exist in `content.json`.
- `BASE_URL` is configured in `android/app/build.gradle.kts` as `buildConfigField("String", "BASE_URL", ...)`.

# Content JSON v1

This file explains each field in `manifest.json` and `content.json`.

## manifest.json

- `schemaVersion`: The schema version for these JSON files.
- `contentVersion`: The version of the content set. Update this when content changes.
- `compatibleAppVersions`: The range of app versions that can use this content.
- `compatibleAppVersions.min`: The oldest supported app version.
- `compatibleAppVersions.max`: The newest supported app version.
- `pagesOrder`: The ordered list of page IDs used for navigation.
- `featureFlags`: On or off switches for app features.
- `featureFlags.<flagName>`: A single feature flag value.

## content.json

- `pages`: The list of pages available in the app.
- `pages[].id`: The unique ID for the page. Must match an ID in `pagesOrder`.
- `pages[].title`: The page title shown in navigation.
- `pages[].blocks`: The ordered content blocks for a page.
- `pages[].blocks[].type`: The block type. Use `text` for a text block.
- `pages[].blocks[].text`: The plain text content for a text block.

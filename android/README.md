Android app architecture for Web2App CMS.

## Overview

The app is built with Kotlin and Jetpack Compose. It is offline first and renders UI from JSON content. It does not use WebView and does not require a local database for v1.

## Folder Structure

- `app/`: Android app module and entry points.
- `core/`: Shared models, JSON parsing, and validation.
- `network/`: JSON download and update checks.
- `cache/`: File based storage for JSON and assets.
- `ui/`: Jetpack Compose screens and UI state.
- `features/`: Feature specific UI and logic grouped by page or section.
- `assets/`: Built in fallback JSON and static resources.

## Major Responsibilities

- Networking: Fetch `content.json` when online and check for new versions.
- Caching: Store the latest valid JSON on disk for offline use.
- Rendering: Convert JSON pages and blocks into Compose UI.

## JSON Flow

1. App starts and reads cached JSON from disk.
2. Cached JSON is parsed and validated into app models.
3. UI renders pages and blocks from the models.
4. When online, the app fetches the latest JSON and replaces the cache if valid.
5. UI refreshes using the updated models.

## Updates

- APK update required: Changes to app features, navigation logic, JSON parser rules, or UI components.
- JSON only update: New page content, updated text blocks, reordered pages, or feature flag values.

# Update Strategy

This document explains how content updates and app updates work for Web2App CMS.

## How Content Updates Work

- The app reads `content.json` from local storage on startup.
- When online, the app checks for a newer `content.json`.
- JSON is the trigger mechanism. If the JSON version is newer, the app downloads it.
- The app validates the JSON and replaces the local copy only if it is valid.
- Updated content is shown the next time the app reads the JSON.

## How APK Updates Are Detected

- The JSON includes a required minimum app version.
- When the app reads JSON, it compares its app version to the required minimum.
- If the app version is lower, the app reports that an update is required.

## Required vs Optional Updates

- Required update: JSON sets a minimum app version higher than the current app version.
- Optional update: JSON sets a recommended app version higher than the current app version.
- If a recommended version is provided, the app can inform the user, but it still runs.

## Offline Behavior

- If the app is offline, it uses the last valid JSON.
- If no JSON is available, the app uses built in fallback content.
- The app does not attempt background updates without network access.

## Failure Scenarios

- Invalid JSON: The app keeps the last valid JSON and reports an error state.
- Network failure: The app continues with cached JSON and tries again later.
- Missing JSON: The app uses fallback content and reports a warning.
- Required update detected while offline: The app shows an update required message and cannot proceed until the app is updated.

## Notes

- There is no Play Store flow in this strategy.
- There are no silent installs.
- There are no push notifications.

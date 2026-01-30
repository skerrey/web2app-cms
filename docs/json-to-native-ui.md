# JSON To Native UI Mapping

This document defines how JSON content maps to native UI in the Android app.

## Mapping Table

| JSON Block Type | Native UI Component | Notes |
| --- | --- | --- |
| `text` | Compose Text | Renders plain text only. |

## Rules For Extensibility

- Add new block types only when a single, clear native component can render them.
- Each new block type must map to exactly one UI component.
- Keep block properties small and readable for editors.
- Avoid conditional rendering rules inside a single block type.
- When in doubt, create a new block type rather than add flags.

## APK Update Requirements

- Adding a new block type requires an APK update.
- Changing how a block type renders requires an APK update.
- Adding new fields to an existing block type requires an APK update.
- Reordering pages or updating text content does not require an APK update.

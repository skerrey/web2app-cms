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
- `admin/`: The admin area for managing and organizing content.
- `content/`: Stored content and assets used by the system.
- `android/`: The Android app workspace that consumes the content.
- `docs/`: Project documentation and guides.

What this system does not do:
- It does not define app features beyond content delivery.
- It does not replace app development or app releases.
- It does not provide analytics, marketing, or advertising tools.

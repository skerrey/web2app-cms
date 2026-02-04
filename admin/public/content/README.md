Content storage and editorial assets for the CMS.

## APK for /download page

To have the "Download the APK" link work on the live site (e.g. Vercel), the APK must be in the build output. The build script copies an APK from either:

1. **`android/app/build/outputs/apk/debug/app-debug.apk`** (after building the Android app locally), or  
2. **`content/app-debug.apk`** (committed in the repo; used on Vercel where Android is not built).

**To deploy the APK:**

1. Build the Android app: from repo root, `cd android && ./gradlew assembleDebug` (or use Android Studio).
2. Copy the APK into content:  
   `cp android/app/build/outputs/apk/debug/app-debug.apk content/app-debug.apk`
3. Commit and push:  
   `git add content/app-debug.apk && git commit -m "Add APK for download page" && git push`

On the next deploy, the build will copy `content/app-debug.apk` to `public/app-debug.apk`, and `/app-debug.apk` (and the download page) will serve the real file instead of `index.html`.

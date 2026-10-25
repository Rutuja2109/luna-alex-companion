# Luna & Alex on your phone (Expo)

This Expo app opens the Luna & Alex web app full-screen on your phone.

## One-time: publish the web app
1. On GitHub open **Settings → Pages** for `luna-alex-companion`.
2. Source: **Deploy from a branch**, Branch: **main**, Folder: **/docs**, Save.
3. After a minute the app is at https://rutuja2109.github.io/luna-alex-companion/app/
   (you can also open that link straight in your phone's browser).

## Run it in Expo Go
1. Install **Expo Go** from the App Store / Google Play.
2. On your computer (Node 18+):
   ```bash
   cd mobile
   npm install
   npx expo install --fix      # lines up react / react-native / webview with your Expo version
   npx expo start --tunnel     # --tunnel works even if phone and computer are on different Wi-Fi
   ```
3. Scan the QR code with your phone camera (iOS) or the Expo Go app (Android).

**No computer?** Go to https://snack.expo.dev, replace `App.js` with this folder's `App.js`,
add `react-native-webview` when Snack asks, and scan the QR code with Expo Go.

## AI replies on the phone
Outside claude.ai the app has no built-in AI, so chat runs in the labelled
**offline mode**. For real replies, deploy `server/worker.js` with your own
Claude API key and put its URL in `docs/app/config.js`.

## What's native and what isn't
Everything runs inside a WebView. Voice input uses the phone's browser engine
(not available in every WebView; the app falls back to typing). Push
notifications, native voice and the camera need native modules: that's the
next step (see `replica/fixes.md`).

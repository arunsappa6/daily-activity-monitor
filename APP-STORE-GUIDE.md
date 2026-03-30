# App Store Publishing Guide — Daily Activity Monitor

Your website is now a **Progressive Web App (PWA)**. This means it can be
published to both the Google Play Store and the Apple App Store without
rewriting any code.

---

## What Was Added to Your Website

Three new files have been added:

| File | Purpose |
|---|---|
| `manifest.json` | Tells browsers and app stores the app name, icons, colors |
| `sw.js` | Service worker — enables offline use and "Install App" prompt |
| `icons/` folder | You need to create app icons (instructions below) |

Every HTML page now includes:
- `<link rel="manifest" href="manifest.json" />` — PWA declaration
- `<link rel="apple-touch-icon" ...>` — iOS home screen icon
- Service worker registration script

---

## Step 1 — Create Your App Icons

You need one square logo image (at least 512×512 px). Then generate all sizes:

1. Go to **https://realfavicongenerator.net** (free)
2. Upload your logo image
3. Download the generated icon package
4. Create a folder called `icons/` in your project
5. Place these files inside `icons/`:
   - `icon-72.png`, `icon-96.png`, `icon-128.png`, `icon-144.png`
   - `icon-152.png`, `icon-192.png`, `icon-384.png`, `icon-512.png`
6. Push the `icons/` folder to GitHub

---

## Step 2 — Test the PWA

Before publishing to stores, verify the PWA works:

1. Push all files to GitHub (including `manifest.json`, `sw.js`, `icons/`)
2. Open your live site in Chrome on Android
3. You should see an **"Add to Home Screen"** banner or prompt
4. On iPhone: tap the Share button → "Add to Home Screen"
5. The app should open full-screen without browser bars

**Test with Lighthouse:**
1. Open Chrome DevTools (F12)
2. Click the "Lighthouse" tab
3. Select "Progressive Web App" and run audit
4. Aim for a score above 90

---

## ANDROID — Google Play Store

### Method: TWA (Trusted Web Activity) — Recommended

TWA wraps your website in a native Android app shell. It is the official Google
method for publishing PWAs to the Play Store.

**Requirements:**
- A Google Play Developer account ($25 one-time fee)
- A Windows or Mac computer with Android Studio installed (free)

**Step-by-step:**

### A. Install tools

1. Install **Node.js** from nodejs.org
2. Install **Android Studio** from developer.android.com/studio
3. Run in terminal:
   ```
   npm install -g @bubblewrap/cli
   ```

### B. Create the TWA project

```bash
mkdir dam-android
cd dam-android
bubblewrap init --manifest https://YOUR-USERNAME.github.io/YOUR-REPO/manifest.json
```

Answer the prompts:
- **Package ID:** `com.yourname.dailyactivitymonitor`
- **App name:** `Daily Activity Monitor`
- **Launcher name:** `ActivityMon`
- **Theme color:** `#1B4F72`
- **Background color:** `#ffffff`
- **Start URL:** your GitHub Pages URL

### C. Build the APK

```bash
bubblewrap build
```

This creates `app-release-signed.apk` — your Android app file.

### D. Verify asset link (important!)

Google Play requires a digital asset link to verify you own the website.

1. Run: `bubblewrap fingerprint`
2. Copy the SHA256 fingerprint
3. Create this file on your website at exactly this URL path:
   `https://YOUR-SITE/.well-known/assetlinks.json`
4. Content:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourname.dailyactivitymonitor",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT_HERE"]
  }
}]
```
5. Create `.well-known/assetlinks.json` in your GitHub repo and push it

### E. Publish to Google Play

1. Go to **play.google.com/console**
2. Create new app → Internal testing
3. Upload the `app-release-signed.apk`
4. Fill in store listing: description, screenshots, category (Lifestyle)
5. Submit for review — takes 1–3 days

---

## IPHONE — Apple App Store

### Method: Capacitor.js — Recommended for HTML/JS apps

Capacitor wraps your HTML/JS into a native iOS app. It requires a Mac.

**Requirements:**
- A Mac computer (mandatory for iOS builds)
- Apple Developer account ($99/year)
- Xcode installed (free from Mac App Store)

**Step-by-step:**

### A. Install Capacitor

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Daily Activity Monitor" "com.yourname.dailyactivitymonitor"
```

### B. Configure capacitor.config.json

```json
{
  "appId": "com.yourname.dailyactivitymonitor",
  "appName": "Daily Activity Monitor",
  "webDir": ".",
  "server": {
    "url": "https://YOUR-USERNAME.github.io/YOUR-REPO",
    "cleartext": false
  }
}
```

The `server.url` pointing to your live site means the app loads your
GitHub Pages site — no backend changes needed.

### C. Add iOS platform

```bash
npx cap add ios
npx cap open ios
```

This opens Xcode automatically.

### D. Configure in Xcode

1. Select your project in the left panel
2. Set **Bundle Identifier:** `com.yourname.dailyactivitymonitor`
3. Set **Display Name:** `Daily Activity Monitor`
4. Sign in with your Apple Developer account under "Signing & Capabilities"
5. Add your app icons in `Assets.xcassets`

### E. Test on iPhone

1. Connect your iPhone via USB
2. Select your device in Xcode
3. Click the ▶ Play button to install on your phone
4. Trust the developer certificate on the phone (Settings → General → VPN & Device Management)

### F. Submit to App Store

1. In Xcode: Product → Archive
2. Open **Organizer** → Distribute App → App Store Connect
3. Go to **appstoreconnect.apple.com**
4. Create a new app with the same Bundle ID
5. Fill in: name, description, screenshots, category (Lifestyle → Health & Fitness)
6. Submit for review — takes 1–7 days

---

## Simpler Alternative — PWA Without App Stores

If going through the app stores feels complex, your users can already install
the app directly from the browser **right now** — no store needed:

**Android Chrome:**
- Open the website in Chrome
- Tap the three-dot menu → "Add to Home Screen"
- The app icon appears on the home screen
- Opens full-screen just like a native app

**iPhone Safari:**
- Open the website in Safari
- Tap the Share button (box with arrow)
- Scroll down → "Add to Home Screen"
- Tap "Add"
- The app icon appears on the home screen

This is instant and free. Many successful apps (Twitter Lite, Pinterest,
Starbucks) use this approach for millions of users.

---

## Cost Summary

| Path | Cost | Time |
|---|---|---|
| PWA install (no store) | Free | Already done |
| Google Play Store (TWA) | $25 one-time | 2–4 hours setup + 1–3 days review |
| Apple App Store (Capacitor) | $99/year | 4–8 hours setup + 1–7 days review |
| Both stores | $25 + $99/year | 1–2 days total |

---

## Recommended Next Steps

1. **Right now:** Push `manifest.json`, `sw.js`, and `icons/` to GitHub
2. **Test:** Open your live site on Android Chrome — you should see "Add to Home Screen"
3. **Android store:** Follow the TWA/Bubblewrap steps above ($25, ~2 hours)
4. **iPhone store:** You'll need a Mac and $99/year Apple developer account

If you need help with any specific step, just ask!

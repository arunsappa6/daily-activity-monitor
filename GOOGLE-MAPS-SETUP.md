# Google Maps API Setup Guide
## Enable Nearby Place Suggestions in Daily Activity Monitor

---

## What This Enables

When a customer picks an activity like **Prayer Time → Hindu Mandir**, the app asks:
> "Can I suggest nearest Hindu Mandir options near you?"

If they say Yes and enter their postal code, the app shows:
- Nearest places within **30 km radius**
- Place name, address, rating, open/closed status
- **Google Maps** and **Apple Maps** links for each result
- One-click "Use This" button to fill the Location field

---

## Step 1 — Create a Google Cloud Account (Free)

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. Create a new project called `daily-activity-monitor`

---

## Step 2 — Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services → Library**
2. Search for and enable these two APIs:
   - **Maps JavaScript API**
   - **Places API**
3. Click **Enable** for each one

---

## Step 3 — Create an API Key

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → API Key**
3. Copy the key (looks like `AIzaSyB...`)

---

## Step 4 — Restrict Your Key (Important for Security)

1. Click on your newly created key to edit it
2. Under **Application restrictions**, select **HTTP referrers (websites)**
3. Add your GitHub Pages URL:
   ```
   https://YOUR-USERNAME.github.io/*
   ```
4. Under **API restrictions**, select **Restrict key** and choose:
   - Maps JavaScript API
   - Places API
5. Click **Save**

---

## Step 5 — Add Key to Your Website

Open `activity-modal.js` and replace the placeholder:

```javascript
// Line 14 — change this:
var GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// To your real key:
var GOOGLE_MAPS_API_KEY = 'AIzaSyB_your_actual_key_here';
```

Then upload `activity-modal.js` to GitHub.

---

## Free Tier Limits

Google Maps gives **$200 free credit per month**:

| API | Cost per request | Free requests/month |
|---|---|---|
| Places Nearby Search | $0.032 | ~6,250 searches |
| Maps JavaScript API | $0.007 | ~28,500 loads |

For 20,000 users who don't all search every day, **free tier is more than enough**.

---

## Without a Google Maps Key

If you don't set up an API key, the suggestion feature still works — it shows
**"Open Google Maps"** and **"Open Apple Maps"** buttons that open the maps
app directly with the search pre-filled. Users can find the place themselves.

This is the fallback that works **right now** with no setup needed.

---

## Testing

1. Go to My Dashboard
2. Click **+** on any date
3. Select **Prayer Time**
4. A **Type** dropdown appears — select **Hindu Mandir**
5. A blue prompt appears: *"Can I suggest nearest Hindu Mandir options near you?"*
6. Click **Yes, suggest!**
7. Enter your postal code and click **Search**
8. Nearby places appear with map links

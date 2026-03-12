# Google Places API – real bus/transit stops

The app shows **real** bus and transit stops from Google when the key is set and Places API is enabled.

## 1. Enable Places API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the **same project** that has your Maps API key.
3. Go to **APIs & Services** → **Library**.
4. Search for **Places API** (the legacy one) and click **Enable**.  
   Link: https://console.cloud.google.com/apis/library/places-backend.googleapis.com

## 2. API key and restrictions

The app uses the key in `lib/core/config/api_config.dart` (same as `AndroidManifest.xml`).

- If your key is restricted to **“Android apps”** only, HTTP calls from Dart can be **blocked**.  
  **Fix:** In Cloud Console → **APIs & Services** → **Credentials** → your key → under “Application restrictions” either:
  - Choose **“None”** (key works for Maps + Places from the app), or  
  - Create a **second key** with no restriction and put that key in `api_config.dart` for Places only.
- Ensure **“Places API”** is in the “API restrictions” list for that key (or use “Don’t restrict key” for testing).

## 3. Check the console when you run the app

Run the app and watch the **debug console** (e.g. `flutter run`):

- **“Got X transit stations from Nearby Search”** or **“Got X results from Text Search”** → Places is working; you should see real stops on the map.
- **“Places status: REQUEST_DENIED”** or **“No API key”** → key missing, wrong, or restricted; enable Places API and fix restrictions (see above).
- **“No results from Google”** → key may be OK but no results in that area; app will fall back to Firestore or sample data.

## 4. Flow in the app

1. **Places API** (Nearby Search `transit_station`, then Text Search `bus stop terminal`) near Cebu.
2. If that returns nothing or fails → **Firestore** `bus_stops` in Cebu.
3. If that is empty → **sample Cebu** dummy data.

Dummy data is only used when both Places and Firestore return no data (or when the key is missing / Places is disabled).

## 5. Directions API (route on map)

When you pick a **destination** on the Near Me screen, the app draws the road route from your closest bus stop (or your location) to that destination. This uses the **Directions API**.

- Enable **Directions API** in Google Cloud Console: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com  
- The same API key is used. If the route does not appear, check the debug console for `[Directions]` messages.

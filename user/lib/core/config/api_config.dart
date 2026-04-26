/// Google API key for Places API (transit/bus stops). Use the same key as in AndroidManifest (com.google.android.geo.API_KEY).
/// Enable "Places API" in Google Cloud Console: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
const String kGoogleApiKey = String.fromEnvironment(
  'GOOGLE_API_KEY',
  defaultValue: 'AIzaSyBzDrQL0XaiYRIoUoDC_UBDQuxpcEWg1UE', // Set to your key (same as AndroidManifest) or run with --dart-define=GOOGLE_API_KEY=your_key
);

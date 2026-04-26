# Google Maps Setup Guide

This guide explains how to set up Google Maps for the commuter app.

## 📋 Prerequisites

1. Google Cloud Console account
2. Google Maps API key with proper restrictions
3. Flutter development environment

## 🔧 Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy the API key

### Recommended: Restrict Your API Key

For security, restrict your API key:

1. Click on the API key you just created
2. Under **Application restrictions**:
   - For Android: Select "Android apps" and add your package name and SHA-1 certificate fingerprint
   - For iOS: Select "iOS apps" and add your bundle identifier
3. Under **API restrictions**:
   - Select "Restrict key"
   - Enable:
     - **Maps SDK for Android**
     - **Maps SDK for iOS**
     - **Geocoding API** (optional, for address lookup)

## 📱 Step 2: Android Configuration

### 2.1 Update AndroidManifest.xml

The file is located at: `android/app/src/main/AndroidManifest.xml`

**Permissions** (already added):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

**Google Maps API Key** (already added, needs your key):
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_API_KEY" />
```

**⚠️ IMPORTANT**: Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key.

### 2.2 Get SHA-1 Certificate Fingerprint (for API key restriction)

**Debug keystore:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Release keystore:**
```bash
keytool -list -v -keystore <path-to-your-release-keystore> -alias <your-key-alias>
```

Look for the SHA-1 fingerprint in the output.

## 🍎 Step 3: iOS Configuration

### 3.1 Update Info.plist

The file is located at: `ios/Runner/Info.plist`

**Add location permission descriptions:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to your location to show your position on the map and help you find nearby routes.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs access to your location to show your position on the map and help you find nearby routes.</string>
```

**Add Google Maps API key:**
```xml
<key>GMSApiKey</key>
<string>YOUR_GOOGLE_MAPS_API_KEY</string>
```

**⚠️ IMPORTANT**: Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key.

### 3.2 Update AppDelegate.swift (if needed)

If you're using Swift, make sure `AppDelegate.swift` imports GoogleMaps:

```swift
import UIKit
import Flutter
import GoogleMaps

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("YOUR_GOOGLE_MAPS_API_KEY")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

## 📦 Step 4: Install Dependencies

Run the following command to install the required packages:

```bash
flutter pub get
```

The following dependencies are already added to `pubspec.yaml`:
- `google_maps_flutter: ^2.5.0`
- `geolocator: ^10.1.0`
- `permission_handler: ^11.0.1`

## ✅ Step 5: Verify Setup

1. **Check AndroidManifest.xml** has your API key
2. **Check Info.plist** has your API key and permission descriptions
3. **Run the app** on a physical device (emulators may have location issues)
4. **Grant location permission** when prompted
5. **Verify map loads** and shows your location

## 🐛 Troubleshooting

### Map Not Showing

1. **Check API key**: Verify it's correctly set in AndroidManifest.xml and Info.plist
2. **Check API restrictions**: Make sure Maps SDK for Android/iOS is enabled
3. **Check internet connection**: Maps require internet to load
4. **Check logs**: Look for API key errors in console

### Location Not Working

1. **Check permissions**: Verify location permission is granted in device settings
2. **Check location services**: Ensure location services are enabled on device
3. **Test on physical device**: Emulators may have location issues
4. **Check AndroidManifest.xml**: Verify location permissions are present

### Permission Denied

1. **First time**: User must grant permission when prompted
2. **Permanently denied**: User must enable in device settings
3. **Use "Open Settings" button**: The app provides a button to open settings

## 📚 File Structure

```
lib/
├── core/
│   └── services/
│       ├── location_service.dart      # Location permission & GPS handling
│       └── map/
│           └── map_service.dart       # Map utilities
└── features/
    └── map/
        ├── map.dart                   # Map widget wrapper
        └── map_screen.dart            # Main map screen
```

## 🚀 Usage

### Basic Usage

```dart
import 'package:user/features/map/map.dart';

// In your widget tree
MapWidget()
```

### Direct Usage

```dart
import 'package:user/features/map/map_screen.dart';

// In your widget tree
MapScreen()
```

## 📝 Notes

- **No Driver Tracking**: This implementation focuses only on the commuter (user) side
- **No Firestore**: No database integration for location storage
- **No WebSocket**: No real-time communication features
- **Production Ready**: Includes proper error handling, loading states, and user feedback

## 🔗 Resources

- [Google Maps Flutter Plugin](https://pub.dev/packages/google_maps_flutter)
- [Geolocator Plugin](https://pub.dev/packages/geolocator)
- [Permission Handler Plugin](https://pub.dev/packages/permission_handler)
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)

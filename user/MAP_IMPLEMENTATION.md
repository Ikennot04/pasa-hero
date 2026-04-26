# Commuter Map Implementation Guide

This document explains the implementation of the commuter map screen for the Flutter app.

## Overview

The map implementation provides a clean, production-ready Google Maps integration with the following features:

- ✅ Google Maps display with traffic layer
- ✅ User's current GPS location tracking
- ✅ Location permission handling
- ✅ My Location button
- ✅ Auto-center on user location on app start
- ✅ Loading indicators
- ✅ Error handling for permission denied cases
- ✅ Clean code structure with separated services

## File Structure

```
lib/
├── core/
│   └── services/
│       ├── location_service.dart      # Location permission & GPS handling
│       └── map/
│           └── map_service.dart       # Map-related utilities
└── features/
    └── map/
        ├── map.dart                   # Map widget wrapper
        └── map_screen.dart            # Main map screen implementation
```

## Components

### 1. LocationService (`lib/core/services/location_service.dart`)

Handles all location-related operations:

- **Permission Management**: Checks and requests location permissions
- **GPS Location**: Retrieves current position with proper error handling
- **Location Streams**: Provides real-time location updates (for future use)
- **Settings Integration**: Opens app settings when permission is permanently denied

**Key Methods:**
- `requestPermission()`: Requests location permission from user
- `getCurrentPosition()`: Gets current GPS position
- `isPermissionPermanentlyDenied()`: Checks if permission is permanently denied
- `openAppSettings()`: Opens device settings for manual permission enable

### 2. MapService (`lib/core/services/map/map_service.dart`)

Provides map-related utilities and configurations:

- **Camera Positioning**: Creates camera positions from GPS coordinates
- **Default Settings**: Provides default map configurations
- **Map Updates**: Creates camera update animations

**Key Methods:**
- `cameraPositionFromPosition()`: Creates camera position from GPS position
- `createCameraUpdate()`: Creates camera update for smooth animations
- `getDefaultMapType()`: Returns default map type (normal with traffic)

### 3. MapScreen (`lib/features/map/map_screen.dart`)

Main map screen widget that combines all features:

- **Google Maps Display**: Shows Google Map with traffic layer enabled
- **Location Tracking**: Displays user's current location (blue dot)
- **Auto-Centering**: Automatically centers map on user location on startup
- **Loading States**: Shows loading indicator while fetching GPS
- **Error Handling**: Handles permission denied cases with user-friendly UI
- **My Location Button**: Custom floating action button to re-center on user location

**State Management:**
- Uses `StatefulWidget` for managing map state
- Tracks loading, permission, and error states
- Manages Google Maps controller lifecycle

### 4. MapWidget (`lib/features/map/map.dart`)

Simple wrapper widget that can be used throughout the app to display the map screen.

## Dependencies

The following packages are required (already added to `pubspec.yaml`):

```yaml
dependencies:
  google_maps_flutter: ^2.5.0    # Google Maps SDK for Flutter
  geolocator: ^10.1.0            # GPS location services
  permission_handler: ^11.0.1   # Location permission handling
```

## Configuration

### Android Setup

**1. AndroidManifest.xml** (`android/app/src/main/AndroidManifest.xml`)

Added permissions:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

Added Google Maps API key metadata:
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_API_KEY" />
```

**⚠️ IMPORTANT**: Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual Google Maps API key from Google Cloud Console.

### iOS Setup

**1. Info.plist** (`ios/Runner/Info.plist`)

Added location permission descriptions:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to your location to show your position on the map and help you find nearby routes.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs access to your location to show your position on the map and help you find nearby routes.</string>
```

Added Google Maps API key:
```xml
<key>GMSApiKey</key>
<string>YOUR_GOOGLE_MAPS_API_KEY</string>
```

**⚠️ IMPORTANT**: Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual Google Maps API key from Google Cloud Console.

## Getting Your Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy the API key
6. (Recommended) Restrict the API key to:
   - **Application restrictions**: Android apps / iOS apps
   - **API restrictions**: Restrict to "Maps SDK for Android" and "Maps SDK for iOS"
7. Replace `YOUR_GOOGLE_MAPS_API_KEY` in both AndroidManifest.xml and Info.plist

## How It Works

### Initialization Flow

1. **App Starts** → `MapScreen` widget is created
2. **initState()** → Calls `_initializeLocation()`
3. **Location Service** → Checks if location services are enabled
4. **Permission Check** → Checks current permission status
5. **Permission Request** → If needed, requests permission from user
6. **GPS Retrieval** → Gets current position with high accuracy
7. **Map Centering** → Centers map on user's location
8. **UI Update** → Hides loading indicator, shows map

### Permission Handling

The implementation handles three permission states:

1. **Granted**: Map shows user location and centers on it
2. **Denied (First Time)**: Shows retry button and settings button
3. **Permanently Denied**: Shows message with option to open app settings

### Error Handling

- **Location Services Disabled**: Shows error message with retry option
- **Permission Denied**: Shows permission request UI
- **GPS Timeout**: Falls back to default location (Manila, Philippines)
- **Network Errors**: Handled gracefully with user-friendly messages

## Usage

### Basic Usage

Simply use the `MapWidget` anywhere in your app:

```dart
import 'package:user/features/map/map.dart';

// In your widget tree
MapWidget()
```

### Direct Usage

You can also use `MapScreen` directly:

```dart
import 'package:user/features/map/map_screen.dart';

// In your widget tree
MapScreen()
```

### Navigation Example

```dart
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => const MapScreen()),
);
```

## Features Explained

### Traffic Layer

The traffic layer is enabled by default:
```dart
GoogleMap(
  trafficEnabled: true,
  // ...
)
```

This shows real-time traffic conditions on the map with color-coded roads:
- Green: No traffic
- Yellow: Moderate traffic
- Red: Heavy traffic

### My Location Button

A custom floating action button positioned at the bottom-right of the screen. When tapped:
1. Re-initializes location fetching
2. Gets fresh GPS position
3. Animates camera to user's current location

### Auto-Centering

The map automatically centers on the user's location when:
- The app first loads
- The map controller is initialized
- User taps the "My Location" button

### Loading Indicator

Shows a semi-transparent overlay with:
- Circular progress indicator
- "Getting your location..." message

Appears while:
- Checking location services
- Requesting permissions
- Fetching GPS position

## Performance Considerations

### Avoiding Unnecessary Rebuilds

- Uses `StatefulWidget` instead of rebuilding entire widget tree
- Only updates state when necessary (location changes, errors)
- Map controller is cached and reused

### Location Accuracy

- Uses `LocationAccuracy.high` for precise positioning
- 10-second timeout to prevent hanging
- Falls back gracefully if GPS is unavailable

## Future Enhancements

This implementation provides a solid foundation. Future enhancements could include:

- Real-time location updates (stream-based)
- Route planning and navigation
- Nearby points of interest
- Custom markers for bus stops/terminals
- Offline map support
- Location history

## Troubleshooting

### Map Not Showing

1. Check that Google Maps API key is correctly set in AndroidManifest.xml and Info.plist
2. Verify API key has proper restrictions (or no restrictions for testing)
3. Ensure Maps SDK for Android/iOS is enabled in Google Cloud Console
4. Check device has internet connection

### Location Not Working

1. Check device location services are enabled
2. Verify app has location permission (check device settings)
3. Test on physical device (emulators may have location issues)
4. Check AndroidManifest.xml has location permissions

### Permission Denied

1. User must grant permission when prompted
2. If permanently denied, user must enable in device settings
3. Use the "Open Settings" button in the error overlay

## Notes

- **No Driver Tracking**: This implementation focuses only on the commuter (user) side
- **No Firestore**: No database integration for location storage
- **No WebSocket**: No real-time communication features
- **Production Ready**: Includes proper error handling, loading states, and user feedback

## Support

For issues or questions:
1. Check Google Maps Flutter plugin documentation: https://pub.dev/packages/google_maps_flutter
2. Check Geolocator documentation: https://pub.dev/packages/geolocator
3. Check Permission Handler documentation: https://pub.dev/packages/permission_handler

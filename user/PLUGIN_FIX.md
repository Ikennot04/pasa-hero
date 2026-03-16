# Fix MissingPluginException for Geolocator

The `MissingPluginException` occurs when native plugins aren't properly linked. Follow these steps based on your platform:

## 🔧 Quick Fix Steps

### For Android:

1. **Stop the app completely** (close it, don't just hot reload)

2. **Clean and rebuild:**
   ```bash
   cd user
   flutter clean
   flutter pub get
   flutter run
   ```

3. **If still not working**, try:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   flutter run
   ```

### For iOS:

1. **Stop the app completely**

2. **Install CocoaPods dependencies:**
   ```bash
   cd user/ios
   pod deintegrate
   pod install
   cd ../..
   ```

3. **Clean and rebuild:**
   ```bash
   cd user
   flutter clean
   flutter pub get
   flutter run
   ```

## 📱 Platform-Specific Details

### Android
- Gradle automatically links plugins during build
- Make sure you're doing a **full rebuild**, not hot reload
- Check that `android/app/build.gradle` has the correct minSdkVersion (should be 21+ for geolocator)

### iOS
- CocoaPods must be installed: `pod install` in `ios/` directory
- After adding new plugins, always run `pod install`
- Make sure you're building from Xcode or using `flutter run` (not just hot reload)

## ✅ Verification

After rebuilding, the error should be gone. If you still see the error:

1. **Check you're not using hot reload** - Stop the app completely and rebuild
2. **Verify the plugin is in pubspec.yaml** - Check that `geolocator: ^10.1.0` is listed
3. **Check platform-specific setup:**
   - Android: Permissions in AndroidManifest.xml
   - iOS: Info.plist has location permission descriptions

## 🚨 Important Notes

- **Hot reload/restart is NOT enough** - You must do a full rebuild
- **Stop the app completely** before rebuilding
- For iOS, `pod install` is required after adding new plugins
- For Android, Gradle sync happens automatically during build

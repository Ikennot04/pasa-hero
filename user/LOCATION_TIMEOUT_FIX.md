# Fix Location Timeout Issues

If you're seeing `TimeoutException` when trying to get your location, follow these solutions:

## 🔧 Quick Fixes

### 1. **For Physical Devices:**
- **Move to an area with better GPS signal** (near a window or outdoors)
- **Wait a bit longer** - GPS can take 10-20 seconds to get a fix
- **Check location services are enabled** in device settings
- **Try the "My Location" button** again after a few seconds

### 2. **For Android Emulator:**

**Set a Mock Location:**

1. Open the emulator
2. Click the **three dots** (⋮) button at the bottom toolbar
3. Go to **Location** tab
4. Enter coordinates (e.g., Manila, Philippines):
   - **Latitude:** `14.5995`
   - **Longitude:** `120.9842`
5. Click **Send**
6. The map should now use this location

**Alternative - Use ADB:**
```bash
adb emu geo fix 120.9842 14.5995
```

### 3. **For iOS Simulator:**

**Set a Mock Location:**

1. In Xcode, go to **Debug** → **Simulate Location**
2. Choose a location (e.g., "Apple Park" or "Custom Location")
3. Or set custom coordinates:
   - **Latitude:** `14.5995`
   - **Longitude:** `120.9842`

**Alternative - Use Simulator Menu:**
1. In Simulator, go to **Features** → **Location**
2. Choose **Custom Location**
3. Enter coordinates

## 📱 What Changed

The app now:
- ✅ Uses **20-second timeout** (increased from 10 seconds)
- ✅ Uses **medium accuracy** (faster than high accuracy)
- ✅ **Falls back to default location** (Manila, Philippines) if timeout occurs
- ✅ Shows **helpful error messages** with solutions
- ✅ Provides **retry button** in error overlay
- ✅ Shows **snackbar notifications** for better user feedback

## 🎯 Default Location

If GPS times out, the map will show **Manila, Philippines** as a fallback. You can:
- Tap the **"My Location" button** to retry getting your actual location
- The map will still be usable even without GPS

## ⚠️ Common Issues

### Issue: "Location request timed out"
**Solution:** 
- For emulators: Set a mock location (see above)
- For physical devices: Move to better GPS signal area
- Wait a bit longer and try again

### Issue: "Location services are disabled"
**Solution:**
- Enable location services in device settings
- Grant location permission to the app

### Issue: "Location permission denied"
**Solution:**
- Grant location permission when prompted
- If permanently denied, go to app settings and enable manually

## 🚀 Best Practices

1. **Test on physical device** when possible (emulators can be slow)
2. **Set mock locations** for emulators during development
3. **Use the retry button** if location fails
4. **Check device location settings** if issues persist

## 📝 Notes

- The timeout is now **20 seconds** to give GPS more time
- **Medium accuracy** is used for faster response (still accurate enough)
- The app **gracefully handles timeouts** and shows default location
- You can always retry using the "My Location" button

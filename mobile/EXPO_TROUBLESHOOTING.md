# Expo Go Connection Issues - Solutions

## Problem
Getting "internet connection appears to be offline" error when trying to connect via Expo Go.

## Solutions (Try in order)

### Solution 1: Use Tunnel Mode (Recommended)
Tunnel mode works even if your phone and computer are on different networks.

1. Stop the current Expo server (Ctrl+C in terminal)
2. Start with tunnel mode:
   ```bash
   cd mobile
   npx expo start --tunnel
   ```
3. Wait for the tunnel URL to appear (may take 30-60 seconds)
4. Scan the QR code with Expo Go app

**Note:** First time using tunnel may ask you to install `@expo/ngrok`. Type `y` to install.

### Solution 2: Check Network Connection
Make sure your phone and computer are on the SAME WiFi network:

1. On your computer: Open Command Prompt and type `ipconfig`
   - Look for "IPv4 Address" under your WiFi adapter
   - Should be something like `192.168.x.x`

2. On your phone: Check WiFi settings
   - Make sure you're connected to the same network
   - Check the IP address (should be in same range, e.g., `192.168.x.x`)

3. If on different networks, connect both to the same WiFi

### Solution 3: Disable Firewall Temporarily
Windows Firewall might be blocking the connection:

1. Open Windows Security
2. Go to Firewall & network protection
3. Temporarily turn off firewall for Private networks
4. Try connecting again
5. Remember to turn firewall back on after testing

### Solution 4: Use LAN Mode Explicitly
```bash
cd mobile
npx expo start --lan
```

### Solution 5: Test on Web Instead
If mobile connection keeps failing, continue testing on web:

```bash
cd mobile
npm start
# Press 'w' to open in web browser
```

The web version works fully, just without native bottom tabs (use the newspaper icon for navigation).

## Current Status

Your app is working on web browser. The bottom navigation tabs are implemented but may not render properly in browser - this is normal for React Navigation.

**What works on web:**
- ✅ All screens and navigation
- ✅ Login/Signup
- ✅ Episode list
- ✅ Feed management
- ✅ Audio player
- ✅ Full functionality

**What's different on mobile:**
- Native bottom tab bar (Episodes, Feeds, Account)
- Better performance
- Native feel and gestures

## Alternative: Use Android/iOS Simulator

If Expo Go continues to have issues, you can use simulators:

**iOS Simulator (Mac only):**
```bash
npm start
# Press 'i' to open iOS simulator
```

**Android Emulator:**
```bash
npm start
# Press 'a' to open Android emulator
```

Make sure you have Android Studio or Xcode installed first.

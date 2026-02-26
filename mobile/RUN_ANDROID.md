# Running RadiAi on Android Emulator

## Prerequisites
- Android Studio installed
- Android emulator created and running

## Steps

### 1. Start Android Emulator
1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Click the play button (▶) next to a device
4. Wait for emulator to fully boot

### 2. Start Expo Dev Server
In your terminal (in the mobile directory):
```bash
npm start
```

### 3. Launch on Android
Once Expo dev server is running, press:
```
a
```
This will automatically:
- Build the app
- Install it on the emulator
- Launch the app

### 4. Wait for Build
First time will take 2-5 minutes to:
- Download Android dependencies
- Build the app
- Install on emulator

You'll see progress in the terminal.

### 5. App Opens!
Once complete, RadiAi will open on the emulator with:
- Full native experience
- Bottom navigation tabs (Episodes, Feeds, Account)
- Native performance
- All features working

## Troubleshooting

**"No Android devices found"**
- Make sure emulator is fully booted (see Android home screen)
- Try running: `adb devices` to check connection

**Build fails**
- Make sure you have Android SDK installed
- Check that ANDROID_HOME environment variable is set
- Try: `npx expo doctor` to check setup

**Emulator is slow**
- Enable hardware acceleration in Android Studio
- Allocate more RAM to emulator (Edit AVD → Show Advanced Settings)
- Use a newer Android version (API 30+)

## What You'll See

On the Android emulator, you'll get the full native experience:
- Beautiful bottom tab bar with icons
- Smooth native animations
- Native keyboard and inputs
- Better performance than web
- Full RadiAi premium UI

The app will look exactly as designed with the dark navy theme and muted blue accents!

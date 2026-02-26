# RadiAi Mobile App - Testing Guide

## How to See the Bottom Navigation Bar

The bottom navigation bar only appears **after you log in**. Here's how to test it:

### Step 1: Sign Up or Log In
1. When you first open the app, you'll see the **Login Screen**
2. If you don't have an account:
   - Click "Sign Up" at the bottom
   - Enter email and password
   - Click "Create Account"
3. If you have an account:
   - Enter your email and password
   - Click "Sign In"

### Step 2: View the Bottom Tabs
Once logged in, you'll see three tabs at the bottom:

1. **Episodes** (📻 radio icon)
   - Shows your daily briefings
   - Tap an episode to play it

2. **Feeds** (📰 newspaper icon)
   - Add RSS feeds
   - Delete existing feeds
   - Manage your news sources

3. **Account** (👤 person icon)
   - Shows your email
   - Sign out button

### Testing on Different Platforms

**Web Browser (Current):**
- Bottom tabs should appear at the bottom of the screen
- May look slightly different than mobile
- All functionality works the same

**Mobile Device (Recommended):**
1. Install Expo Go app on your phone
2. Scan the QR code from `npm start`
3. Better mobile experience with native feel

**iOS Simulator / Android Emulator:**
- Press `i` for iOS or `a` for Android in the terminal
- Full native experience

## Current State

- ✅ Login/Signup screens working
- ✅ Bottom tab navigation (after login)
- ✅ Episode list screen
- ✅ Feed management screen
- ✅ Audio player screen
- ✅ Account screen with logout

## Troubleshooting

**Don't see bottom tabs?**
- Make sure you're logged in
- Check console for errors
- Try refreshing the page (press `r` in terminal)

**Blank screen?**
- Check browser console for errors
- Make sure Metro bundler is running
- Try clearing cache: `npx expo start -c`

**Can't log in?**
- Check that backend is running
- Verify Supabase credentials in `.env`
- Check network tab for API errors

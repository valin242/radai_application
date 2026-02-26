# RadiAi Mobile App

React Native mobile application for RadiAi - personalized AI radio news.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `EXPO_PUBLIC_API_URL`: Backend API URL

## Running the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web
npm run web
```

## Tech Stack

- React Native (Expo)
- TypeScript
- React Navigation
- Supabase (Authentication)
- expo-av (Audio playback)
- expo-secure-store (Secure token storage)

## Project Structure

```
mobile/
├── src/
│   ├── config/         # Configuration files
│   ├── navigation/     # Navigation setup
│   ├── screens/        # Screen components
│   ├── components/     # Reusable components
│   └── types/          # TypeScript types
├── App.tsx             # Root component
└── package.json
```

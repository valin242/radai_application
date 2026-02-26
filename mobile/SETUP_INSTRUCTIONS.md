# Mobile App Setup Instructions

## Install Required Dependencies

The onboarding and preferences screens require an additional dependency for the slider component.

### Install Slider Package

```bash
cd mobile
npm install @react-native-community/slider
```

### For iOS (if testing on iOS)

```bash
cd ios
pod install
cd ..
```

## Environment Variables

Ensure your `.env` file has the correct API URL:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
# Or your deployed backend URL
# EXPO_PUBLIC_API_URL=https://your-api.com
```

## Running the App

```bash
# Start the development server
npm start

# Or for specific platforms
npm run ios
npm run android
npm run web
```

## Troubleshooting

### Slider Component Not Found

If you see an error about `@react-native-community/slider`:

```bash
npm install @react-native-community/slider
# Then restart the metro bundler
```

### API Connection Issues

1. Check that backend is running on port 8000
2. Verify `EXPO_PUBLIC_API_URL` in `.env`
3. For Android emulator, use `http://10.0.2.2:8000` instead of `localhost`
4. For iOS simulator, `http://localhost:8000` should work

### Onboarding Screen Not Showing

1. Check that user is authenticated
2. Verify onboarding status API is working:
   ```bash
   curl http://localhost:8000/onboarding/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. Check console logs for errors

## Testing the Feature

Follow the [E2E Testing Guide](../E2E_TESTING_GUIDE.md) for comprehensive testing instructions.

## Key Files Added

- `src/screens/OnboardingScreen.tsx` - Multi-step onboarding flow
- `src/screens/PreferencesScreen.tsx` - Preferences management
- `src/utils/apiClient.ts` - Extended with new API endpoints
- `src/navigation/AppNavigator.tsx` - Updated with onboarding flow

## Next Steps

1. Install dependencies: `npm install @react-native-community/slider`
2. Start the app: `npm start`
3. Test the onboarding flow with a new user
4. Verify preferences can be updated
5. Check that filtering statistics appear after article processing

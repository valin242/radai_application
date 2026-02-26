# Authentication Context

## Overview

The authentication context provides a centralized way to manage user authentication state throughout the mobile application using Supabase Auth with secure token storage.

## Features

- **Secure Token Storage**: Uses `expo-secure-store` for secure storage of authentication tokens on native platforms (iOS/Android)
- **Web Fallback**: Automatically falls back to localStorage for web platform
- **Auto Token Refresh**: Automatically refreshes tokens before expiration
- **Session Persistence**: Persists user sessions across app restarts
- **Auth State Management**: Provides real-time authentication state updates

## Usage

### Wrap Your App

The `AuthProvider` should wrap your entire application (already configured in `App.tsx`):

```tsx
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
```

### Use the Auth Hook

Access authentication state and methods in any component:

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, session, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <HomeScreen />;
}
```

## API Reference

### AuthContext Properties

- `session: Session | null` - Current Supabase session
- `user: User | null` - Current authenticated user
- `loading: boolean` - Loading state during initial session check
- `signUp: (email, password) => Promise<{ error }>` - Sign up a new user
- `signIn: (email, password) => Promise<{ error }>` - Sign in an existing user
- `signOut: () => Promise<{ error }>` - Sign out the current user

### Methods

#### signUp(email: string, password: string)

Creates a new user account.

```tsx
const { signUp } = useAuth();

const handleSignUp = async () => {
  const { error } = await signUp('user@example.com', 'password123');
  if (error) {
    console.error('Sign up error:', error);
  }
};
```

#### signIn(email: string, password: string)

Authenticates an existing user.

```tsx
const { signIn } = useAuth();

const handleSignIn = async () => {
  const { error } = await signIn('user@example.com', 'password123');
  if (error) {
    console.error('Sign in error:', error);
  }
};
```

#### signOut()

Signs out the current user and clears all tokens.

```tsx
const { signOut } = useAuth();

const handleSignOut = async () => {
  const { error } = await signOut();
  if (error) {
    console.error('Sign out error:', error);
  }
};
```

## Security

### Token Storage

- **iOS/Android**: Tokens are stored in the device's secure keychain/keystore using `expo-secure-store`
- **Web**: Tokens are stored in localStorage (less secure, but standard for web apps)

### Auto Refresh

The Supabase client automatically refreshes access tokens before they expire, ensuring uninterrupted access.

### Session Persistence

Sessions are persisted across app restarts, so users don't need to log in every time they open the app.

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 15.1**: Integrates Supabase authentication in the React Native app
- **Requirement 15.2**: Stores authentication tokens securely using expo-secure-store
- **Requirement 15.3**: Handles token expiration through auto-refresh
- **Requirement 15.5**: Clears all authentication tokens on logout

## Environment Variables

Ensure the following environment variables are set in your `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

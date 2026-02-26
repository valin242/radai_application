# Token Expiration Handling

This document explains how token expiration is handled in the RadiAi mobile app.

## Overview

The app implements comprehensive token expiration handling that:
1. **Detects** expired tokens on API calls
2. **Clears** expired tokens from secure storage
3. **Prompts** users to re-authenticate
4. **Redirects** users to the login screen automatically

## Architecture

### Components

1. **`api.ts`** - Core API utility
   - `authenticatedFetch()` - Makes authenticated requests with automatic token validation
   - `TokenExpiredError` - Custom error thrown when tokens expire
   - `isTokenExpiredError()` - Type guard for token expiration errors

2. **`AuthContext.tsx`** - Authentication context
   - `handleTokenExpiration()` - Clears expired tokens and resets session
   - Automatically redirects to login when session becomes null

3. **`useApiCall.ts`** - Custom hook for API calls
   - Wraps API calls with automatic error handling
   - Shows user-friendly alerts when tokens expire
   - Provides loading and error states

4. **`apiClient.ts`** - Type-safe API client
   - Pre-configured API methods for feeds, episodes, and questions
   - All methods automatically handle token expiration

## How It Works

### Token Expiration Detection

The system detects expired tokens in three ways:

1. **Client-side expiration check**
   ```typescript
   const expiresAt = session.expires_at;
   if (expiresAt && expiresAt * 1000 < Date.now()) {
     throw new TokenExpiredError();
   }
   ```

2. **Missing session**
   ```typescript
   if (sessionError || !session) {
     throw new TokenExpiredError();
   }
   ```

3. **Server-side 401 response**
   ```typescript
   if (response.status === 401) {
     await supabase.auth.signOut();
     throw new TokenExpiredError();
   }
   ```

### Token Cleanup

When a token expires:

1. `TokenExpiredError` is thrown
2. `handleTokenExpiration()` is called
3. `supabase.auth.signOut()` clears tokens from secure storage
4. Session state is reset to `null`
5. AuthContext triggers re-render
6. Navigation automatically redirects to login screen

### User Experience

When a token expires during an API call:

1. User sees an alert: "Session Expired - Your session has expired. Please log in again to continue."
2. User clicks "OK"
3. App automatically navigates to login screen
4. User can log in again to continue

## Usage Examples

### Basic Usage with useApiCall Hook

```typescript
import { useApiCall } from '../hooks/useApiCall';
import { feedsApi } from '../utils/apiClient';

function MyComponent() {
  const { makeApiCall, loading, error } = useApiCall();

  const loadData = async () => {
    const result = await makeApiCall(
      () => feedsApi.list(),
      {
        showExpiredAlert: true, // Show alert on expiration (default: true)
      }
    );

    if (result) {
      // Handle successful response
      console.log(result.feeds);
    }
    // If token expired, user is automatically prompted to re-authenticate
  };

  return (
    // Your component JSX
  );
}
```

### Direct API Client Usage

```typescript
import { feedsApi } from '../utils/apiClient';
import { isTokenExpiredError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { handleTokenExpiration } = useAuth();

  const loadData = async () => {
    try {
      const result = await feedsApi.list();
      console.log(result.feeds);
    } catch (error) {
      if (isTokenExpiredError(error)) {
        // Handle token expiration
        await handleTokenExpiration();
        Alert.alert('Session Expired', 'Please log in again');
      } else {
        // Handle other errors
        console.error(error);
      }
    }
  };

  return (
    // Your component JSX
  );
}
```

### Custom Token Expiration Handler

```typescript
const { makeApiCall } = useApiCall();

const result = await makeApiCall(
  () => feedsApi.list(),
  {
    showExpiredAlert: false, // Don't show default alert
    onTokenExpired: () => {
      // Custom handler
      console.log('Token expired, redirecting...');
      // Custom logic here
    },
  }
);
```

## Testing Token Expiration

To test token expiration handling:

1. **Simulate expired token**:
   - Manually set an expired token in secure storage
   - Make an API call
   - Verify TokenExpiredError is thrown

2. **Simulate 401 response**:
   - Mock API to return 401 status
   - Make an API call
   - Verify token cleanup and user prompt

3. **Test user flow**:
   - Log in
   - Wait for token to expire (or manually expire it)
   - Attempt an API call
   - Verify alert is shown
   - Verify redirect to login screen

## Security Considerations

1. **Automatic cleanup**: Expired tokens are immediately cleared from secure storage
2. **No retry with expired token**: Failed requests are not retried with the same expired token
3. **Server-side validation**: Backend must also validate token expiration
4. **Secure storage**: Tokens are stored using expo-secure-store (encrypted on device)

## Requirements Validation

This implementation satisfies **Requirement 15.3**:

> WHEN authentication tokens expire, THE System SHALL prompt the user to re-authenticate

✅ Tokens are detected as expired on API calls
✅ Expired tokens are cleared from secure storage
✅ User is prompted with a clear message
✅ User is redirected to login screen for re-authentication

# Token Expiration Handling Implementation

## Task 14.5 - Implementation Summary

This document summarizes the implementation of token expiration handling for the RadiAi mobile app.

## Requirements

**Requirement 15.3**: WHEN authentication tokens expire, THE System SHALL prompt the user to re-authenticate

## Implementation

### Files Created

1. **`mobile/src/utils/api.ts`**
   - Core API utility with `authenticatedFetch()` function
   - `TokenExpiredError` custom error class
   - `isTokenExpiredError()` type guard
   - Detects expired tokens in three ways:
     - Client-side expiration check (expires_at timestamp)
     - Missing/invalid session
     - Server-side 401 Unauthorized response

2. **`mobile/src/hooks/useApiCall.ts`**
   - Custom React hook for making API calls
   - Automatic token expiration handling
   - Shows user-friendly alerts when tokens expire
   - Provides loading and error states
   - Supports custom expiration handlers

3. **`mobile/src/utils/apiClient.ts`**
   - Type-safe API client for backend endpoints
   - Pre-configured methods for feeds, episodes, and questions
   - All methods automatically handle token expiration
   - Consistent error handling across all API calls

4. **`mobile/src/screens/FeedManagementScreen.tsx`**
   - Example screen demonstrating token expiration handling
   - Shows how to use `useApiCall` hook
   - Implements feed list, add, and delete functionality
   - Handles token expiration gracefully with user prompts

5. **`mobile/src/utils/README_TOKEN_EXPIRATION.md`**
   - Comprehensive documentation
   - Architecture overview
   - Usage examples
   - Testing guidelines
   - Security considerations

6. **`mobile/src/utils/__tests__/tokenExpiration.test.ts`**
   - Unit tests for token expiration detection
   - Tests for all expiration scenarios
   - Verifies token cleanup behavior
   - Validates error handling

### Files Modified

1. **`mobile/src/contexts/AuthContext.tsx`**
   - Added `handleTokenExpiration()` method
   - Clears expired tokens and resets session
   - Triggers automatic redirect to login screen

## How It Works

### Token Expiration Detection

The system detects expired tokens through:

1. **Client-side timestamp check**: Compares `expires_at` with current time
2. **Session validation**: Checks if session exists and is valid
3. **Server response**: Detects 401 Unauthorized responses

### Token Cleanup Process

When a token expires:

1. `TokenExpiredError` is thrown by `authenticatedFetch()`
2. `useApiCall` hook catches the error
3. `handleTokenExpiration()` is called
4. `supabase.auth.signOut()` clears tokens from secure storage
5. Session state is reset to `null`
6. User sees alert: "Session Expired - Please log in again"
7. AuthContext automatically redirects to login screen

### User Experience

```
User makes API call → Token expired → Alert shown → Tokens cleared → Redirect to login
```

## Usage Example

```typescript
import { useApiCall } from '../hooks/useApiCall';
import { feedsApi } from '../utils/apiClient';

function MyComponent() {
  const { makeApiCall, loading } = useApiCall();

  const loadData = async () => {
    const result = await makeApiCall(
      () => feedsApi.list(),
      { showExpiredAlert: true }
    );

    if (result) {
      // Handle successful response
      console.log(result.feeds);
    }
    // Token expiration is handled automatically
  };

  return <View>...</View>;
}
```

## Testing

Run tests with:
```bash
npm test -- mobile/src/utils/__tests__/tokenExpiration.test.ts
```

Tests cover:
- ✅ Missing session detection
- ✅ Session error detection
- ✅ Expired token detection (client-side)
- ✅ 401 response detection (server-side)
- ✅ Token cleanup on expiration
- ✅ Successful requests with valid tokens
- ✅ Error type guards

## Requirements Validation

✅ **Detect expired tokens on API calls**
   - Implemented in `authenticatedFetch()` with three detection methods

✅ **Prompt user to re-authenticate**
   - Implemented in `useApiCall` hook with Alert.alert()

✅ **Clear expired tokens**
   - Implemented in `handleTokenExpiration()` using `supabase.auth.signOut()`

## Security Features

1. **Immediate cleanup**: Expired tokens are cleared immediately
2. **No retry with expired token**: Failed requests are not retried
3. **Secure storage**: Tokens stored using expo-secure-store (encrypted)
4. **Server-side validation**: Backend must also validate expiration
5. **User notification**: Clear messaging about session expiration

## Integration Points

- **AuthContext**: Manages session state and token cleanup
- **Supabase**: Handles token storage and authentication
- **expo-secure-store**: Provides encrypted token storage
- **React Navigation**: Automatic redirect on session loss

## Next Steps

To use this implementation in other screens:

1. Import `useApiCall` hook
2. Import API methods from `apiClient`
3. Wrap API calls with `makeApiCall()`
4. Token expiration is handled automatically

Example screens to implement:
- Episode list screen
- Audio player screen
- Q&A screen (pro users)

## Notes

- Supabase already has `autoRefreshToken: true` enabled
- This implementation adds explicit expiration detection and user prompts
- All API calls should use `authenticatedFetch()` or `useApiCall` hook
- Custom expiration handlers can be provided if needed

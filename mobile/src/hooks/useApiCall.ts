import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch, isTokenExpiredError } from '../utils/api';

/**
 * Custom hook for making API calls with automatic token expiration handling
 * 
 * When a token expires:
 * 1. Detects the expiration
 * 2. Clears expired tokens
 * 3. Shows an alert prompting user to re-authenticate
 * 4. Redirects to login (handled by AuthContext state change)
 */
export function useApiCall() {
  const { handleTokenExpiration } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const makeApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      options?: {
        onTokenExpired?: () => void;
        showExpiredAlert?: boolean;
      }
    ): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        setLoading(false);
        return result;
      } catch (err) {
        setLoading(false);
        
        // Check if this is a token expiration error
        if (isTokenExpiredError(err)) {
          // Clear expired tokens
          await handleTokenExpiration();
          
          // Show alert to user if enabled (default: true)
          if (options?.showExpiredAlert !== false) {
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please log in again to continue.',
              [{ text: 'OK' }]
            );
          }
          
          // Call custom handler if provided
          if (options?.onTokenExpired) {
            options.onTokenExpired();
          }
          
          setError(err as Error);
          return null;
        }
        
        // Handle other errors
        setError(err as Error);
        throw err;
      }
    },
    [handleTokenExpiration]
  );

  return {
    makeApiCall,
    loading,
    error,
  };
}

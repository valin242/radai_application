import { supabase } from '../config/supabase';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class TokenExpiredError extends Error {
  constructor(message: string = 'Authentication token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Makes an authenticated API call to the backend
 * Automatically handles token expiration and throws TokenExpiredError when detected
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  console.log('authenticatedFetch called for:', url);
  
  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log('Session status:', { hasSession: !!session, error: sessionError });
  
  if (session) {
    console.log('User email:', session.user.email);
    console.log('Token expires at:', new Date(session.expires_at! * 1000).toISOString());
  }

  // If no session or session error, token is expired/invalid
  if (sessionError || !session) {
    console.error('No valid session found');
    throw new TokenExpiredError();
  }

  // Check if token is expired
  const expiresAt = session.expires_at;
  if (expiresAt && expiresAt * 1000 < Date.now()) {
    // Token is expired, clear it
    console.error('Token expired');
    await supabase.auth.signOut();
    throw new TokenExpiredError();
  }

  console.log('Making authenticated request with user:', session.user.email);

  // Add authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  // Make the API call
  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log('Response status:', response.status);

  // Check for 401 Unauthorized response (token expired on server side)
  if (response.status === 401) {
    // Clear the expired session
    console.error('401 Unauthorized - clearing session');
    await supabase.auth.signOut();
    throw new TokenExpiredError();
  }

  return response;
}

/**
 * Helper function to handle API errors consistently
 */
export function isTokenExpiredError(error: any): error is TokenExpiredError {
  return error instanceof TokenExpiredError || error.name === 'TokenExpiredError';
}

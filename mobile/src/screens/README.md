# Screens

This directory contains all screen components for the RadiAi mobile app.

## SignupScreen

The signup screen allows new users to create an account.

### Features
- Email and password input validation
- Password confirmation
- Integration with Supabase authentication
- Secure token storage via AuthContext
- Navigation to home screen on success
- Error handling with user-friendly messages

### Validation Rules
- Email: Must be a valid email format
- Password: Minimum 8 characters
- Confirm Password: Must match the password field

### Navigation
- On successful signup: Navigates to Home screen
- Link to Login screen for existing users

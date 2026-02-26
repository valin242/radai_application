# Supabase Configuration

## Overview

This directory contains the Supabase client configuration for authentication and database access.

## Setup

1. **Environment Variables**: Ensure the following environment variables are set in your `.env` file:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Supabase Project**: Create a Supabase project at https://supabase.com and obtain your credentials from the project settings.

## Usage

### Importing the Supabase Client

```typescript
import { supabase } from './config/supabase';
// or
import { supabase } from './lib/supabase';
```

### Using Authentication Middleware

To protect routes with authentication:

```typescript
import { FastifyInstance } from 'fastify';
import { authMiddleware } from './middleware/auth';

export async function myProtectedRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/protected',
    {
      preHandler: authMiddleware, // Apply authentication
    },
    async (request, reply) => {
      // request.user is now available with user info
      const userId = request.user?.id;
      return reply.send({ userId });
    }
  );
}
```

### Request User Object

After authentication, the `request.user` object contains:
- `id`: User's unique identifier (UUID)
- `email`: User's email address
- `tier`: User's subscription tier ('free' or 'pro')

## Authentication Flow

1. Client sends request with `Authorization: Bearer <token>` header
2. Middleware extracts and validates token with Supabase
3. If valid, user info is attached to `request.user`
4. If invalid, middleware returns 401 error
5. Route handler can access authenticated user via `request.user`

## Error Responses

The middleware returns standardized error responses:

**Missing Token (401)**:
```json
{
  "error": {
    "code": "MISSING_AUTH_TOKEN",
    "message": "Authorization header with Bearer token is required"
  }
}
```

**Invalid Token (401)**:
```json
{
  "error": {
    "code": "INVALID_AUTH_TOKEN",
    "message": "Invalid or expired authentication token"
  }
}
```

**Server Error (500)**:
```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "An error occurred during authentication"
  }
}
```

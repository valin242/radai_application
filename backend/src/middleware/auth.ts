import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';
import { prisma } from '../lib/prisma';

// Extend FastifyRequest to include user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      tier?: string;
    };
  }
}

interface AuthError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Authentication middleware for protected routes
 * Validates JWT token from Authorization header and attaches user info to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorResponse: AuthError = {
        error: {
          code: 'MISSING_AUTH_TOKEN',
          message: 'Authorization header with Bearer token is required',
        },
      };
      return reply.code(401).send(errorResponse);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      const errorResponse: AuthError = {
        error: {
          code: 'INVALID_AUTH_TOKEN',
          message: 'Invalid or expired authentication token',
          details: error ? { supabaseError: error.message } : {},
        },
      };
      return reply.code(401).send(errorResponse);
    }

    // Ensure user exists in database (create if not exists)
    try {
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: {}, // Don't update anything if exists
        create: {
          id: data.user.id,
          email: data.user.email || '',
          tier: (data.user.user_metadata?.tier as 'free' | 'pro') || 'free',
        },
      });
    } catch (dbError) {
      request.log.error({ dbError }, 'Error ensuring user exists in database');
      // Continue anyway - user might already exist
    }

    // Attach user information to request
    request.user = {
      id: data.user.id,
      email: data.user.email,
      tier: data.user.user_metadata?.tier || 'free',
    };

    // Continue to route handler
  } catch (err) {
    request.log.error({ err }, 'Authentication error');
    const errorResponse: AuthError = {
      error: {
        code: 'AUTH_ERROR',
        message: 'An error occurred during authentication',
      },
    };
    return reply.code(500).send(errorResponse);
  }
}

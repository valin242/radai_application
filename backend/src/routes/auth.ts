import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

interface SignupRequest {
  email: string;
  password: string;
}

interface SignupResponse {
  user_id: string;
  token: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user_id: string;
  token: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password requirements
 */
function isValidPassword(password: string): boolean {
  // Minimum 8 characters
  return password.length >= 8;
}

export async function authRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const logger = createLogger({ component: 'auth-routes' });

  /**
   * POST /auth/signup
   * Create new user account with Supabase Auth and store user record
   */
  fastify.post<{ Body: SignupRequest }>(
    '/signup',
    async (request: FastifyRequest<{ Body: SignupRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id });
      
      try {
        const { email, password } = request.body;

        // Validate input
        if (!email || !password) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_FIELDS',
              message: 'Email and password are required',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Validate email format
        if (!isValidEmail(email)) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_EMAIL',
              message: 'Invalid email format',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Validate password
        if (!isValidPassword(password)) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_PASSWORD',
              message: 'Password must be at least 8 characters long',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Create user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              tier: 'free', // Store tier in user metadata
            },
          },
        });

        if (authError) {
          requestLogger.error('Supabase signup error', authError, { email });
          
          // Handle duplicate email error
          if (authError.message.includes('already registered')) {
            const errorResponse: ErrorResponse = {
              error: {
                code: 'EMAIL_EXISTS',
                message: 'An account with this email already exists',
              },
            };
            return reply.code(400).send(errorResponse);
          }

          const errorResponse: ErrorResponse = {
            error: {
              code: 'SIGNUP_FAILED',
              message: 'Failed to create account',
              details: { supabaseError: authError.message },
            },
          };
          return reply.code(500).send(errorResponse);
        }

        if (!authData.user || !authData.session) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'SIGNUP_FAILED',
              message: 'Failed to create account',
            },
          };
          return reply.code(500).send(errorResponse);
        }

        // Store user record in database with default "free" tier
        try {
          await prisma.user.create({
            data: {
              id: authData.user.id,
              email: authData.user.email!,
              tier: 'free',
            },
          });
        } catch (dbError) {
          requestLogger.error('Database user creation error', dbError, { 
            userId: authData.user.id,
            email: authData.user.email 
          });
          
          // If database insert fails, we should ideally clean up the Supabase user
          // For MVP, we'll log the error and return failure
          const errorResponse: ErrorResponse = {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Failed to create user record',
            },
          };
          return reply.code(500).send(errorResponse);
        }

        // Return success response
        const response: SignupResponse = {
          user_id: authData.user.id,
          token: authData.session.access_token,
        };

        return reply.code(201).send(response);
      } catch (err) {
        requestLogger.error('Unexpected signup error', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred during signup',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * POST /auth/login
   * Authenticate user with Supabase Auth and return user ID and token
   */
  fastify.post<{ Body: LoginRequest }>(
    '/login',
    async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id });
      
      try {
        const { email, password } = request.body;

        // Validate input
        if (!email || !password) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_FIELDS',
              message: 'Email and password are required',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Authenticate with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          requestLogger.error('Supabase login error', authError, { email });
          
          const errorResponse: ErrorResponse = {
            error: {
              code: 'AUTHENTICATION_FAILED',
              message: 'Invalid email or password',
            },
          };
          return reply.code(401).send(errorResponse);
        }

        if (!authData.user || !authData.session) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'AUTHENTICATION_FAILED',
              message: 'Invalid email or password',
            },
          };
          return reply.code(401).send(errorResponse);
        }

        // Return success response with user ID and token
        const response: LoginResponse = {
          user_id: authData.user.id,
          token: authData.session.access_token,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected login error', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred during login',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );
}

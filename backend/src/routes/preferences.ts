import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { getUserInterestProfile, updateUserInterestProfile } from '../lib/interest-profile-manager';
import { addKeyword, removeKeyword, updateRelevanceThreshold } from '../lib/user-preferences';
import { createLogger } from '../lib/logger';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface PreferencesResponse {
  user_id: string;
  selectedTopics: string[];
  customKeywords: string[];
  relevanceThreshold: number;
}

interface UpdateTopicsRequest {
  topics: string[];
}

interface AddKeywordRequest {
  keyword: string;
}

interface UpdateThresholdRequest {
  threshold: number;
}

export async function preferencesRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const logger = createLogger({ component: 'preferences-routes' });

  /**
   * GET /preferences
   * Return current user's preferences (topics, keywords, threshold)
   * 
   * Requirements: 1.6, 8.1, 8.2, 8.3
   */
  fastify.get(
    '/',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const userId = request.user!.id;

        // Get user's interest profile
        const profile = await getUserInterestProfile(userId);

        const response: PreferencesResponse = {
          user_id: userId,
          selectedTopics: profile.topics,
          customKeywords: profile.keywords,
          relevanceThreshold: profile.relevanceThreshold,
        };

        return reply.code(200).send(response);
      } catch (error) {
        requestLogger.error('Error fetching user preferences', error);

        // Handle user preferences not found
        if (error instanceof Error && error.message.includes('not found')) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'PREFERENCES_NOT_FOUND',
              message: 'User preferences not found. Please complete onboarding first.',
            },
          };
          return reply.code(404).send(errorResponse);
        }

        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching preferences',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * PUT /preferences/topics
   * Update user's selected topics
   * Triggers interest profile regeneration
   * 
   * Requirements: 1.5
   */
  fastify.put<{ Body: UpdateTopicsRequest }>(
    '/topics',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: UpdateTopicsRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const { topics } = request.body;
        const userId = request.user!.id;

        // Validate topics are provided
        if (!topics || !Array.isArray(topics) || topics.length === 0) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_TOPICS',
              message: 'At least one topic must be selected',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Get current keywords to preserve them
        const currentProfile = await getUserInterestProfile(userId);

        // Update interest profile with new topics
        await updateUserInterestProfile(userId, topics, currentProfile.keywords);

        const response: PreferencesResponse = {
          user_id: userId,
          selectedTopics: topics,
          customKeywords: currentProfile.keywords,
          relevanceThreshold: currentProfile.relevanceThreshold,
        };

        return reply.code(200).send(response);
      } catch (error) {
        requestLogger.error('Error updating topics', error);

        // Handle user preferences not found
        if (error instanceof Error && error.message.includes('not found')) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'PREFERENCES_NOT_FOUND',
              message: 'User preferences not found. Please complete onboarding first.',
            },
          };
          return reply.code(404).send(errorResponse);
        }

        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while updating topics',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * POST /preferences/keywords
   * Add keyword to user's customKeywords
   * Triggers interest profile regeneration
   * 
   * Requirements: 1.3, 1.5
   */
  fastify.post<{ Body: AddKeywordRequest }>(
    '/keywords',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: AddKeywordRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const { keyword } = request.body;
        const userId = request.user!.id;

        // Validate keyword is provided
        if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_KEYWORD',
              message: 'Keyword is required and must be a non-empty string',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Add keyword (triggers interest profile regeneration)
        await addKeyword(userId, keyword.trim());

        // Get updated profile
        const updatedProfile = await getUserInterestProfile(userId);

        const response: PreferencesResponse = {
          user_id: userId,
          selectedTopics: updatedProfile.topics,
          customKeywords: updatedProfile.keywords,
          relevanceThreshold: updatedProfile.relevanceThreshold,
        };

        return reply.code(200).send(response);
      } catch (error) {
        requestLogger.error('Error adding keyword', error);

        // Handle user preferences not found
        if (error instanceof Error && error.message.includes('not found')) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'PREFERENCES_NOT_FOUND',
              message: 'User preferences not found. Please complete onboarding first.',
            },
          };
          return reply.code(404).send(errorResponse);
        }

        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while adding keyword',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * DELETE /preferences/keywords/:keyword
   * Remove keyword from user's customKeywords
   * Triggers interest profile regeneration
   * 
   * Requirements: 1.4, 1.5
   */
  fastify.delete<{ Params: { keyword: string } }>(
    '/keywords/:keyword',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: { keyword: string } }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ 
        requestId: request.id, 
        userId: request.user?.id,
        keyword: request.params.keyword 
      });
      
      try {
        const { keyword } = request.params;
        const userId = request.user!.id;

        // Validate keyword is provided
        if (!keyword || keyword.trim().length === 0) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_KEYWORD',
              message: 'Keyword is required',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Decode URL-encoded keyword
        const decodedKeyword = decodeURIComponent(keyword);

        // Remove keyword (triggers interest profile regeneration)
        await removeKeyword(userId, decodedKeyword);

        // Get updated profile
        const updatedProfile = await getUserInterestProfile(userId);

        const response: PreferencesResponse = {
          user_id: userId,
          selectedTopics: updatedProfile.topics,
          customKeywords: updatedProfile.keywords,
          relevanceThreshold: updatedProfile.relevanceThreshold,
        };

        return reply.code(200).send(response);
      } catch (error) {
        requestLogger.error('Error removing keyword', error);

        // Handle user preferences not found
        if (error instanceof Error && error.message.includes('not found')) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'PREFERENCES_NOT_FOUND',
              message: 'User preferences not found. Please complete onboarding first.',
            },
          };
          return reply.code(404).send(errorResponse);
        }

        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while removing keyword',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * PUT /preferences/threshold
   * Update user's relevance threshold
   * Validates threshold is 0-100
   * 
   * Requirements: 4.3, 4.4
   */
  fastify.put<{ Body: UpdateThresholdRequest }>(
    '/threshold',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: UpdateThresholdRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const { threshold } = request.body;
        const userId = request.user!.id;

        // Validate threshold is provided and is a number
        if (threshold === undefined || threshold === null || typeof threshold !== 'number') {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_THRESHOLD',
              message: 'Threshold is required and must be a number',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Update threshold (validates range 0-100)
        try {
          await updateRelevanceThreshold(userId, threshold);
        } catch (error) {
          // Handle validation error from updateRelevanceThreshold
          if (error instanceof Error && error.message.includes('must be between 0 and 100')) {
            const errorResponse: ErrorResponse = {
              error: {
                code: 'INVALID_THRESHOLD',
                message: error.message,
              },
            };
            return reply.code(400).send(errorResponse);
          }
          throw error;
        }

        // Get updated profile
        const updatedProfile = await getUserInterestProfile(userId);

        const response: PreferencesResponse = {
          user_id: userId,
          selectedTopics: updatedProfile.topics,
          customKeywords: updatedProfile.keywords,
          relevanceThreshold: updatedProfile.relevanceThreshold,
        };

        return reply.code(200).send(response);
      } catch (error) {
        requestLogger.error('Error updating threshold', error);

        // Handle user preferences not found
        if (error instanceof Error && error.message.includes('not found')) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'PREFERENCES_NOT_FOUND',
              message: 'User preferences not found. Please complete onboarding first.',
            },
          };
          return reply.code(404).send(errorResponse);
        }

        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while updating threshold',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );
}

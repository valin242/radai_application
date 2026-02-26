import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { completeOnboarding, hasCompletedOnboarding } from '../lib/onboarding-service';
import { getPopularFeeds } from '../lib/feed-manager';
import { createLogger } from '../lib/logger';

interface CompleteOnboardingRequest {
  topics: string[];
  feedIds?: string[];
  customFeedUrls?: string[];
}

interface CompleteOnboardingResponse {
  success: boolean;
  user_id: string;
  preferences: {
    topics: string[];
    onboarding_completed: boolean;
  };
}

interface OnboardingStatusResponse {
  user_id: string;
  onboardingCompleted: boolean;
}

interface TopicItem {
  id: string;
  name: string;
  description: string;
}

interface TopicsResponse {
  topics: TopicItem[];
}

interface PopularFeedItem {
  feed_id: string;
  name: string;
  url: string;
  category: string;
  description: string;
}

interface PopularFeedsResponse {
  feeds: PopularFeedItem[];
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Predefined topics from design document
const PREDEFINED_TOPICS: TopicItem[] = [
  { id: 'technology', name: 'Technology', description: 'Tech news, gadgets, software, AI' },
  { id: 'finance', name: 'Finance', description: 'Markets, investing, economics, crypto' },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, TV, music, celebrities' },
  { id: 'health', name: 'Health', description: 'Wellness, fitness, medical news' },
  { id: 'sports', name: 'Sports', description: 'Sports news, scores, analysis' },
  { id: 'politics', name: 'Politics', description: 'Political news, policy, elections' },
  { id: 'science', name: 'Science', description: 'Research, discoveries, space, nature' },
  { id: 'business', name: 'Business', description: 'Startups, companies, entrepreneurship' },
];

export async function onboardingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const logger = createLogger({ component: 'onboarding-routes' });

  /**
   * POST /onboarding
   * Complete onboarding for authenticated user
   * Accepts topics, optional feedIds, optional customFeedUrls
   * Calls onboarding-service.completeOnboarding
   * Returns success status and user preferences
   * Handles validation errors (no topics, invalid URLs)
   * 
   * Requirements: 1.1, 5.4, 5.5
   */
  fastify.post<{ Body: CompleteOnboardingRequest }>(
    '/',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: CompleteOnboardingRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const { topics, feedIds, customFeedUrls } = request.body;
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

        // Call onboarding service
        try {
          await completeOnboarding(userId, topics, feedIds, customFeedUrls);
        } catch (error) {
          requestLogger.error('Onboarding completion error', error, { 
            userId,
            topics,
            feedIds,
            customFeedUrls 
          });

          // Handle validation errors from onboarding service
          if (error instanceof Error) {
            if (error.message.includes('Invalid RSS feed URL')) {
              const errorResponse: ErrorResponse = {
                error: {
                  code: 'INVALID_FEED_URL',
                  message: error.message,
                },
              };
              return reply.code(400).send(errorResponse);
            }

            if (error.message.includes('At least one topic')) {
              const errorResponse: ErrorResponse = {
                error: {
                  code: 'MISSING_TOPICS',
                  message: error.message,
                },
              };
              return reply.code(400).send(errorResponse);
            }
          }

          // Generic error
          const errorResponse: ErrorResponse = {
            error: {
              code: 'ONBOARDING_FAILED',
              message: 'Failed to complete onboarding',
            },
          };
          return reply.code(500).send(errorResponse);
        }

        // Return success response
        const response: CompleteOnboardingResponse = {
          success: true,
          user_id: userId,
          preferences: {
            topics,
            onboarding_completed: true,
          },
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected onboarding error', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred during onboarding',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * GET /onboarding/status
   * Return onboarding completion status for current user
   * 
   * Requirements: 5.5
   */
  fastify.get(
    '/status',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const userId = request.user!.id;

        // Check onboarding status
        const completed = await hasCompletedOnboarding(userId);

        const response: OnboardingStatusResponse = {
          user_id: userId,
          onboardingCompleted: completed,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected error checking onboarding status', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while checking onboarding status',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * GET /onboarding/topics
   * Return list of predefined topics
   * 
   * Requirements: 1.2
   */
  fastify.get(
    '/topics',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const response: TopicsResponse = {
          topics: PREDEFINED_TOPICS,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected error fetching topics', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching topics',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * GET /onboarding/popular-feeds
   * Return list of popular feeds using feed-manager
   * 
   * Requirements: 2.1, 2.2
   */
  fastify.get(
    '/popular-feeds',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        // Get popular feeds from feed manager
        const popularFeeds = await getPopularFeeds();

        // Transform to response format
        const feedItems: PopularFeedItem[] = popularFeeds.map((feed) => ({
          feed_id: feed.id,
          name: feed.name,
          url: feed.url,
          category: feed.category,
          description: feed.description,
        }));

        const response: PopularFeedsResponse = {
          feeds: feedItems,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected error fetching popular feeds', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching popular feeds',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );
}

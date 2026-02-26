import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

interface AddFeedRequest {
  url?: string;
  feedId?: string; // For popular feed selection by ID
}

interface AddFeedResponse {
  feed_id: string;
  url: string;
  created_at: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface FeedItem {
  feed_id: string;
  url: string;
  created_at: string;
}

interface ListFeedsResponse {
  feeds: FeedItem[];
}

interface PopularFeedItem {
  feed_id: string;
  name: string;
  url: string;
  category: string;
  description: string;
}

interface ListPopularFeedsResponse {
  feeds: PopularFeedItem[];
}

export async function feedRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const logger = createLogger({ component: 'feed-routes' });

  /**
   * POST /feeds
   * Add new RSS feed for authenticated user
   * Supports both popular feed selection by ID and custom feed URLs
   * Validates RSS URL format for custom feeds and stores feed with user_id, url, created_at
   */
  fastify.post<{ Body: AddFeedRequest }>(
    '/',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: AddFeedRequest }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const { url, feedId } = request.body;
        const userId = request.user!.id;

        // Validate input - must provide either url or feedId
        if (!url && !feedId) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_INPUT',
              message: 'Either RSS feed URL or popular feed ID is required',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        let feedUrl: string;
        let isPopular = false;

        // Handle popular feed selection by ID
        if (feedId) {
          const popularFeed = await prisma.feed.findUnique({
            where: {
              id: feedId,
            },
          });

          if (!popularFeed || !popularFeed.isPopular) {
            const errorResponse: ErrorResponse = {
              error: {
                code: 'INVALID_FEED_ID',
                message: 'Popular feed not found',
              },
            };
            return reply.code(404).send(errorResponse);
          }

          feedUrl = popularFeed.url;
          isPopular = true;
        } else {
          // Handle custom feed URL
          feedUrl = url!;
        }

        // Use feed-manager to add feed (includes validation for custom feeds)
        try {
          const { addFeedForUser } = await import('../lib/feed-manager');
          const feed = await addFeedForUser(userId, feedUrl, isPopular);

          // Return success response
          const response: AddFeedResponse = {
            feed_id: feed.id,
            url: feed.url,
            created_at: new Date().toISOString(),
          };

          return reply.code(201).send(response);
        } catch (feedError: unknown) {
          requestLogger.error('Feed addition error', feedError, { 
            userId,
            feedUrl 
          });

          // Handle specific feed-manager errors
          if (feedError instanceof Error) {
            if (feedError.message === 'Invalid RSS feed URL') {
              const errorResponse: ErrorResponse = {
                error: {
                  code: 'INVALID_RSS_URL',
                  message: 'Invalid RSS feed URL format or feed is not accessible',
                },
              };
              return reply.code(400).send(errorResponse);
            }

            if (feedError.message === 'Feed already exists for this user') {
              const errorResponse: ErrorResponse = {
                error: {
                  code: 'FEED_EXISTS',
                  message: 'This feed URL has already been added',
                },
              };
              return reply.code(400).send(errorResponse);
            }
          }

          const errorResponse: ErrorResponse = {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Failed to create feed record',
            },
          };
          return reply.code(500).send(errorResponse);
        }
      } catch (err) {
        requestLogger.error('Unexpected feed creation error', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while adding feed',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * GET /feeds
   * List all feeds for authenticated user
   * Returns only feeds belonging to the authenticated user
   */
  fastify.get(
    '/',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const userId = request.user!.id;

        // Use feed-manager to fetch all feeds for the authenticated user
        const { getUserFeeds } = await import('../lib/feed-manager');
        const feeds = await getUserFeeds(userId);

        // Transform to response format
        const feedItems: FeedItem[] = feeds.map((feed) => ({
          feed_id: feed.id,
          url: feed.url,
          created_at: feed.createdAt.toISOString(),
        }));

        const response: ListFeedsResponse = {
          feeds: feedItems,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected error fetching feeds', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching feeds',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * GET /feeds/popular
   * List all popular feeds available in the system
   * Returns curated list of popular feeds with metadata
   */
  fastify.get(
    '/popular',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        // Fetch all popular feeds
        const feeds = await prisma.feed.findMany({
          where: {
            isPopular: true,
          },
          orderBy: [
            { category: 'asc' },
            { name: 'asc' },
          ],
        });

        // Transform to response format
        const feedItems: PopularFeedItem[] = feeds.map((feed) => ({
          feed_id: feed.id,
          name: feed.name || feed.url,
          url: feed.url,
          category: feed.category || 'general',
          description: feed.description || '',
        }));

        const response: ListPopularFeedsResponse = {
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

  /**
   * DELETE /feeds/:id
   * Delete a feed for authenticated user
   * Verifies feed ownership before deletion
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ 
        requestId: request.id, 
        userId: request.user?.id,
        feedId: request.params.id 
      });
      
      try {
        const { id } = request.params;
        const userId = request.user!.id;

        // Validate feed ID
        if (!id) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'MISSING_FEED_ID',
              message: 'Feed ID is required',
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Use feed-manager to remove feed (includes ownership validation)
        try {
          const { removeFeedForUser } = await import('../lib/feed-manager');
          await removeFeedForUser(userId, id);

          return reply.code(200).send({ success: true });
        } catch (feedError: unknown) {
          requestLogger.error('Feed removal error', feedError);

          // Handle specific feed-manager errors
          if (feedError instanceof Error) {
            if (feedError.message === 'Feed not found') {
              const errorResponse: ErrorResponse = {
                error: {
                  code: 'FEED_NOT_FOUND',
                  message: 'Feed not found',
                },
              };
              return reply.code(404).send(errorResponse);
            }

            if (feedError.message === 'Feed does not belong to this user') {
              const errorResponse: ErrorResponse = {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'You do not have permission to delete this feed',
                },
              };
              return reply.code(403).send(errorResponse);
            }
          }

          const errorResponse: ErrorResponse = {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Failed to delete feed',
            },
          };
          return reply.code(500).send(errorResponse);
        }
      } catch (err) {
        requestLogger.error('Unexpected error deleting feed', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while deleting feed',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );
}

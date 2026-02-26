import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

interface EpisodeItem {
  episode_id: string;
  audio_url: string;
  duration_minutes: number;
  script_text?: string;
  created_at: string;
  articles?: Array<{ title: string }>;
}

interface ListEpisodesResponse {
  episodes: EpisodeItem[];
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export async function episodeRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const logger = createLogger({ component: 'episode-routes' });

  /**
   * GET /episodes
   * List all episodes for authenticated user
   * Returns episodes ordered by created_at descending (newest first)
   * Includes audio_url and duration_minutes
   */
  fastify.get(
    '/',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const userId = request.user!.id;

        // Fetch all episodes for the authenticated user
        const episodes = await prisma.episode.findMany({
          where: {
            userId,
          },
          include: {
            episodeArticles: {
              include: {
                article: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Transform to response format
        const episodeItems: EpisodeItem[] = episodes.map((episode) => ({
          episode_id: episode.id,
          audio_url: episode.audioUrl,
          duration_minutes: episode.durationMinutes,
          script_text: episode.scriptText,
          created_at: episode.createdAt.toISOString(),
          articles: episode.episodeArticles.map((ea) => ({
            title: ea.article.title,
          })),
        }));

        const response: ListEpisodesResponse = {
          episodes: episodeItems,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected error fetching episodes', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching episodes',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );

  /**
   * GET /episodes/:id
   * Get episode details with full information including linked articles
   * Verifies episode ownership before returning
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ 
        requestId: request.id, 
        userId: request.user?.id,
        episodeId: request.params.id 
      });
      
      try {
        const userId = request.user!.id;
        const episodeId = request.params.id;

        // Fetch episode with linked articles
        const episode = await prisma.episode.findUnique({
          where: {
            id: episodeId,
          },
          include: {
            episodeArticles: {
              include: {
                article: {
                  include: {
                    feed: true,
                  },
                },
              },
            },
          },
        });

        // Check if episode exists
        if (!episode) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'NOT_FOUND',
              message: 'Episode not found',
            },
          };
          return reply.code(404).send(errorResponse);
        }

        // Verify episode ownership
        if (episode.userId !== userId) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this episode',
            },
          };
          return reply.code(403).send(errorResponse);
        }

        // Transform articles to response format
        const articles = episode.episodeArticles.map((ea) => ({
          article_id: ea.article.id,
          title: ea.article.title,
          content: ea.article.content,
          published_at: ea.article.publishedAt?.toISOString() || null,
          summary: ea.article.summary,
          feed_url: ea.article.feed.url,
        }));

        // Build response
        const response = {
          episode_id: episode.id,
          audio_url: episode.audioUrl,
          duration_minutes: episode.durationMinutes,
          script_text: episode.scriptText,
          created_at: episode.createdAt.toISOString(),
          articles,
        };

        return reply.code(200).send(response);
      } catch (err) {
        requestLogger.error('Unexpected error fetching episode details', err);
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching episode details',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );
}

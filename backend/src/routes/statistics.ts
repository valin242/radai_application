import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { getFilteringStats } from '../lib/statistics-tracker';
import { createLogger } from '../lib/logger';

interface FilteringStatsResponse {
  user_id: string;
  time_range: string;
  total_articles: number;
  included_articles: number;
  filtered_out_articles: number;
  inclusion_percentage: number;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface FilteringStatsQuerystring {
  timeRange?: string;
}

export async function statisticsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const logger = createLogger({ component: 'statistics-routes' });

  /**
   * GET /statistics/filtering
   * Accept optional timeRange query parameter
   * Return filtering statistics using statistics-tracker
   * 
   * Requirements: 6.3, 6.4, 6.5
   */
  fastify.get<{ Querystring: FilteringStatsQuerystring }>(
    '/filtering',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Querystring: FilteringStatsQuerystring }>, reply: FastifyReply) => {
      const requestLogger = logger.child({ requestId: request.id, userId: request.user?.id });
      
      try {
        const userId = request.user!.id;
        const { timeRange } = request.query;

        // Validate timeRange if provided
        const validTimeRanges = ['last_7_days', 'last_30_days', 'all_time'];
        if (timeRange && !validTimeRanges.includes(timeRange)) {
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_TIME_RANGE',
              message: `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
            },
          };
          return reply.code(400).send(errorResponse);
        }

        // Get filtering statistics
        const stats = await getFilteringStats(userId, timeRange);

        const response: FilteringStatsResponse = {
          user_id: userId,
          time_range: timeRange || 'all_time',
          total_articles: stats.totalArticles,
          included_articles: stats.includedArticles,
          filtered_out_articles: stats.filteredOutArticles,
          inclusion_percentage: stats.inclusionPercentage,
        };

        return reply.code(200).send(response);
      } catch (error) {
        requestLogger.error('Error fetching filtering statistics', error);

        const errorResponse: ErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while fetching filtering statistics',
          },
        };
        return reply.code(500).send(errorResponse);
      }
    }
  );
}

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authMiddleware } from '../middleware/auth';

/**
 * Example protected route demonstrating authentication middleware usage
 * This can be used as a reference for implementing other protected routes
 */
export async function protectedExampleRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Example protected route
  fastify.get(
    '/me',
    {
      preHandler: authMiddleware, // Apply authentication middleware
    },
    async (request, reply) => {
      // At this point, request.user is guaranteed to exist (middleware validated it)
      return reply.code(200).send({
        message: 'Authenticated successfully',
        user: request.user,
      });
    }
  );
}

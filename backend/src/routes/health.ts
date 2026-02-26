import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma';
import { redis } from '../config/redis';

interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  database: boolean;
  redis: boolean;
}

export async function healthRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  fastify.get('/', async (_request, reply) => {
    let databaseHealthy = false;
    let redisHealthy = false;

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseHealthy = true;
    } catch (error) {
      fastify.log.error('Database health check failed:', error);
      databaseHealthy = false;
    }

    // Check Redis connectivity
    try {
      await redis.ping();
      redisHealthy = true;
    } catch (error) {
      fastify.log.error('Redis health check failed:', error);
      redisHealthy = false;
    }

    // Determine overall status
    const allHealthy = databaseHealthy && redisHealthy;
    const status = allHealthy ? 'healthy' : 'degraded';
    const statusCode = allHealthy ? 200 : 503;

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      database: databaseHealthy,
      redis: redisHealthy,
    };

    return reply.code(statusCode).send(response);
  });
}

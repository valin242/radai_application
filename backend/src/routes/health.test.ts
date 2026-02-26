import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { prisma } from '../lib/prisma';
import { redis } from '../config/redis';

// Mock the dependencies
vi.mock('../lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../config/redis', () => ({
  redis: {
    ping: vi.fn(),
  },
}));

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(healthRoutes, { prefix: '/health' });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 with healthy status when all services are operational', async () => {
    // Mock successful database and Redis checks
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.database).toBe(true);
    expect(body.redis).toBe(true);
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
  });

  it('should return 503 with degraded status when database is down', async () => {
    // Mock database failure and Redis success
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database connection failed'));
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe(false);
    expect(body.redis).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  it('should return 503 with degraded status when Redis is down', async () => {
    // Mock database success and Redis failure
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
    vi.mocked(redis.ping).mockRejectedValue(new Error('Redis connection failed'));

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe(true);
    expect(body.redis).toBe(false);
    expect(body.timestamp).toBeDefined();
  });

  it('should return 503 with degraded status when both services are down', async () => {
    // Mock both database and Redis failures
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database connection failed'));
    vi.mocked(redis.ping).mockRejectedValue(new Error('Redis connection failed'));

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe(false);
    expect(body.redis).toBe(false);
    expect(body.timestamp).toBeDefined();
  });

  it('should include database status in response', async () => {
    // Mock successful checks
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('database');
    expect(typeof body.database).toBe('boolean');
  });

  it('should include redis status in response', async () => {
    // Mock successful checks
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('redis');
    expect(typeof body.redis).toBe('boolean');
  });
});

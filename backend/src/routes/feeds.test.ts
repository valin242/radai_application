import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { feedRoutes } from './feeds';
import { prisma } from '../lib/prisma';

// Mock the auth middleware to bypass Supabase authentication in tests
vi.mock('../middleware/auth', () => ({
  authMiddleware: async (request: any, _reply: any) => {
    // Simulate authenticated user
    request.user = {
      id: request.headers['x-test-user-id'] || 'test-user-id',
      email: 'test@example.com',
      tier: 'free',
    };
  },
}));

// Mock the feed-manager to avoid actual RSS parsing in tests
vi.mock('../lib/feed-manager', async () => {
  const actual = await vi.importActual('../lib/feed-manager');
  return {
    ...actual,
    validateFeedUrl: vi.fn(async (url: string) => {
      // Simple URL validation for tests
      if (!url || url.trim() === '') {
        return false;
      }
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }),
    addFeedForUser: vi.fn(async (userId: string, feedUrl: string, isPopular: boolean = false) => {
      // Validate URL first
      const { validateFeedUrl } = await import('../lib/feed-manager');
      const isValid = await validateFeedUrl(feedUrl);
      if (!isValid) {
        throw new Error('Invalid RSS feed URL');
      }
      
      // Check for duplicate
      const existing = await prisma.feed.findUnique({
        where: {
          userId_url: { userId, url: feedUrl },
        },
      });
      
      if (existing) {
        throw new Error('Feed already exists for this user');
      }
      
      // Create feed
      const feed = await prisma.feed.create({
        data: { userId, url: feedUrl, isPopular },
        select: { id: true, url: true },
      });
      
      return feed;
    }),
  };
});

describe('POST /feeds - Add Feed Endpoint', () => {
  let app: FastifyInstance;
  const testUserId = 'test-user-feeds-' + Date.now();

  beforeEach(async () => {
    app = Fastify();
    await app.register(feedRoutes, { prefix: '/feeds' });
    await app.ready();

    // Create test user in database
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        tier: 'free',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.feed.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await app.close();
  });

  it('should successfully add a valid RSS feed', async () => {
    const feedUrl = 'https://example.com/feed.xml';

    const response = await app.inject({
      method: 'POST',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
      payload: { url: feedUrl },
    });

    if (response.statusCode !== 201) {
      console.log('Response status:', response.statusCode);
      console.log('Response body:', response.body);
    }

    expect(response.statusCode).toBe(201);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('feed_id');
    expect(data).toHaveProperty('url', feedUrl);
    expect(data).toHaveProperty('created_at');

    // Verify feed was stored in database
    const feed = await prisma.feed.findUnique({
      where: { id: data.feed_id },
    });

    expect(feed).toBeTruthy();
    expect(feed?.userId).toBe(testUserId);
    expect(feed?.url).toBe(feedUrl);
  });

  it('should reject invalid RSS URL format', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com/feed.xml',
      'javascript:alert(1)',
      '',
    ];

    for (const invalidUrl of invalidUrls) {
      const response = await app.inject({
        method: 'POST',
        url: '/feeds',
        headers: {
          'x-test-user-id': testUserId,
        },
        payload: { url: invalidUrl },
      });

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('error');
      expect(['INVALID_RSS_URL', 'MISSING_INPUT']).toContain(data.error.code);
    }
  });

  it('should reject duplicate feed URL for same user', async () => {
    const feedUrl = 'https://example.com/duplicate-feed.xml';

    // Add feed first time
    const response1 = await app.inject({
      method: 'POST',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
      payload: { url: feedUrl },
    });

    expect(response1.statusCode).toBe(201);

    // Try to add same feed again
    const response2 = await app.inject({
      method: 'POST',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
      payload: { url: feedUrl },
    });

    expect(response2.statusCode).toBe(400);

    const data = JSON.parse(response2.body);
    expect(data).toHaveProperty('error');
    expect(data.error.code).toBe('FEED_EXISTS');
  });

  it('should store feed with user_id, url, and created_at', async () => {
    const feedUrl = 'https://example.com/metadata-test.xml';

    const response = await app.inject({
      method: 'POST',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
      payload: { url: feedUrl },
    });

    expect(response.statusCode).toBe(201);

    const data = JSON.parse(response.body);
    const feedId = data.feed_id;

    // Verify all required fields are stored
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
    });

    expect(feed).toBeTruthy();
    expect(feed?.userId).toBe(testUserId);
    expect(feed?.url).toBe(feedUrl);
    expect(feed?.createdAt).toBeInstanceOf(Date);
    expect(feed?.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('GET /feeds - List Feeds Endpoint', () => {
  let app: FastifyInstance;
  const testUserId = 'test-user-list-feeds-' + Date.now();
  const otherUserId = 'other-user-list-feeds-' + Date.now();

  beforeEach(async () => {
    app = Fastify();
    await app.register(feedRoutes, { prefix: '/feeds' });
    await app.ready();

    // Create test users in database
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        tier: 'free',
      },
    });

    await prisma.user.create({
      data: {
        id: otherUserId,
        email: `other-${otherUserId}@example.com`,
        tier: 'free',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.feed.deleteMany({ where: { userId: testUserId } });
    await prisma.feed.deleteMany({ where: { userId: otherUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    await app.close();
  });

  it('should return empty array when user has no feeds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('feeds');
    expect(data.feeds).toEqual([]);
  });

  it('should return all feeds for authenticated user', async () => {
    // Create multiple feeds for test user
    const feed1 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed1.xml',
      },
    });

    const feed2 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed2.xml',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('feeds');
    expect(data.feeds).toHaveLength(2);

    // Verify feed structure
    const feedIds = data.feeds.map((f: any) => f.feed_id);
    expect(feedIds).toContain(feed1.id);
    expect(feedIds).toContain(feed2.id);

    // Verify each feed has required fields
    data.feeds.forEach((feed: any) => {
      expect(feed).toHaveProperty('feed_id');
      expect(feed).toHaveProperty('url');
      expect(feed).toHaveProperty('created_at');
    });
  });

  it('should only return feeds belonging to authenticated user', async () => {
    // Create feeds for test user
    const testUserFeed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/test-user-feed.xml',
      },
    });

    // Create feeds for other user
    await prisma.feed.create({
      data: {
        userId: otherUserId,
        url: 'https://example.com/other-user-feed.xml',
      },
    });

    // Request feeds as test user
    const response = await app.inject({
      method: 'GET',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('feeds');
    expect(data.feeds).toHaveLength(1);
    expect(data.feeds[0].feed_id).toBe(testUserFeed.id);
    expect(data.feeds[0].url).toBe('https://example.com/test-user-feed.xml');
  });

  it('should return feeds ordered by created_at descending', async () => {
    // Create feeds with slight delays to ensure different timestamps
    const feed1 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed-oldest.xml',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const feed2 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed-middle.xml',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const feed3 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed-newest.xml',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data.feeds).toHaveLength(3);

    // Verify order (newest first)
    expect(data.feeds[0].feed_id).toBe(feed3.id);
    expect(data.feeds[1].feed_id).toBe(feed2.id);
    expect(data.feeds[2].feed_id).toBe(feed1.id);
  });
});

describe('DELETE /feeds/:id - Delete Feed Endpoint', () => {
  let app: FastifyInstance;
  const testUserId = 'test-user-delete-feeds-' + Date.now();
  const otherUserId = 'other-user-delete-feeds-' + Date.now();

  beforeEach(async () => {
    app = Fastify();
    await app.register(feedRoutes, { prefix: '/feeds' });
    await app.ready();

    // Create test users in database
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        tier: 'free',
      },
    });

    await prisma.user.create({
      data: {
        id: otherUserId,
        email: `other-${otherUserId}@example.com`,
        tier: 'free',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.feed.deleteMany({ where: { userId: testUserId } });
    await prisma.feed.deleteMany({ where: { userId: otherUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    await app.close();
  });

  it('should successfully delete a feed owned by the user', async () => {
    // Create a feed for the test user
    const feed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed-to-delete.xml',
      },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/feeds/${feed.id}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('success', true);

    // Verify feed was deleted from database
    const deletedFeed = await prisma.feed.findUnique({
      where: { id: feed.id },
    });

    expect(deletedFeed).toBeNull();
  });

  it('should return 404 when feed does not exist', async () => {
    const nonExistentFeedId = 'non-existent-feed-id-' + Date.now();

    const response = await app.inject({
      method: 'DELETE',
      url: `/feeds/${nonExistentFeedId}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(404);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('error');
    expect(data.error.code).toBe('FEED_NOT_FOUND');
  });

  it('should return 403 when trying to delete another user\'s feed', async () => {
    // Create a feed for the other user
    const otherUserFeed = await prisma.feed.create({
      data: {
        userId: otherUserId,
        url: 'https://example.com/other-user-feed.xml',
      },
    });

    // Try to delete as test user
    const response = await app.inject({
      method: 'DELETE',
      url: `/feeds/${otherUserFeed.id}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(403);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('error');
    expect(data.error.code).toBe('UNAUTHORIZED');

    // Verify feed was NOT deleted
    const feed = await prisma.feed.findUnique({
      where: { id: otherUserFeed.id },
    });

    expect(feed).toBeTruthy();
  });

  it('should remove feed from user\'s feed list after deletion', async () => {
    // Create multiple feeds for the test user
    const feed1 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed1.xml',
      },
    });

    const feed2 = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed2.xml',
      },
    });

    // Delete feed1
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/feeds/${feed1.id}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(deleteResponse.statusCode).toBe(200);

    // Get feed list
    const listResponse = await app.inject({
      method: 'GET',
      url: '/feeds',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(listResponse.statusCode).toBe(200);

    const data = JSON.parse(listResponse.body);
    expect(data.feeds).toHaveLength(1);
    expect(data.feeds[0].feed_id).toBe(feed2.id);
  });
});

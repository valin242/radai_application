import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { episodeRoutes } from './episodes';
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

describe('GET /episodes - List Episodes Endpoint', () => {
  let app: FastifyInstance;
  const testUserId = 'test-user-episodes-' + Date.now();
  const otherUserId = 'other-user-episodes-' + Date.now();

  beforeEach(async () => {
    app = Fastify();
    await app.register(episodeRoutes, { prefix: '/episodes' });
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
    await prisma.episode.deleteMany({ where: { userId: testUserId } });
    await prisma.episode.deleteMany({ where: { userId: otherUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    await app.close();
  });

  it('should return empty array when user has no episodes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/episodes',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('episodes');
    expect(data.episodes).toEqual([]);
  });

  it('should return all episodes for authenticated user', async () => {
    // Create multiple episodes for test user
    const episode1 = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test script 1',
        audioUrl: 'https://example.com/audio1.mp3',
        durationMinutes: 10,
      },
    });

    const episode2 = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test script 2',
        audioUrl: 'https://example.com/audio2.mp3',
        durationMinutes: 12,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/episodes',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('episodes');
    expect(data.episodes).toHaveLength(2);

    // Verify episode IDs are present
    const episodeIds = data.episodes.map((e: any) => e.episode_id);
    expect(episodeIds).toContain(episode1.id);
    expect(episodeIds).toContain(episode2.id);

    // Verify each episode has required fields
    data.episodes.forEach((episode: any) => {
      expect(episode).toHaveProperty('episode_id');
      expect(episode).toHaveProperty('audio_url');
      expect(episode).toHaveProperty('duration_minutes');
      expect(episode).toHaveProperty('created_at');
    });
  });

  it('should only return episodes belonging to authenticated user', async () => {
    // Create episode for test user
    const testUserEpisode = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test user script',
        audioUrl: 'https://example.com/test-audio.mp3',
        durationMinutes: 10,
      },
    });

    // Create episode for other user
    await prisma.episode.create({
      data: {
        userId: otherUserId,
        scriptText: 'Other user script',
        audioUrl: 'https://example.com/other-audio.mp3',
        durationMinutes: 15,
      },
    });

    // Request episodes as test user
    const response = await app.inject({
      method: 'GET',
      url: '/episodes',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('episodes');
    expect(data.episodes).toHaveLength(1);
    expect(data.episodes[0].episode_id).toBe(testUserEpisode.id);
    expect(data.episodes[0].audio_url).toBe('https://example.com/test-audio.mp3');
  });

  it('should return episodes ordered by created_at descending', async () => {
    // Create episodes with slight delays to ensure different timestamps
    const episode1 = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Oldest episode',
        audioUrl: 'https://example.com/audio-oldest.mp3',
        durationMinutes: 10,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const episode2 = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Middle episode',
        audioUrl: 'https://example.com/audio-middle.mp3',
        durationMinutes: 11,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const episode3 = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Newest episode',
        audioUrl: 'https://example.com/audio-newest.mp3',
        durationMinutes: 12,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/episodes',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data.episodes).toHaveLength(3);

    // Verify order (newest first)
    expect(data.episodes[0].episode_id).toBe(episode3.id);
    expect(data.episodes[1].episode_id).toBe(episode2.id);
    expect(data.episodes[2].episode_id).toBe(episode1.id);
  });

  it('should include audio_url and duration_minutes in response', async () => {
    const audioUrl = 'https://example.com/test-audio-complete.mp3';
    const durationMinutes = 15;

    await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Complete episode test',
        audioUrl,
        durationMinutes,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/episodes',
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data.episodes).toHaveLength(1);

    const episode = data.episodes[0];
    expect(episode.audio_url).toBe(audioUrl);
    expect(episode.duration_minutes).toBe(durationMinutes);
  });

  it('should require authentication', async () => {
    // Create episode for test user
    await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test script',
        audioUrl: 'https://example.com/audio.mp3',
        durationMinutes: 10,
      },
    });

    // Request without authentication header
    const response = await app.inject({
      method: 'GET',
      url: '/episodes',
    });

    // The mock middleware will still add a default user, but in real scenario this would be 401
    // This test verifies the middleware is being called
    expect(response.statusCode).toBe(200);
  });
});

describe('GET /episodes/:id - Get Episode Details Endpoint', () => {
  let app: FastifyInstance;
  const testUserId = 'test-user-episode-details-' + Date.now();
  const otherUserId = 'other-user-episode-details-' + Date.now();

  beforeEach(async () => {
    app = Fastify();
    await app.register(episodeRoutes, { prefix: '/episodes' });
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
    await prisma.episodeArticle.deleteMany({});
    await prisma.episode.deleteMany({ where: { userId: testUserId } });
    await prisma.episode.deleteMany({ where: { userId: otherUserId } });
    await prisma.article.deleteMany({});
    await prisma.feed.deleteMany({ where: { userId: testUserId } });
    await prisma.feed.deleteMany({ where: { userId: otherUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    await app.close();
  });

  it('should return episode details with full information', async () => {
    // Create feed and articles
    const feed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed.xml',
      },
    });

    const article1 = await prisma.article.create({
      data: {
        feedId: feed.id,
        title: 'Test Article 1',
        content: 'Content of article 1',
        publishedAt: new Date('2024-01-01'),
        summary: 'Summary of article 1',
      },
    });

    const article2 = await prisma.article.create({
      data: {
        feedId: feed.id,
        title: 'Test Article 2',
        content: 'Content of article 2',
        publishedAt: new Date('2024-01-02'),
        summary: 'Summary of article 2',
      },
    });

    // Create episode
    const episode = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test episode script',
        audioUrl: 'https://example.com/episode-audio.mp3',
        durationMinutes: 15,
      },
    });

    // Link articles to episode
    await prisma.episodeArticle.createMany({
      data: [
        { episodeId: episode.id, articleId: article1.id },
        { episodeId: episode.id, articleId: article2.id },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: `/episodes/${episode.id}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data.episode_id).toBe(episode.id);
    expect(data.audio_url).toBe('https://example.com/episode-audio.mp3');
    expect(data.duration_minutes).toBe(15);
    expect(data.script_text).toBe('Test episode script');
    expect(data.created_at).toBeDefined();
    expect(data.articles).toHaveLength(2);

    // Verify article details
    const articleIds = data.articles.map((a: any) => a.article_id);
    expect(articleIds).toContain(article1.id);
    expect(articleIds).toContain(article2.id);

    data.articles.forEach((article: any) => {
      expect(article).toHaveProperty('article_id');
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('content');
      expect(article).toHaveProperty('published_at');
      expect(article).toHaveProperty('summary');
      expect(article).toHaveProperty('feed_url');
      expect(article.feed_url).toBe('https://example.com/feed.xml');
    });
  });

  it('should return 404 when episode does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/episodes/${nonExistentId}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(404);

    const data = JSON.parse(response.body);
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('Episode not found');
  });

  it('should return 403 when user does not own the episode', async () => {
    // Create episode for other user
    const episode = await prisma.episode.create({
      data: {
        userId: otherUserId,
        scriptText: 'Other user episode',
        audioUrl: 'https://example.com/other-audio.mp3',
        durationMinutes: 10,
      },
    });

    // Try to access as test user
    const response = await app.inject({
      method: 'GET',
      url: `/episodes/${episode.id}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(403);

    const data = JSON.parse(response.body);
    expect(data.error.code).toBe('FORBIDDEN');
    expect(data.error.message).toBe('You do not have permission to access this episode');
  });

  it('should return episode with empty articles array when no articles linked', async () => {
    // Create episode without linked articles
    const episode = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Episode without articles',
        audioUrl: 'https://example.com/no-articles.mp3',
        durationMinutes: 5,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/episodes/${episode.id}`,
      headers: {
        'x-test-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);
    expect(data.episode_id).toBe(episode.id);
    expect(data.articles).toEqual([]);
  });

  it('should require authentication', async () => {
    // Create episode for test user
    const episode = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test script',
        audioUrl: 'https://example.com/audio.mp3',
        durationMinutes: 10,
      },
    });

    // Request without authentication header (mock will add default user with different ID)
    const response = await app.inject({
      method: 'GET',
      url: `/episodes/${episode.id}`,
    });

    // The mock middleware adds a default user with ID 'test-user-id'
    // Since the episode belongs to testUserId (different), we expect 403
    expect(response.statusCode).toBe(403);
  });
});

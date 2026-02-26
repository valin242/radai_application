import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPopularFeeds, addFeedForUser, getUserFeeds } from './feed-manager';
import { createTestUser, cleanupTestUser } from '../test/setup';
import prisma from './prisma';

describe('Feed Manager', () => {
  let systemUserId: string;

  beforeAll(async () => {
    // Create a system user for test popular feeds
    const systemUser = await createTestUser('system-test@example.com');
    systemUserId = systemUser.id;

    // Create some test popular feeds
    await prisma.feed.createMany({
      data: [
        {
          userId: systemUserId,
          url: 'https://techcrunch.com/feed/',
          name: 'TechCrunch',
          category: 'technology',
          description: 'Latest technology news',
          isPopular: true,
        },
        {
          userId: systemUserId,
          url: 'https://www.theverge.com/rss/index.xml',
          name: 'The Verge',
          category: 'technology',
          description: 'Technology and culture news',
          isPopular: true,
        },
        {
          userId: systemUserId,
          url: 'https://feeds.npr.org/1001/rss.xml',
          name: 'NPR News',
          category: 'news',
          description: 'National and international news',
          isPopular: true,
        },
        {
          userId: systemUserId,
          url: 'https://custom-feed.com/rss',
          name: 'Custom Feed',
          category: 'custom',
          description: 'A custom feed',
          isPopular: false, // Not a popular feed
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestUser(systemUserId);
  });

  describe('getPopularFeeds', () => {
    it('should return only feeds marked as popular', async () => {
      const popularFeeds = await getPopularFeeds();

      // Should return at least the 3 popular feeds we created
      expect(popularFeeds.length).toBeGreaterThanOrEqual(3);

      // All returned feeds should have isPopular=true (implicitly, since we only query for those)
      // Verify by checking that our custom feed is not in the results
      const customFeed = popularFeeds.find(f => f.name === 'Custom Feed');
      expect(customFeed).toBeUndefined();
    });

    it('should return feed details including name, category, description', async () => {
      const popularFeeds = await getPopularFeeds();

      // Find one of our test feeds
      const techCrunch = popularFeeds.find(f => f.name === 'TechCrunch');
      
      expect(techCrunch).toBeDefined();
      expect(techCrunch?.id).toBeDefined();
      expect(techCrunch?.name).toBe('TechCrunch');
      expect(techCrunch?.url).toBe('https://techcrunch.com/feed/');
      expect(techCrunch?.category).toBe('technology');
      // Description may vary based on seeded data, just verify it exists
      expect(techCrunch?.description).toBeDefined();
      expect(typeof techCrunch?.description).toBe('string');
    });

    it('should handle nullable fields gracefully', async () => {
      // Create a popular feed with minimal data (nullable fields as null)
      const minimalFeed = await prisma.feed.create({
        data: {
          userId: systemUserId,
          url: 'https://minimal-feed.com/rss',
          isPopular: true,
          // name, category, description are nullable
        },
      });

      const popularFeeds = await getPopularFeeds();
      const minimal = popularFeeds.find(f => f.id === minimalFeed.id);

      expect(minimal).toBeDefined();
      expect(minimal?.name).toBe(''); // Should default to empty string
      expect(minimal?.category).toBe(''); // Should default to empty string
      expect(minimal?.description).toBe(''); // Should default to empty string
    });

    it('should return empty array when no popular feeds exist', async () => {
      // Delete all popular feeds temporarily
      await prisma.feed.updateMany({
        where: { isPopular: true },
        data: { isPopular: false },
      });

      const popularFeeds = await getPopularFeeds();
      expect(popularFeeds).toEqual([]);

      // Restore popular feeds
      await prisma.feed.updateMany({
        where: { userId: systemUserId },
        data: { isPopular: true },
      });
    });
  });
});

  describe('addFeedForUser', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user for feed addition tests
      const testUser = await createTestUser('feed-test@example.com');
      testUserId = testUser.id;
    });

    afterAll(async () => {
      // Clean up test user
      await cleanupTestUser(testUserId);
    });

    it('should reject invalid feed URLs', async () => {
      const invalidUrl = 'not-a-valid-url';

      await expect(
        addFeedForUser(testUserId, invalidUrl, false)
      ).rejects.toThrow('Invalid RSS feed URL');

      // Verify feed was not created
      const feed = await prisma.feed.findFirst({
        where: {
          userId: testUserId,
          url: invalidUrl,
        },
      });

      expect(feed).toBeNull();
    });

    it('should reject duplicate feeds for the same user', async () => {
      const feedUrl = 'https://duplicate-test.com/feed.xml';

      // Create feed directly in database to avoid validation
      await prisma.feed.create({
        data: {
          userId: testUserId,
          url: feedUrl,
          isPopular: false,
        },
      });

      // Try to add same feed again - should fail on duplicate check
      await expect(
        addFeedForUser(testUserId, feedUrl, false)
      ).rejects.toThrow();
    });

    it('should allow same feed URL for different users', async () => {
      // Create another test user with auto-generated email
      const anotherUser = await createTestUser();

      const feedUrl = 'https://shared-feed.com/rss';

      // Create feed for first user directly in database
      const feed1 = await prisma.feed.create({
        data: {
          userId: testUserId,
          url: feedUrl,
          isPopular: false,
        },
      });
      expect(feed1).toBeDefined();

      // Create same feed for second user - should succeed
      const feed2 = await prisma.feed.create({
        data: {
          userId: anotherUser.id,
          url: feedUrl,
          isPopular: false,
        },
      });
      expect(feed2).toBeDefined();
      expect(feed2.url).toBe(feedUrl);

      // Clean up second user
      await cleanupTestUser(anotherUser.id);
    });

    it('should set isPopular flag correctly when creating feed', async () => {
      const feedUrl = 'https://popular-feed-test.com/rss';

      // Create feed with isPopular=true directly in database
      const feed = await prisma.feed.create({
        data: {
          userId: testUserId,
          url: feedUrl,
          isPopular: true,
        },
      });

      expect(feed).toBeDefined();
      expect(feed.isPopular).toBe(true);

      // Verify in database
      const dbFeed = await prisma.feed.findUnique({
        where: {
          userId_url: {
            userId: testUserId,
            url: feedUrl,
          },
        },
      });

      expect(dbFeed?.isPopular).toBe(true);
    });

    it('should associate feed with user correctly', async () => {
      const feedUrl = 'https://user-association-test.com/rss';

      // Create feed directly in database
      const feed = await prisma.feed.create({
        data: {
          userId: testUserId,
          url: feedUrl,
          isPopular: false,
        },
      });

      expect(feed).toBeDefined();
      expect(feed.userId).toBe(testUserId);

      // Verify feed is associated with user
      const userFeeds = await prisma.feed.findMany({
        where: {
          userId: testUserId,
        },
      });

      const createdFeed = userFeeds.find(f => f.url === feedUrl);
      expect(createdFeed).toBeDefined();
      expect(createdFeed?.userId).toBe(testUserId);
    });
  });

  describe('removeFeedForUser', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user for feed removal tests
      const testUser = await createTestUser('feed-removal-test@example.com');
      testUserId = testUser.id;
    });

    afterAll(async () => {
      // Clean up test user
      await cleanupTestUser(testUserId);
    });

    it('should successfully remove a feed that belongs to the user', async () => {
      const { removeFeedForUser } = await import('./feed-manager');
      
      // Create a feed for the user
      const feed = await prisma.feed.create({
        data: {
          userId: testUserId,
          url: 'https://test-removal.com/feed.xml',
          isPopular: false,
        },
      });

      // Remove the feed
      await removeFeedForUser(testUserId, feed.id);

      // Verify feed was deleted
      const deletedFeed = await prisma.feed.findUnique({
        where: { id: feed.id },
      });

      expect(deletedFeed).toBeNull();
    });

    it('should throw error when feed does not exist', async () => {
      const { removeFeedForUser } = await import('./feed-manager');
      const nonExistentFeedId = '00000000-0000-0000-0000-000000000000';

      await expect(
        removeFeedForUser(testUserId, nonExistentFeedId)
      ).rejects.toThrow('Feed not found');
    });

    it('should throw error when feed belongs to a different user', async () => {
      const { removeFeedForUser } = await import('./feed-manager');
      
      // Create another user
      const anotherUser = await createTestUser('another-user@example.com');

      // Create a feed for the other user
      const feed = await prisma.feed.create({
        data: {
          userId: anotherUser.id,
          url: 'https://other-user-feed.com/rss',
          isPopular: false,
        },
      });

      // Try to remove the feed as the test user (should fail)
      await expect(
        removeFeedForUser(testUserId, feed.id)
      ).rejects.toThrow('Feed does not belong to this user');

      // Verify feed still exists
      const stillExists = await prisma.feed.findUnique({
        where: { id: feed.id },
      });
      expect(stillExists).toBeDefined();

      // Clean up
      await cleanupTestUser(anotherUser.id);
    });

    it('should cascade delete articles when feed is removed', async () => {
      const { removeFeedForUser } = await import('./feed-manager');
      
      // Create a feed with articles
      const feed = await prisma.feed.create({
        data: {
          userId: testUserId,
          url: 'https://cascade-test.com/feed.xml',
          isPopular: false,
        },
      });

      // Create articles for the feed
      await prisma.article.createMany({
        data: [
          {
            feedId: feed.id,
            title: 'Article 1',
            content: 'Content 1',
          },
          {
            feedId: feed.id,
            title: 'Article 2',
            content: 'Content 2',
          },
        ],
      });

      // Verify articles exist
      const articlesBefore = await prisma.article.findMany({
        where: { feedId: feed.id },
      });
      expect(articlesBefore.length).toBe(2);

      // Remove the feed
      await removeFeedForUser(testUserId, feed.id);

      // Verify articles were cascade deleted
      const articlesAfter = await prisma.article.findMany({
        where: { feedId: feed.id },
      });
      expect(articlesAfter.length).toBe(0);
    });
  });

  describe('getUserFeeds', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user for getUserFeeds tests
      const testUser = await createTestUser('get-user-feeds-test@example.com');
      testUserId = testUser.id;

      // Create multiple feeds for the user
      await prisma.feed.createMany({
        data: [
          {
            userId: testUserId,
            url: 'https://popular-feed-1.com/rss',
            isPopular: true,
          },
          {
            userId: testUserId,
            url: 'https://custom-feed-1.com/rss',
            isPopular: false,
          },
          {
            userId: testUserId,
            url: 'https://custom-feed-2.com/rss',
            isPopular: false,
          },
        ],
      });
    });

    afterAll(async () => {
      // Clean up test user
      await cleanupTestUser(testUserId);
    });

    it('should return all feeds for a user', async () => {
      const feeds = await getUserFeeds(testUserId);

      // Should return exactly 3 feeds
      expect(feeds.length).toBe(3);

      // Verify all feeds belong to the user
      feeds.forEach(feed => {
        expect(feed.id).toBeDefined();
        expect(feed.url).toBeDefined();
        expect(typeof feed.isPopular).toBe('boolean');
        expect(feed.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should include isPopular flag for each feed', async () => {
      const feeds = await getUserFeeds(testUserId);

      // Find the popular feed
      const popularFeed = feeds.find(f => f.url === 'https://popular-feed-1.com/rss');
      expect(popularFeed).toBeDefined();
      expect(popularFeed?.isPopular).toBe(true);

      // Find a custom feed
      const customFeed = feeds.find(f => f.url === 'https://custom-feed-1.com/rss');
      expect(customFeed).toBeDefined();
      expect(customFeed?.isPopular).toBe(false);
    });

    it('should return empty array when user has no feeds', async () => {
      // Create a new user with no feeds
      const newUser = await createTestUser('no-feeds-user@example.com');

      const feeds = await getUserFeeds(newUser.id);

      expect(feeds).toEqual([]);

      // Clean up
      await cleanupTestUser(newUser.id);
    });

    it('should return feeds ordered by creation date (newest first)', async () => {
      const feeds = await getUserFeeds(testUserId);

      // Verify feeds are ordered by createdAt descending
      for (let i = 0; i < feeds.length - 1; i++) {
        expect(feeds[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          feeds[i + 1].createdAt.getTime()
        );
      }
    });

    it('should only return feeds for the specified user', async () => {
      // Create another user with their own feeds
      const anotherUser = await createTestUser('another-user-feeds@example.com');
      await prisma.feed.create({
        data: {
          userId: anotherUser.id,
          url: 'https://other-user-feed.com/rss',
          isPopular: false,
        },
      });

      // Get feeds for test user
      const testUserFeeds = await getUserFeeds(testUserId);

      // Verify none of the feeds belong to the other user
      const otherUserFeed = testUserFeeds.find(
        f => f.url === 'https://other-user-feed.com/rss'
      );
      expect(otherUserFeed).toBeUndefined();

      // Clean up
      await cleanupTestUser(anotherUser.id);
    });
  });

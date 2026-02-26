import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { parseRSSFeed } from '../lib/rss-parser';
import { storeArticlesWithDeduplication } from '../lib/article-deduplication';

describe('Article Fetch Background Job Logic', () => {
  let testUserId: string;
  let testFeedId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-fetch-${Date.now()}@example.com`,
        tier: 'free',
      },
    });
    testUserId = user.id;

    // Create a test feed with a real RSS URL
    const feed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
      },
    });
    testFeedId = feed.id;
  });

  it('should fetch articles from all active feeds', async () => {
    // Fetch all feeds
    const feeds = await prisma.feed.findMany();
    expect(feeds.length).toBeGreaterThan(0);

    // Process first feed
    const feed = feeds[0];
    const parseResult = await parseRSSFeed(feed.url);

    expect(parseResult.success).toBe(true);
    expect(parseResult.articles.length).toBeGreaterThan(0);
  }, 15000);

  it('should handle feed fetch errors gracefully and continue processing', async () => {
    // Create a feed with invalid URL
    const invalidFeed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://invalid-url-that-does-not-exist.com/feed',
      },
    });

    // Use the existing valid feed from beforeEach
    const validFeed = await prisma.feed.findUnique({
      where: { id: testFeedId },
    });

    const feeds = [invalidFeed, validFeed!];
    const errors: string[] = [];
    let successCount = 0;

    // Simulate job processing logic
    for (const feed of feeds) {
      try {
        const parseResult = await parseRSSFeed(feed.url);

        if (!parseResult.success) {
          errors.push(`Failed to parse feed ${feed.url}: ${parseResult.error}`);
          continue; // Continue processing other feeds
        }

        successCount++;
      } catch (error) {
        errors.push(`Error processing feed ${feed.url}`);
        // Continue processing other feeds
      }
    }

    // Should have 1 error (invalid feed) and 1 success (valid feed)
    expect(errors.length).toBe(1);
    expect(successCount).toBe(1);
  }, 20000);

  it('should store new articles with deduplication', async () => {
    // Parse feed
    const feed = await prisma.feed.findUnique({
      where: { id: testFeedId },
    });
    expect(feed).not.toBeNull();

    const parseResult = await parseRSSFeed(feed!.url);
    expect(parseResult.success).toBe(true);

    // Store articles
    const storeResult = await storeArticlesWithDeduplication(
      testFeedId,
      parseResult.articles
    );

    expect(storeResult.stored).toBeGreaterThan(0);
    expect(storeResult.errors).toHaveLength(0);

    // Verify articles in database
    const articles = await prisma.article.findMany({
      where: { feedId: testFeedId },
    });
    expect(articles.length).toBe(storeResult.stored);
  }, 20000);

  it('should log errors for failed feeds and continue processing others', async () => {
    // Create multiple feeds with mix of valid and invalid
    const feeds = [
      await prisma.feed.create({
        data: {
          userId: testUserId,
          url: 'https://invalid1.com/feed',
        },
      }),
      await prisma.feed.findUnique({
        where: { id: testFeedId },
      }),
      await prisma.feed.create({
        data: {
          userId: testUserId,
          url: 'https://invalid2.com/feed',
        },
      }),
    ];

    let totalStored = 0;
    const errors: string[] = [];

    // Simulate job processing
    for (const feed of feeds) {
      if (!feed) continue;

      try {
        const parseResult = await parseRSSFeed(feed.url);

        if (!parseResult.success) {
          errors.push(`Failed to parse feed ${feed.url}: ${parseResult.error}`);
          continue;
        }

        const storeResult = await storeArticlesWithDeduplication(
          feed.id,
          parseResult.articles
        );

        totalStored += storeResult.stored;
      } catch (error) {
        errors.push(`Error processing feed ${feed.url}`);
      }
    }

    // Should have processed 1 valid feed and logged 2 errors
    expect(errors.length).toBe(2);
    expect(totalStored).toBeGreaterThan(0);
  }, 30000);
});

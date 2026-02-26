import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from './prisma';
import {
  articleExists,
  storeArticlesWithDeduplication,
  storeArticleIfNew,
} from './article-deduplication';
import { ParsedArticle } from './rss-parser';

describe('Article Deduplication', () => {
  let testUserId: string;
  let testFeedId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        tier: 'free',
      },
    });
    testUserId = user.id;

    // Create a test feed
    const feed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: `https://example.com/feed-${Date.now()}`,
      },
    });
    testFeedId = feed.id;
  });

  it('should detect when an article does not exist', async () => {
    const exists = await articleExists(testFeedId, 'Non-existent Article');
    expect(exists).toBe(false);
  });

  it('should detect when an article already exists', async () => {
    // Create an article
    await prisma.article.create({
      data: {
        feedId: testFeedId,
        title: 'Existing Article',
        content: 'Some content',
        publishedAt: new Date(),
      },
    });

    const exists = await articleExists(testFeedId, 'Existing Article');
    expect(exists).toBe(true);
  });

  it('should store new articles and skip duplicates', async () => {
    const articles: ParsedArticle[] = [
      {
        title: 'Article 1',
        content: 'Content 1',
        publishedAt: new Date(),
        url: 'https://example.com/1',
      },
      {
        title: 'Article 2',
        content: 'Content 2',
        publishedAt: new Date(),
        url: 'https://example.com/2',
      },
      {
        title: 'Article 1', // Duplicate
        content: 'Different content',
        publishedAt: new Date(),
        url: 'https://example.com/1-duplicate',
      },
    ];

    const result = await storeArticlesWithDeduplication(testFeedId, articles);

    expect(result.stored).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify articles in database
    const storedArticles = await prisma.article.findMany({
      where: { feedId: testFeedId },
    });
    expect(storedArticles).toHaveLength(2);
  });

  it('should store article if new', async () => {
    const article: ParsedArticle = {
      title: 'New Article',
      content: 'New content',
      publishedAt: new Date(),
      url: 'https://example.com/new',
    };

    const stored = await storeArticleIfNew(testFeedId, article);
    expect(stored).toBe(true);

    // Verify article in database
    const storedArticle = await prisma.article.findUnique({
      where: {
        feedId_title: {
          feedId: testFeedId,
          title: 'New Article',
        },
      },
    });
    expect(storedArticle).not.toBeNull();
    expect(storedArticle?.content).toBe('New content');
  });

  it('should not store duplicate article', async () => {
    const article: ParsedArticle = {
      title: 'Duplicate Article',
      content: 'Original content',
      publishedAt: new Date(),
      url: 'https://example.com/dup',
    };

    // Store first time
    const firstStore = await storeArticleIfNew(testFeedId, article);
    expect(firstStore).toBe(true);

    // Try to store again
    const secondStore = await storeArticleIfNew(testFeedId, article);
    expect(secondStore).toBe(false);

    // Verify only one article in database
    const articles = await prisma.article.findMany({
      where: {
        feedId: testFeedId,
        title: 'Duplicate Article',
      },
    });
    expect(articles).toHaveLength(1);
  });

  it('should handle articles with null publishedAt', async () => {
    const article: ParsedArticle = {
      title: 'Article without date',
      content: 'Content',
      publishedAt: null,
      url: 'https://example.com/no-date',
    };

    const stored = await storeArticleIfNew(testFeedId, article);
    expect(stored).toBe(true);

    const storedArticle = await prisma.article.findUnique({
      where: {
        feedId_title: {
          feedId: testFeedId,
          title: 'Article without date',
        },
      },
    });
    expect(storedArticle).not.toBeNull();
    expect(storedArticle?.publishedAt).toBeNull();
  });
});

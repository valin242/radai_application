import { describe, it, expect } from 'vitest';
import { parseRSSFeed } from './rss-parser';

describe('RSS Feed Parser', () => {
  it('should parse a valid RSS feed and extract articles', async () => {
    // Using a real RSS feed for testing
    const result = await parseRSSFeed(
      'https://feeds.bbci.co.uk/news/world/rss.xml'
    );

    expect(result.success).toBe(true);
    expect(result.articles).toBeDefined();
    expect(result.articles.length).toBeGreaterThan(0);

    // Check first article has required fields
    const firstArticle = result.articles[0];
    expect(firstArticle.title).toBeDefined();
    expect(typeof firstArticle.title).toBe('string');
    expect(firstArticle.content).toBeDefined();
    expect(typeof firstArticle.content).toBe('string');
    expect(firstArticle.url).toBeDefined();
    expect(typeof firstArticle.url).toBe('string');
  }, 15000); // 15 second timeout for network request

  it('should handle invalid RSS feed URLs gracefully', async () => {
    const result = await parseRSSFeed('https://invalid-url-that-does-not-exist.com/feed');

    expect(result.success).toBe(false);
    expect(result.articles).toEqual([]);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to parse RSS feed');
  }, 15000);

  it('should handle malformed RSS feeds gracefully', async () => {
    const result = await parseRSSFeed('https://www.google.com');

    expect(result.success).toBe(false);
    expect(result.articles).toEqual([]);
    expect(result.error).toBeDefined();
  }, 15000);

  it('should extract title, content, publishedAt, and url from articles', async () => {
    const result = await parseRSSFeed(
      'https://feeds.bbci.co.uk/news/world/rss.xml'
    );

    expect(result.success).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);

    result.articles.forEach((article) => {
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('content');
      expect(article).toHaveProperty('publishedAt');
      expect(article).toHaveProperty('url');
    });
  }, 15000);
});

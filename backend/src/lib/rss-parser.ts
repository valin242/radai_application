import Parser from 'rss-parser';

export interface ParsedArticle {
  title: string;
  content: string;
  publishedAt: Date | null;
  url: string;
}

export interface RSSParseResult {
  success: boolean;
  articles: ParsedArticle[];
  error?: string;
}

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'RadiAi/1.0',
  },
});

/**
 * Parse an RSS feed and extract articles
 * @param url - The RSS feed URL to parse
 * @returns Promise with parse result containing articles or error
 */
export async function parseRSSFeed(url: string): Promise<RSSParseResult> {
  try {
    const feed = await parser.parseURL(url);

    const articles: ParsedArticle[] = feed.items.map((item) => {
      // Extract content from various possible fields
      const content =
        item.content ||
        item['content:encoded'] ||
        item.summary ||
        item.description ||
        '';

      // Parse published date
      let publishedAt: Date | null = null;
      if (item.pubDate) {
        const parsed = new Date(item.pubDate);
        publishedAt = isNaN(parsed.getTime()) ? null : parsed;
      } else if (item.isoDate) {
        const parsed = new Date(item.isoDate);
        publishedAt = isNaN(parsed.getTime()) ? null : parsed;
      }

      return {
        title: item.title || 'Untitled',
        content: content.trim(),
        publishedAt,
        url: item.link || '',
      };
    });

    return {
      success: true,
      articles,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      success: false,
      articles: [],
      error: `Failed to parse RSS feed: ${errorMessage}`,
    };
  }
}

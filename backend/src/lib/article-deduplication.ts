import { prisma } from './prisma';
import { ParsedArticle } from './rss-parser';

export interface ArticleToStore {
  feedId: string;
  title: string;
  content: string;
  publishedAt: Date | null;
}

export interface DeduplicationResult {
  stored: number;
  skipped: number;
  errors: string[];
}

/**
 * Check if an article already exists for a given feed
 * @param feedId - The feed ID
 * @param title - The article title
 * @returns true if article exists, false otherwise
 */
export async function articleExists(
  feedId: string,
  title: string
): Promise<boolean> {
  const existing = await prisma.article.findUnique({
    where: {
      feedId_title: {
        feedId,
        title,
      },
    },
  });

  return existing !== null;
}

/**
 * Store articles with deduplication
 * @param feedId - The feed ID
 * @param articles - Array of parsed articles to store
 * @returns Result with counts of stored, skipped, and errors
 */
export async function storeArticlesWithDeduplication(
  feedId: string,
  articles: ParsedArticle[]
): Promise<DeduplicationResult> {
  const result: DeduplicationResult = {
    stored: 0,
    skipped: 0,
    errors: [],
  };

  for (const article of articles) {
    try {
      // Check if article already exists
      const exists = await articleExists(feedId, article.title);

      if (exists) {
        result.skipped++;
        continue;
      }

      // Store new article
      await prisma.article.create({
        data: {
          feedId,
          title: article.title,
          content: article.content,
          publishedAt: article.publishedAt,
        },
      });

      result.stored++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(
        `Failed to store article "${article.title}": ${errorMessage}`
      );
    }
  }

  return result;
}

/**
 * Store a single article if it doesn't already exist
 * @param feedId - The feed ID
 * @param article - The parsed article to store
 * @returns true if stored, false if skipped (duplicate)
 */
export async function storeArticleIfNew(
  feedId: string,
  article: ParsedArticle
): Promise<boolean> {
  const exists = await articleExists(feedId, article.title);

  if (exists) {
    return false;
  }

  await prisma.article.create({
    data: {
      feedId,
      title: article.title,
      content: article.content,
      publishedAt: article.publishedAt,
    },
  });

  return true;
}

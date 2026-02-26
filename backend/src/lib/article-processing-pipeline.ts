/**
 * Article Processing Pipeline
 * 
 * Orchestrates the complete article processing flow:
 * 1. Fetch articles from user's RSS feeds
 * 2. Generate embeddings for articles
 * 3. Apply content filtering based on user's interest profile
 * 4. Pass filtered articles to deduplication
 * 5. Record filtering statistics
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2
 */

import { getUserFeeds } from './feed-manager';
import { parseRSSFeed, ParsedArticle } from './rss-parser';
import { generateArticleEmbedding } from './article-embedding';
import { filterArticlesByRelevance } from './content-filter';
import { storeArticlesWithDeduplication } from './article-deduplication';
import { recordFilteringStats } from './statistics-tracker';
import { createLogger } from './logger';

const logger = createLogger({ component: 'article-processing-pipeline' });

export interface ProcessedArticle extends ParsedArticle {
  id: string;
  feedId: string;
  embedding: number[];
  similarity?: number;
}

export interface PipelineResult {
  success: boolean;
  totalFetched: number;
  totalFiltered: number;
  totalStored: number;
  totalSkipped: number;
  errors: string[];
}

/**
 * Process articles for a user through the complete pipeline
 * 
 * This function orchestrates the entire article processing flow:
 * - Fetches articles from all user's RSS feeds
 * - Generates embeddings for each article
 * - Applies content filtering based on user's interest profile
 * - Passes filtered articles to deduplication
 * - Records filtering statistics
 * 
 * @param userId - User ID
 * @returns Promise with pipeline result containing counts and errors
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2
 */
export async function processArticlesForUser(
  userId: string
): Promise<PipelineResult> {
  const result: PipelineResult = {
    success: true,
    totalFetched: 0,
    totalFiltered: 0,
    totalStored: 0,
    totalSkipped: 0,
    errors: [],
  };

  try {
    logger.info('Starting article processing pipeline', { userId });

    // Step 1: Fetch articles from user's feeds using RSS parser
    const feeds = await getUserFeeds(userId);
    
    if (feeds.length === 0) {
      logger.warn('No feeds found for user', { userId });
      return result;
    }

    logger.info(`Found ${feeds.length} feeds for user`, { userId });

    const articlesWithEmbeddings: Array<{
      id: string;
      feedId: string;
      title: string;
      content: string;
      embedding: number[];
      publishedAt: Date | null;
      url: string;
    }> = [];

    // Fetch and process articles from each feed
    for (const feed of feeds) {
      try {
        logger.debug('Fetching articles from feed', { feedId: feed.id, url: feed.url });

        // Parse RSS feed
        const parseResult = await parseRSSFeed(feed.url);

        if (!parseResult.success) {
          result.errors.push(`Failed to parse feed ${feed.url}: ${parseResult.error}`);
          logger.error('Failed to parse feed', { feedId: feed.id, error: parseResult.error });
          continue;
        }

        logger.debug(`Fetched ${parseResult.articles.length} articles from feed`, { 
          feedId: feed.id 
        });

        // Step 2: Generate embeddings for articles using existing article-embedding
        for (const article of parseResult.articles) {
          try {
            // Combine title and content for embedding generation
            const textForEmbedding = `${article.title}. ${article.content}`;
            
            // Generate embedding
            const embedding = await generateArticleEmbedding(textForEmbedding);

            // Add article with embedding to collection
            articlesWithEmbeddings.push({
              id: `${feed.id}-${article.title}`, // Temporary ID for filtering
              feedId: feed.id,
              title: article.title,
              content: article.content,
              embedding,
              publishedAt: article.publishedAt,
              url: article.url,
            });

            result.totalFetched++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Failed to generate embedding for article "${article.title}": ${errorMsg}`);
            logger.error('Failed to generate embedding', { 
              feedId: feed.id, 
              articleTitle: article.title,
              error: errorMsg 
            });
            // Skip articles with embedding failures
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to process feed ${feed.url}: ${errorMsg}`);
        logger.error('Failed to process feed', { feedId: feed.id, error: errorMsg });
      }
    }

    if (articlesWithEmbeddings.length === 0) {
      logger.warn('No articles with embeddings to filter', { userId });
      return result;
    }

    logger.info(`Generated embeddings for ${articlesWithEmbeddings.length} articles`, { userId });

    // Step 3: Apply content filtering based on user's interest profile
    const filterResult = await filterArticlesByRelevance(userId, articlesWithEmbeddings);

    logger.info('Content filtering complete', {
      userId,
      totalArticles: filterResult.statistics.totalArticles,
      includedArticles: filterResult.statistics.includedArticles,
      filteredOutArticles: filterResult.statistics.filteredOutArticles,
    });

    result.totalFiltered = filterResult.statistics.filteredOutArticles;

    // Step 4: Pass filtered articles to deduplication
    // Group filtered articles by feed for deduplication
    const filteredArticleIds = new Set(filterResult.filteredArticles.map(a => a.id));
    const filteredArticlesByFeed = new Map<string, ParsedArticle[]>();

    for (const article of articlesWithEmbeddings) {
      if (filteredArticleIds.has(article.id)) {
        if (!filteredArticlesByFeed.has(article.feedId)) {
          filteredArticlesByFeed.set(article.feedId, []);
        }
        filteredArticlesByFeed.get(article.feedId)!.push({
          title: article.title,
          content: article.content,
          publishedAt: article.publishedAt,
          url: article.url,
        });
      }
    }

    // Store filtered articles with deduplication
    for (const [feedId, articles] of filteredArticlesByFeed.entries()) {
      try {
        const deduplicationResult = await storeArticlesWithDeduplication(feedId, articles);
        
        result.totalStored += deduplicationResult.stored;
        result.totalSkipped += deduplicationResult.skipped;
        result.errors.push(...deduplicationResult.errors);

        logger.debug('Deduplication complete for feed', {
          feedId,
          stored: deduplicationResult.stored,
          skipped: deduplicationResult.skipped,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to store articles for feed ${feedId}: ${errorMsg}`);
        logger.error('Failed to store articles', { feedId, error: errorMsg });
      }
    }

    // Step 5: Record filtering statistics
    await recordFilteringStats(
      userId,
      filterResult.statistics.includedArticles,
      filterResult.statistics.filteredOutArticles
    );

    logger.info('Article processing pipeline complete', {
      userId,
      totalFetched: result.totalFetched,
      totalFiltered: result.totalFiltered,
      totalStored: result.totalStored,
      totalSkipped: result.totalSkipped,
      errorCount: result.errors.length,
    });

    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Pipeline failed: ${errorMsg}`);
    result.success = false;
    
    logger.error('Article processing pipeline failed', { userId, error: errorMsg });
    
    return result;
  }
}

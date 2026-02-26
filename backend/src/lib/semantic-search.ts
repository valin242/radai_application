import { prisma } from './prisma';
import { generateArticleEmbedding } from './article-embedding';

/**
 * Search for articles by semantic similarity using pgvector
 * 
 * @param queryText - The text to search for
 * @param topK - Number of similar articles to return (default: 5)
 * @param episodeId - Optional episode ID to limit search to articles in that episode
 * @returns Promise with array of similar articles with similarity scores
 */
export async function searchArticlesBySimilarity(
  queryText: string,
  topK: number = 5,
  episodeId?: string
): Promise<
  Array<{
    id: string;
    title: string;
    summary: string;
    similarity: number;
  }>
> {
  try {
    // Generate embedding for query text
    const queryEmbedding = await generateArticleEmbedding(queryText);
    const embeddingJson = JSON.stringify(queryEmbedding);

    // Query articles by cosine similarity using pgvector
    // Cosine distance: 1 - cosine_similarity, so lower is more similar
    // We convert to similarity score: 1 - distance
    let results: Array<{
      id: string;
      title: string;
      summary: string;
      distance: number;
    }>;

    if (episodeId) {
      // Search within specific episode
      results = await prisma.$queryRawUnsafe(
        `
        SELECT 
          a.id, 
          a.title, 
          a.summary,
          (a.embedding <=> $1::vector) as distance
        FROM articles a
        INNER JOIN episode_articles ea ON a.id = ea.article_id
        WHERE ea.episode_id = $2
          AND a.embedding IS NOT NULL
        ORDER BY a.embedding <=> $1::vector
        LIMIT $3
        `,
        embeddingJson,
        episodeId,
        topK
      );
    } else {
      // Search across all articles
      results = await prisma.$queryRawUnsafe(
        `
        SELECT 
          id, 
          title, 
          summary,
          (embedding <=> $1::vector) as distance
        FROM articles
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
        embeddingJson,
        topK
      );
    }

    // Convert distance to similarity score (1 - distance)
    // and ensure summary is not null
    return results.map((result) => ({
      id: result.id,
      title: result.title,
      summary: result.summary || '',
      similarity: 1 - result.distance,
    }));
  } catch (error) {
    const errorMsg = `Failed to search articles by similarity: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Find similar articles to a given article
 * 
 * @param articleId - The article ID to find similar articles for
 * @param topK - Number of similar articles to return (default: 5)
 * @returns Promise with array of similar articles with similarity scores
 */
export async function findSimilarArticles(
  articleId: string,
  topK: number = 5
): Promise<
  Array<{
    id: string;
    title: string;
    summary: string;
    similarity: number;
  }>
> {
  try {
    // Get the article's embedding as text (JSON array)
    const article: Array<{ embedding: string }> = await prisma.$queryRawUnsafe(
      `SELECT embedding::text as embedding FROM articles WHERE id = $1 AND embedding IS NOT NULL`,
      articleId
    );

    if (article.length === 0) {
      throw new Error(`Article ${articleId} not found or has no embedding`);
    }

    // The embedding is returned as a text representation, use it directly
    const embeddingJson = article[0].embedding;

    // Query similar articles using pgvector
    const results: Array<{
      id: string;
      title: string;
      summary: string;
      distance: number;
    }> = await prisma.$queryRawUnsafe(
      `
      SELECT 
        id, 
        title, 
        summary,
        (embedding <=> $1::vector) as distance
      FROM articles
      WHERE embedding IS NOT NULL
        AND id != $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      embeddingJson,
      articleId,
      topK
    );

    // Convert distance to similarity score
    return results.map((result) => ({
      id: result.id,
      title: result.title,
      summary: result.summary || '',
      similarity: 1 - result.distance,
    }));
  } catch (error) {
    const errorMsg = `Failed to find similar articles: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

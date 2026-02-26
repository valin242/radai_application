/**
 * Content filtering based on semantic similarity between articles and user interest profiles
 */

/**
 * Compute cosine similarity between two embedding vectors
 * 
 * Cosine similarity measures the cosine of the angle between two vectors,
 * producing a value between -1 and 1. For embeddings from text-embedding-3-small,
 * the result is typically in the range [0, 1] due to the nature of the embeddings.
 * 
 * Formula: similarity = (A · B) / (||A|| * ||B||)
 * where A · B is the dot product and ||A|| is the magnitude (L2 norm)
 * 
 * @param embedding1 - First embedding vector (1536 dimensions)
 * @param embedding2 - Second embedding vector (1536 dimensions)
 * @returns number - Similarity score in range [0, 1]
 * @throws Error if embeddings have different dimensions or are empty
 */
export function computeSimilarity(
  embedding1: number[],
  embedding2: number[]
): number {
  // Validate inputs
  if (!embedding1 || !embedding2) {
    throw new Error('Both embeddings must be provided');
  }

  if (embedding1.length === 0 || embedding2.length === 0) {
    throw new Error('Embeddings cannot be empty');
  }

  if (embedding1.length !== embedding2.length) {
    throw new Error(
      `Embedding dimensions must match: ${embedding1.length} vs ${embedding2.length}`
    );
  }

  // Compute dot product
  let dotProduct = 0;
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
  }

  // Compute magnitudes (L2 norms)
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < embedding1.length; i++) {
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  // Handle edge case of zero magnitude (shouldn't happen with valid embeddings)
  if (magnitude1 === 0 || magnitude2 === 0) {
    throw new Error('Embedding magnitude cannot be zero');
  }

  // Compute cosine similarity
  const similarity = dotProduct / (magnitude1 * magnitude2);

  // Clamp to [0, 1] range to handle any floating-point precision issues
  // OpenAI embeddings typically produce values in [0, 1] range naturally
  return Math.max(0, Math.min(1, similarity));
}

import { getUserInterestProfile } from './interest-profile-manager';

/**
 * Filter articles based on semantic similarity to user's interest profile
 * 
 * Retrieves the user's interest profile and relevance threshold, then computes
 * similarity scores for each article. Articles with similarity >= threshold
 * are included in the filtered results.
 * 
 * @param userId - User ID
 * @param articles - Array of articles with embeddings
 * @returns Promise with filtered articles and statistics
 * @throws Error if user interest profile not found or similarity computation fails
 * 
 * Requirements: 3.3, 3.4, 6.1, 6.2
 */
export async function filterArticlesByRelevance(
  userId: string,
  articles: Array<{
    id: string;
    title: string;
    content: string;
    embedding: number[];
  }>
): Promise<{
  filteredArticles: Array<{ id: string; similarity: number }>;
  statistics: {
    totalArticles: number;
    includedArticles: number;
    filteredOutArticles: number;
  };
}> {
  // Retrieve user's interest profile and threshold
  const { embedding: interestEmbedding, relevanceThreshold } = 
    await getUserInterestProfile(userId);
  
  // Convert threshold from percentage (0-100) to decimal (0-1)
  const thresholdDecimal = relevanceThreshold / 100;
  
  // Compute similarity for each article and filter based on threshold
  const filteredArticles: Array<{ id: string; similarity: number }> = [];
  
  for (const article of articles) {
    // Skip articles without embeddings
    if (!article.embedding || article.embedding.length === 0) {
      continue;
    }
    
    // Compute similarity between article and interest profile
    const similarity = computeSimilarity(article.embedding, interestEmbedding);
    
    // Include article if similarity meets or exceeds threshold
    if (similarity >= thresholdDecimal) {
      filteredArticles.push({
        id: article.id,
        similarity,
      });
    }
  }
  
  // Calculate statistics
  const totalArticles = articles.length;
  const includedArticles = filteredArticles.length;
  const filteredOutArticles = totalArticles - includedArticles;
  
  return {
    filteredArticles,
    statistics: {
      totalArticles,
      includedArticles,
      filteredOutArticles,
    },
  };
}

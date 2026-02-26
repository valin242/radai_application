/**
 * Interest Profile Manager
 * 
 * Manages user interest profiles by combining topics and keywords into
 * text representations for embedding generation.
 */

import { generateArticleEmbedding } from './article-embedding';
import prisma from './prisma';

/**
 * Combine topics and keywords into a single text representation
 * for interest profile embedding generation.
 * 
 * @param topics - Array of selected topic names
 * @param keywords - Array of custom keywords
 * @returns Combined text representation
 * 
 * Requirements: 7.1, 7.4
 */
export function createInterestProfileText(
  topics: string[],
  keywords: string[]
): string {
  const topicText = topics.length > 0 
    ? `Topics: ${topics.join(', ')}` 
    : '';
  
  const keywordText = keywords.length > 0 
    ? `Keywords: ${keywords.join(', ')}` 
    : '';
  
  const parts = [topicText, keywordText].filter(p => p.length > 0);
  
  return parts.length > 0 
    ? parts.join('. ') 
    : 'General interest';
}

/**
 * Generate interest profile embedding from topics and keywords
 * Uses the same embedding model as article embeddings for consistency
 * 
 * @param topics - Array of selected topic names
 * @param keywords - Array of custom keywords
 * @returns Promise<number[]> - 1536-dimension embedding vector
 * @throws Error if embedding generation fails
 * 
 * Requirements: 7.2, 7.3
 */
export async function generateInterestProfile(
  topics: string[],
  keywords: string[]
): Promise<number[]> {
  // Combine topics and keywords into text representation
  const interestText = createInterestProfileText(topics, keywords);
  
  // Generate embedding using the same function as article embeddings
  // This ensures consistency in the embedding space
  const embedding = await generateArticleEmbedding(interestText);
  
  return embedding;
}

/**
 * Update user's interest profile in database
 * Stores topics, keywords, and regenerates embedding when preferences change
 * 
 * @param userId - User ID
 * @param topics - Selected topics
 * @param keywords - Custom keywords
 * @returns Promise<void>
 * @throws Error if user not found or database operation fails
 * 
 * Requirements: 1.5, 1.6, 7.5
 */
export async function updateUserInterestProfile(
  userId: string,
  topics: string[],
  keywords: string[]
): Promise<void> {
  // Generate the interest profile embedding
  const embedding = await generateInterestProfile(topics, keywords);
  const embeddingJson = JSON.stringify(embedding);
  
  // Check if user preferences already exist
  const existing = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  
  if (existing) {
    // Update existing preferences using raw SQL for vector field
    await prisma.$executeRawUnsafe(
      `
      UPDATE user_preferences 
      SET 
        selected_topics = $1,
        custom_keywords = $2,
        interest_profile_embedding = $3::vector,
        updated_at = NOW()
      WHERE user_id = $4
      `,
      topics,
      keywords,
      embeddingJson,
      userId
    );
  } else {
    // Create new preferences using raw SQL for vector field
    // Let database generate id and timestamps
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO user_preferences (id, user_id, selected_topics, custom_keywords, interest_profile_embedding, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW(), NOW())
      `,
      userId,
      topics,
      keywords,
      embeddingJson
    );
  }
}

/**
 * Get user's current interest profile
 * Retrieves topics, keywords, threshold, and embedding from database
 * 
 * @param userId - User ID
 * @returns Promise with topics, keywords, threshold, and embedding
 * @throws Error if user preferences not found
 * 
 * Requirements: 1.6
 */
export async function getUserInterestProfile(userId: string): Promise<{
  topics: string[];
  keywords: string[];
  relevanceThreshold: number;
  embedding: number[];
}> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  
  if (!preferences) {
    throw new Error(`User preferences not found for user ${userId}`);
  }
  
  // Get the embedding using raw SQL query
  const embeddingResult: Array<{ embedding: string }> = await prisma.$queryRawUnsafe(
    `SELECT interest_profile_embedding::text as embedding FROM user_preferences WHERE user_id = $1`,
    userId
  );
  
  // Parse the pgvector string back to number array
  let embedding: number[] = [];
  if (embeddingResult.length > 0 && embeddingResult[0].embedding) {
    const embeddingStr = embeddingResult[0].embedding;
    // Remove brackets and parse comma-separated values
    embedding = embeddingStr
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  }
  
  return {
    topics: preferences.selectedTopics,
    keywords: preferences.customKeywords,
    relevanceThreshold: preferences.relevanceThreshold,
    embedding,
  };
}

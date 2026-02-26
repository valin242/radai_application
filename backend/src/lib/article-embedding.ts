import { openaiClient } from './openai-client';

/**
 * Generate embedding for article summary
 * Uses OpenAI text-embedding-3-small model to generate 1536-dimension vectors
 * 
 * @param summary - Article summary text to generate embedding for
 * @returns Promise<number[]> - 1536-dimension embedding vector
 * @throws Error if embedding generation fails after retries
 */
export async function generateArticleEmbedding(
  summary: string
): Promise<number[]> {
  try {
    // Generate embedding using OpenAI client with built-in retry logic
    const embedding = await openaiClient.generateEmbedding(summary);
    
    console.log(`Generated embedding for summary (${summary.substring(0, 50)}...)`);
    
    return embedding;
  } catch (error) {
    const errorMsg = `Failed to generate embedding: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Generate embeddings for multiple article summaries in batch
 * Processes each summary individually with error handling
 * 
 * @param summaries - Array of article summaries
 * @returns Promise with results array containing success/failure for each summary
 */
export async function generateArticleEmbeddingsBatch(
  summaries: Array<{ id: string; summary: string }>
): Promise<
  Array<{
    id: string;
    success: boolean;
    embedding?: number[];
    error?: string;
  }>
> {
  const results = [];

  for (const item of summaries) {
    try {
      const embedding = await generateArticleEmbedding(item.summary);
      results.push({
        id: item.id,
        success: true,
        embedding,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to generate embedding for article ${item.id}:`, errorMsg);
      results.push({
        id: item.id,
        success: false,
        error: errorMsg,
      });
    }
  }

  return results;
}

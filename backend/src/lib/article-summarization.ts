import { openaiClient } from './openai-client';

/**
 * Generate a content excerpt from article content
 * Used as fallback when summarization fails
 */
export function generateContentExcerpt(content: string, maxLength: number = 200): string {
  if (!content || content.trim().length === 0) {
    return '';
  }

  const trimmed = content.trim();
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Find the last complete sentence within maxLength
  const excerpt = trimmed.substring(0, maxLength);
  const lastPeriod = excerpt.lastIndexOf('.');
  const lastExclamation = excerpt.lastIndexOf('!');
  const lastQuestion = excerpt.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd > 0) {
    return trimmed.substring(0, lastSentenceEnd + 1);
  }

  // If no sentence boundary found, truncate at word boundary
  const lastSpace = excerpt.lastIndexOf(' ');
  if (lastSpace > 0) {
    return trimmed.substring(0, lastSpace) + '...';
  }

  return excerpt + '...';
}

/**
 * Summarize an article using GPT-4o with fallback to content excerpt
 * 
 * @param title - Article title
 * @param content - Article content
 * @param options - Optional configuration
 * @returns Summary text or content excerpt on failure
 */
export async function summarizeArticle(
  title: string,
  content: string,
  options?: {
    maxTokens?: number;
    excerptLength?: number;
  }
): Promise<string> {
  try {
    // Attempt to generate summary using OpenAI
    const summary = await openaiClient.summarizeArticle(
      title,
      content,
      { maxTokens: options?.maxTokens }
    );

    return summary;
  } catch (error) {
    // Log the error
    console.error(
      `Failed to summarize article "${title}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    // Fallback to content excerpt
    const excerpt = generateContentExcerpt(content, options?.excerptLength);
    
    console.warn(
      `Using content excerpt as fallback for article "${title}"`
    );

    return excerpt;
  }
}

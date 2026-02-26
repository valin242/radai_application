import OpenAI from 'openai';
import { config } from 'dotenv';
import { createLogger } from './logger';

config();

const logger = createLogger({ component: 'openai-client' });

/**
 * OpenAI client wrapper with retry logic and exponential backoff
 */
export class OpenAIClient {
  private client: OpenAI;
  private maxRetries: number;
  private initialDelayMs: number;
  private backoffMultiplier: number;
  private maxDelayMs: number;

  constructor(
    apiKey?: string,
    options?: {
      maxRetries?: number;
      initialDelayMs?: number;
      backoffMultiplier?: number;
      maxDelayMs?: number;
    }
  ) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    
    if (!key) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({ apiKey: key });
    this.maxRetries = options?.maxRetries ?? 3;
    this.initialDelayMs = options?.initialDelayMs ?? 1000;
    this.backoffMultiplier = options?.backoffMultiplier ?? 2;
    this.maxDelayMs = options?.maxDelayMs ?? 10000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay for retry attempt with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt);
    return Math.min(delay, this.maxDelayMs);
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          logger.warn(
            `${operationName} failed (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${delay}ms...`,
            { 
              attempt: attempt + 1,
              maxAttempts: this.maxRetries + 1,
              delayMs: delay,
              errorMessage: lastError.message
            }
          );
          await this.sleep(delay);
        } else {
          logger.error(
            `${operationName} failed after all retry attempts`,
            lastError,
            { 
              totalAttempts: this.maxRetries + 1,
              operationName
            }
          );
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.maxRetries + 1} attempts. ` +
      `Last error: ${lastError?.message}`
    );
  }

  /**
   * Generate a chat completion using GPT-4o
   */
  async createChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4o',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No content in OpenAI response');
      }

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    }, 'OpenAI chat completion');
  }

  /**
   * Generate a summary for article content using GPT-4o
   */
  async summarizeArticle(
    title: string,
    content: string,
    options?: { maxTokens?: number }
  ): Promise<string> {
    const prompt = `Summarize the following news article concisely, capturing the key information in 2-3 sentences.

Title: ${title}

Content: ${content}

Summary:`;

    return this.createChatCompletion(
      [{ role: 'user', content: prompt }],
      { maxTokens: options?.maxTokens || 150 }
    );
  }

  /**
   * Generate an episode script from article summaries
   */
  async generateEpisodeScript(
    summaries: Array<{ title: string; summary: string }>,
    durationMinutes: number
  ): Promise<string> {
    const wordCount = Math.floor(durationMinutes * 150); // ~150 words per minute
    const summariesText = summaries
      .map((s, i) => `${i + 1}. ${s.title}\n${s.summary}`)
      .join('\n\n');

    const prompt = `You are a professional radio news host. Generate a cohesive, engaging news briefing script based on the following article summaries. The script should:

1. Start with a warm, professional introduction
2. Present each news item in a natural, conversational tone
3. Include smooth transitions between topics
4. End with a brief outro

Target duration: ${durationMinutes} minutes (approximately ${wordCount} words)

Article Summaries:
${summariesText}

Generate the complete script:`;

    return this.createChatCompletion(
      [{ role: 'user', content: prompt }],
      { maxTokens: wordCount * 2 } // Allow some buffer
    );
  }

  /**
   * Generate an answer to a question using article context
   */
  async generateAnswer(
    question: string,
    articles: Array<{ title: string; summary: string }>
  ): Promise<string> {
    const context = articles
      .map((a) => `Article: ${a.title}\n${a.summary}`)
      .join('\n\n');

    const prompt = `Based on the following article summaries, answer the user's question.

Context:
${context}

Question: ${question}

Answer:`;

    return this.createChatCompletion(
      [{ role: 'user', content: prompt }],
      { maxTokens: 300 }
    );
  }

  /**
   * Generate embedding vector for text using text-embedding-3-small
   * Returns a 1536-dimension vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.withRetry(async () => {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding data in OpenAI response');
      }

      const embedding = response.data[0]?.embedding;

      if (!embedding || embedding.length !== 1536) {
        throw new Error(
          `Invalid embedding dimensions: expected 1536, got ${embedding?.length || 0}`
        );
      }

      return embedding;
    }, 'OpenAI embedding generation');
  }

  /**
   * Get the underlying OpenAI client for advanced usage
   */
  getClient(): OpenAI {
    return this.client;
  }
}

// Export a singleton instance
export const openaiClient = new OpenAIClient();

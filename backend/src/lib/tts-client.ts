import OpenAI from 'openai';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

/**
 * TTS client wrapper with retry logic for audio generation
 */
export class TTSClient {
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
          console.warn(
            `${operationName} failed (attempt ${attempt + 1}/${this.maxRetries + 1}). ` +
            `Retrying in ${delay}ms... Error: ${lastError.message}`
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.maxRetries + 1} attempts. ` +
      `Last error: ${lastError?.message}`
    );
  }

  /**
   * Split text into chunks that fit within the character limit
   * Tries to split at sentence boundaries to maintain natural flow
   */
  private splitTextIntoChunks(text: string, maxChars: number = 4000): string[] {
    if (text.length <= maxChars) {
      return [text];
    }

    const chunks: string[] = [];
    // Split by sentences (periods, exclamation marks, question marks followed by space)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed the limit
      if ((currentChunk + sentence).length > maxChars) {
        // If current chunk is not empty, save it
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If a single sentence is too long, split it by words
        if (sentence.length > maxChars) {
          const words = sentence.split(' ');
          for (const word of words) {
            if ((currentChunk + ' ' + word).length > maxChars) {
              if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = word;
              } else {
                // Single word is too long, just add it
                chunks.push(word);
              }
            } else {
              currentChunk += (currentChunk ? ' ' : '') + word;
            }
          }
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Concatenate multiple audio buffers into a single buffer
   */
  private concatenateAudioBuffers(buffers: Buffer[]): Buffer {
    return Buffer.concat(buffers);
  }

  /**
   * Generate audio from script text using OpenAI TTS
   * Automatically splits long scripts into chunks and concatenates the audio
   * Returns Buffer containing MP3 audio data
   * 
   * @param scriptText - The text to convert to speech
   * @param options - Optional configuration for voice and model
   * @returns Buffer containing MP3 audio data
   */
  async generateAudio(
    scriptText: string,
    options?: {
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      model?: 'tts-1' | 'tts-1-hd';
    }
  ): Promise<Buffer> {
    // Split text into chunks if needed
    const chunks = this.splitTextIntoChunks(scriptText, 4000);
    
    if (chunks.length === 1) {
      // Single chunk, process normally
      return this.generateAudioChunk(chunks[0], options);
    }
    
    // Multiple chunks, generate audio for each and concatenate
    console.log(`Splitting script into ${chunks.length} chunks for TTS generation`);
    const audioBuffers: Buffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Generating audio for chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
      const buffer = await this.generateAudioChunk(chunks[i], options);
      audioBuffers.push(buffer);
    }
    
    console.log(`Concatenating ${audioBuffers.length} audio chunks`);
    return this.concatenateAudioBuffers(audioBuffers);
  }

  /**
   * Generate audio for a single chunk of text
   * Internal method used by generateAudio
   */
  private async generateAudioChunk(
    scriptText: string,
    options?: {
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      model?: 'tts-1' | 'tts-1-hd';
    }
  ): Promise<Buffer> {
    return this.withRetry(async () => {
      const response = await this.client.audio.speech.create({
        model: options?.model || 'tts-1',
        voice: options?.voice || 'alloy',
        input: scriptText,
        response_format: 'mp3',
      });

      // Convert response to Buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new Error('Generated audio buffer is empty');
      }

      return buffer;
    }, 'TTS audio generation');
  }

  /**
   * Generate audio and save to file
   * 
   * @param scriptText - The text to convert to speech
   * @param outputPath - Path where the MP3 file should be saved
   * @param options - Optional configuration for voice and model
   * @returns Path to the saved audio file
   */
  async generateAudioToFile(
    scriptText: string,
    outputPath: string,
    options?: {
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      model?: 'tts-1' | 'tts-1-hd';
    }
  ): Promise<string> {
    const audioBuffer = await this.generateAudio(scriptText, options);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write buffer to file
    fs.writeFileSync(outputPath, audioBuffer);

    return outputPath;
  }

  /**
   * Get the underlying OpenAI client for advanced usage
   */
  getClient(): OpenAI {
    return this.client;
  }
}

// Export a singleton instance
export const ttsClient = new TTSClient();

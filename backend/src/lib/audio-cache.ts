import { prisma } from './prisma';
import crypto from 'crypto';

/**
 * Audio cache service for managing cached audio files by script hash
 * Implements caching to avoid regenerating identical audio content
 */
export class AudioCacheService {
  /**
   * Generate SHA-256 hash of script text for caching
   * 
   * @param scriptText - The script text to hash
   * @returns SHA-256 hash as hex string
   */
  generateScriptHash(scriptText: string): string {
    return crypto.createHash('sha256').update(scriptText).digest('hex');
  }

  /**
   * Check if audio exists in cache for given script hash
   * 
   * @param scriptHash - SHA-256 hash of the script text
   * @returns Audio URL if cached, null otherwise
   */
  async getCachedAudio(scriptHash: string): Promise<string | null> {
    try {
      const cached = await prisma.audioCache.findUnique({
        where: { scriptHash },
      });

      return cached?.audioUrl || null;
    } catch (error) {
      console.error('Error retrieving cached audio:', error);
      return null;
    }
  }

  /**
   * Store audio URL in cache with script hash
   * 
   * @param scriptHash - SHA-256 hash of the script text
   * @param audioUrl - Public URL of the generated audio
   * @returns Created cache entry
   */
  async cacheAudio(scriptHash: string, audioUrl: string): Promise<void> {
    try {
      await prisma.audioCache.upsert({
        where: { scriptHash },
        update: { audioUrl },
        create: {
          scriptHash,
          audioUrl,
        },
      });
    } catch (error) {
      console.error('Error caching audio:', error);
      throw error;
    }
  }

  /**
   * Remove audio from cache by script hash
   * 
   * @param scriptHash - SHA-256 hash of the script text
   * @returns True if deletion was successful
   */
  async removeCachedAudio(scriptHash: string): Promise<boolean> {
    try {
      await prisma.audioCache.delete({
        where: { scriptHash },
      });
      return true;
    } catch (error) {
      console.error('Error removing cached audio:', error);
      return false;
    }
  }

  /**
   * Get or generate audio with caching
   * This is a helper method that checks cache first, then generates if needed
   * 
   * @param scriptText - The script text to convert to audio
   * @param generateAudioFn - Function to generate audio if not cached
   * @returns Audio URL (from cache or newly generated)
   */
  async getOrGenerateAudio(
    scriptText: string,
    generateAudioFn: (scriptText: string, scriptHash: string) => Promise<string>
  ): Promise<{ audioUrl: string; fromCache: boolean }> {
    const scriptHash = this.generateScriptHash(scriptText);

    // Check cache first
    const cachedUrl = await this.getCachedAudio(scriptHash);
    if (cachedUrl) {
      console.log(`Using cached audio for script hash: ${scriptHash}`);
      return { audioUrl: cachedUrl, fromCache: true };
    }

    // Generate new audio
    console.log(`Generating new audio for script hash: ${scriptHash}`);
    const audioUrl = await generateAudioFn(scriptText, scriptHash);

    // Cache the result
    await this.cacheAudio(scriptHash, audioUrl);

    return { audioUrl, fromCache: false };
  }

  /**
   * Clear all cached audio entries
   * Use with caution - this will remove all cache entries
   */
  async clearAllCache(): Promise<number> {
    try {
      const result = await prisma.audioCache.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Error clearing audio cache:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const audioCacheService = new AudioCacheService();

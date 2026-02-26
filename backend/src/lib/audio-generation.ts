import { ttsClient, TTSClient } from './tts-client';
import { audioStorage, AudioStorage } from './audio-storage';
import { audioCacheService, AudioCacheService } from './audio-cache';

/**
 * Integrated audio generation service that combines TTS, storage, and caching
 * This is the main service to use for generating episode audio
 */
export class AudioGenerationService {
  constructor(
    private tts: TTSClient = ttsClient,
    private storage: AudioStorage = audioStorage,
    private cache: AudioCacheService = audioCacheService
  ) {}

  /**
   * Generate audio from script text with caching
   * Checks cache first, generates and uploads if not cached
   * 
   * @param scriptText - The script text to convert to audio
   * @param options - Optional TTS configuration
   * @returns Object containing audio URL and whether it was from cache
   */
  async generateEpisodeAudio(
    scriptText: string,
    options?: {
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      model?: 'tts-1' | 'tts-1-hd';
    }
  ): Promise<{ audioUrl: string; fromCache: boolean }> {
    return this.cache.getOrGenerateAudio(scriptText, async (text, scriptHash) => {
      // Generate audio using TTS
      console.log('Generating audio with TTS...');
      const audioBuffer = await this.tts.generateAudio(text, options);

      // Upload to storage
      console.log('Uploading audio to storage...');
      const audioUrl = await this.storage.uploadAudio(audioBuffer, scriptHash);

      return audioUrl;
    });
  }

  /**
   * Calculate estimated audio duration in minutes
   * Based on average speaking rate of ~150 words per minute
   * 
   * @param scriptText - The script text
   * @returns Estimated duration in minutes
   */
  calculateEstimatedDuration(scriptText: string): number {
    const wordCount = scriptText.split(/\s+/).filter((word) => word.length > 0).length;
    const durationMinutes = Math.ceil(wordCount / 150);
    return durationMinutes;
  }

  /**
   * Delete audio file from storage and remove from cache
   * 
   * @param audioUrl - Public URL of the audio file
   * @param scriptText - Original script text (to remove from cache)
   */
  async deleteEpisodeAudio(audioUrl: string, scriptText: string): Promise<void> {
    // Remove from storage
    await this.storage.deleteAudio(audioUrl);

    // Remove from cache
    const scriptHash = this.cache.generateScriptHash(scriptText);
    await this.cache.removeCachedAudio(scriptHash);
  }
}

// Export a singleton instance
export const audioGenerationService = new AudioGenerationService();

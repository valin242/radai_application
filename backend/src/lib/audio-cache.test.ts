import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioCacheService } from './audio-cache';
import { prisma } from './prisma';

describe('AudioCacheService', () => {
  let audioCacheService: AudioCacheService;
  const testScriptText = 'This is a test script for audio generation.';
  const testAudioUrl = 'https://example.com/audio/test-audio.mp3';

  beforeEach(() => {
    audioCacheService = new AudioCacheService();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.audioCache.deleteMany({});
  });

  describe('generateScriptHash', () => {
    it('should generate consistent SHA-256 hash for same input', () => {
      const hash1 = audioCacheService.generateScriptHash(testScriptText);
      const hash2 = audioCacheService.generateScriptHash(testScriptText);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = audioCacheService.generateScriptHash('Script 1');
      const hash2 = audioCacheService.generateScriptHash('Script 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate valid hex string', () => {
      const hash = audioCacheService.generateScriptHash(testScriptText);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('cacheAudio', () => {
    it('should store audio URL with script hash', async () => {
      const scriptHash = audioCacheService.generateScriptHash(testScriptText);

      await audioCacheService.cacheAudio(scriptHash, testAudioUrl);

      const cached = await prisma.audioCache.findUnique({
        where: { scriptHash },
      });

      expect(cached).not.toBeNull();
      expect(cached?.scriptHash).toBe(scriptHash);
      expect(cached?.audioUrl).toBe(testAudioUrl);
    });

    it('should update existing cache entry on duplicate hash', async () => {
      const scriptHash = audioCacheService.generateScriptHash(testScriptText);
      const newAudioUrl = 'https://example.com/audio/updated-audio.mp3';

      // Create initial cache entry
      await audioCacheService.cacheAudio(scriptHash, testAudioUrl);

      // Update with new URL
      await audioCacheService.cacheAudio(scriptHash, newAudioUrl);

      const cached = await prisma.audioCache.findUnique({
        where: { scriptHash },
      });

      expect(cached?.audioUrl).toBe(newAudioUrl);

      // Verify only one entry exists
      const allCached = await prisma.audioCache.findMany({
        where: { scriptHash },
      });
      expect(allCached).toHaveLength(1);
    });
  });

  describe('getCachedAudio', () => {
    it('should return audio URL if cached', async () => {
      const scriptHash = audioCacheService.generateScriptHash(testScriptText);

      await audioCacheService.cacheAudio(scriptHash, testAudioUrl);

      const result = await audioCacheService.getCachedAudio(scriptHash);

      expect(result).toBe(testAudioUrl);
    });

    it('should return null if not cached', async () => {
      const scriptHash = audioCacheService.generateScriptHash('Non-existent script');

      const result = await audioCacheService.getCachedAudio(scriptHash);

      expect(result).toBeNull();
    });
  });

  describe('removeCachedAudio', () => {
    it('should remove cached audio by script hash', async () => {
      const scriptHash = audioCacheService.generateScriptHash(testScriptText);

      await audioCacheService.cacheAudio(scriptHash, testAudioUrl);

      const removed = await audioCacheService.removeCachedAudio(scriptHash);

      expect(removed).toBe(true);

      const cached = await prisma.audioCache.findUnique({
        where: { scriptHash },
      });

      expect(cached).toBeNull();
    });

    it('should return false if cache entry does not exist', async () => {
      const scriptHash = audioCacheService.generateScriptHash('Non-existent script');

      const removed = await audioCacheService.removeCachedAudio(scriptHash);

      expect(removed).toBe(false);
    });
  });

  describe('getOrGenerateAudio', () => {
    it('should return cached audio if available', async () => {
      const scriptHash = audioCacheService.generateScriptHash(testScriptText);

      // Pre-cache audio
      await audioCacheService.cacheAudio(scriptHash, testAudioUrl);

      let generateCalled = false;
      const generateFn = async () => {
        generateCalled = true;
        return 'https://example.com/audio/new-audio.mp3';
      };

      const result = await audioCacheService.getOrGenerateAudio(testScriptText, generateFn);

      expect(result.audioUrl).toBe(testAudioUrl);
      expect(result.fromCache).toBe(true);
      expect(generateCalled).toBe(false);
    });

    it('should generate and cache audio if not cached', async () => {
      const newAudioUrl = 'https://example.com/audio/generated-audio.mp3';

      let generateCalled = false;
      const generateFn = async (scriptText: string, scriptHash: string) => {
        generateCalled = true;
        expect(scriptText).toBe(testScriptText);
        expect(scriptHash).toBe(audioCacheService.generateScriptHash(testScriptText));
        return newAudioUrl;
      };

      const result = await audioCacheService.getOrGenerateAudio(testScriptText, generateFn);

      expect(result.audioUrl).toBe(newAudioUrl);
      expect(result.fromCache).toBe(false);
      expect(generateCalled).toBe(true);

      // Verify it was cached
      const scriptHash = audioCacheService.generateScriptHash(testScriptText);
      const cached = await audioCacheService.getCachedAudio(scriptHash);
      expect(cached).toBe(newAudioUrl);
    });

    it('should cache newly generated audio for future use', async () => {
      const newAudioUrl = 'https://example.com/audio/generated-audio.mp3';

      const generateFn = async () => newAudioUrl;

      // First call - should generate
      const result1 = await audioCacheService.getOrGenerateAudio(testScriptText, generateFn);
      expect(result1.fromCache).toBe(false);

      // Second call - should use cache
      const result2 = await audioCacheService.getOrGenerateAudio(testScriptText, generateFn);
      expect(result2.fromCache).toBe(true);
      expect(result2.audioUrl).toBe(newAudioUrl);
    });
  });

  describe('clearAllCache', () => {
    it('should remove all cached audio entries', async () => {
      // Create multiple cache entries
      await audioCacheService.cacheAudio('hash1', 'url1');
      await audioCacheService.cacheAudio('hash2', 'url2');
      await audioCacheService.cacheAudio('hash3', 'url3');

      const count = await audioCacheService.clearAllCache();

      expect(count).toBe(3);

      const remaining = await prisma.audioCache.findMany({});
      expect(remaining).toHaveLength(0);
    });

    it('should return 0 if no cache entries exist', async () => {
      const count = await audioCacheService.clearAllCache();

      expect(count).toBe(0);
    });
  });
});

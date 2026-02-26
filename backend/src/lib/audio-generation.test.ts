import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioGenerationService } from './audio-generation';
import { TTSClient } from './tts-client';
import { AudioStorage } from './audio-storage';
import { AudioCacheService } from './audio-cache';

describe('AudioGenerationService', () => {
  let audioGenerationService: AudioGenerationService;
  let mockTTS: TTSClient;
  let mockStorage: AudioStorage;
  let mockCache: AudioCacheService;

  beforeEach(() => {
    mockTTS = new TTSClient('test-key');
    mockStorage = new AudioStorage('test-bucket');
    mockCache = new AudioCacheService();

    audioGenerationService = new AudioGenerationService(mockTTS, mockStorage, mockCache);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEpisodeAudio', () => {
    it('should generate and upload audio if not cached', async () => {
      const scriptText = 'This is a test script for audio generation.';
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const mockAudioUrl = 'https://example.com/audio/test-audio.mp3';

      // Mock cache miss
      vi.spyOn(mockCache, 'getCachedAudio').mockResolvedValue(null);

      // Mock TTS generation
      vi.spyOn(mockTTS, 'generateAudio').mockResolvedValue(mockAudioBuffer);

      // Mock storage upload
      vi.spyOn(mockStorage, 'uploadAudio').mockResolvedValue(mockAudioUrl);

      // Mock cache storage
      vi.spyOn(mockCache, 'cacheAudio').mockResolvedValue();

      const result = await audioGenerationService.generateEpisodeAudio(scriptText);

      expect(result.audioUrl).toBe(mockAudioUrl);
      expect(result.fromCache).toBe(false);
      expect(mockTTS.generateAudio).toHaveBeenCalledWith(scriptText, undefined);
      expect(mockStorage.uploadAudio).toHaveBeenCalled();
      expect(mockCache.cacheAudio).toHaveBeenCalled();
    });

    it('should return cached audio if available', async () => {
      const scriptText = 'This is a test script for audio generation.';
      const cachedAudioUrl = 'https://example.com/audio/cached-audio.mp3';

      // Mock cache hit
      vi.spyOn(mockCache, 'getCachedAudio').mockResolvedValue(cachedAudioUrl);

      // Mock TTS generation (should not be called)
      const generateAudioSpy = vi.spyOn(mockTTS, 'generateAudio');

      // Mock storage upload (should not be called)
      const uploadAudioSpy = vi.spyOn(mockStorage, 'uploadAudio');

      const result = await audioGenerationService.generateEpisodeAudio(scriptText);

      expect(result.audioUrl).toBe(cachedAudioUrl);
      expect(result.fromCache).toBe(true);
      expect(generateAudioSpy).not.toHaveBeenCalled();
      expect(uploadAudioSpy).not.toHaveBeenCalled();
    });

    it('should pass TTS options to generateAudio', async () => {
      const scriptText = 'This is a test script.';
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const mockAudioUrl = 'https://example.com/audio/test-audio.mp3';

      vi.spyOn(mockCache, 'getCachedAudio').mockResolvedValue(null);
      vi.spyOn(mockTTS, 'generateAudio').mockResolvedValue(mockAudioBuffer);
      vi.spyOn(mockStorage, 'uploadAudio').mockResolvedValue(mockAudioUrl);
      vi.spyOn(mockCache, 'cacheAudio').mockResolvedValue();

      const options = { voice: 'nova' as const, model: 'tts-1-hd' as const };
      await audioGenerationService.generateEpisodeAudio(scriptText, options);

      expect(mockTTS.generateAudio).toHaveBeenCalledWith(scriptText, options);
    });
  });

  describe('calculateEstimatedDuration', () => {
    it('should calculate duration based on word count', () => {
      // 150 words should be ~1 minute
      const script150Words = Array(150).fill('word').join(' ');
      const duration1 = audioGenerationService.calculateEstimatedDuration(script150Words);
      expect(duration1).toBe(1);

      // 300 words should be ~2 minutes
      const script300Words = Array(300).fill('word').join(' ');
      const duration2 = audioGenerationService.calculateEstimatedDuration(script300Words);
      expect(duration2).toBe(2);

      // 450 words should be ~3 minutes
      const script450Words = Array(450).fill('word').join(' ');
      const duration3 = audioGenerationService.calculateEstimatedDuration(script450Words);
      expect(duration3).toBe(3);
    });

    it('should round up partial minutes', () => {
      // 151 words should round up to 2 minutes
      const script151Words = Array(151).fill('word').join(' ');
      const duration = audioGenerationService.calculateEstimatedDuration(script151Words);
      expect(duration).toBe(2);
    });

    it('should handle empty script', () => {
      const duration = audioGenerationService.calculateEstimatedDuration('');
      expect(duration).toBe(0);
    });

    it('should handle script with multiple spaces', () => {
      const script = 'word1    word2     word3';
      const duration = audioGenerationService.calculateEstimatedDuration(script);
      expect(duration).toBe(1); // 3 words, rounds up to 1 minute
    });
  });

  describe('deleteEpisodeAudio', () => {
    it('should delete audio from storage and cache', async () => {
      const audioUrl = 'https://example.com/audio/test-audio.mp3';
      const scriptText = 'This is a test script.';

      const deleteAudioSpy = vi.spyOn(mockStorage, 'deleteAudio').mockResolvedValue(true);
      const removeCachedAudioSpy = vi
        .spyOn(mockCache, 'removeCachedAudio')
        .mockResolvedValue(true);

      await audioGenerationService.deleteEpisodeAudio(audioUrl, scriptText);

      expect(deleteAudioSpy).toHaveBeenCalledWith(audioUrl);
      expect(removeCachedAudioSpy).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioStorage } from './audio-storage';
import { supabase } from '../config/supabase';

describe('AudioStorage', () => {
  let audioStorage: AudioStorage;
  const testBucketName = 'test-audio-bucket';

  beforeEach(() => {
    audioStorage = new AudioStorage(testBucketName);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default bucket name', () => {
      const storage = new AudioStorage();
      expect(storage).toBeInstanceOf(AudioStorage);
      expect(storage.getBucketName()).toBe('episode-audio');
    });

    it('should create instance with custom bucket name', () => {
      const storage = new AudioStorage('custom-bucket');
      expect(storage.getBucketName()).toBe('custom-bucket');
    });
  });

  describe('uploadAudio', () => {
    it('should upload audio buffer and return public URL', async () => {
      const audioBuffer = Buffer.from('mock-audio-data');
      const scriptHash = 'abc123';
      const mockPublicUrl = 'https://example.com/audio/episodes/abc123-123456.mp3';

      // Mock Supabase storage upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'episodes/abc123-123456.mp3' },
        error: null,
      });

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      const result = await audioStorage.uploadAudio(audioBuffer, scriptHash);

      expect(result).toBe(mockPublicUrl);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('episodes/abc123-'),
        audioBuffer,
        {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
          upsert: false,
        }
      );
    });

    it('should throw error if upload fails', async () => {
      const audioBuffer = Buffer.from('mock-audio-data');
      const scriptHash = 'abc123';

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      await expect(audioStorage.uploadAudio(audioBuffer, scriptHash)).rejects.toThrow(
        'Failed to upload audio: Upload failed'
      );
    });

    it('should throw error if no data returned from upload', async () => {
      const audioBuffer = Buffer.from('mock-audio-data');
      const scriptHash = 'abc123';

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      await expect(audioStorage.uploadAudio(audioBuffer, scriptHash)).rejects.toThrow(
        'No data returned from upload'
      );
    });

    it('should throw error if public URL cannot be retrieved', async () => {
      const audioBuffer = Buffer.from('mock-audio-data');
      const scriptHash = 'abc123';

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'episodes/abc123-123456.mp3' },
        error: null,
      });

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);

      await expect(audioStorage.uploadAudio(audioBuffer, scriptHash)).rejects.toThrow(
        'Failed to get public URL for uploaded audio'
      );
    });
  });

  describe('deleteAudio', () => {
    it('should delete audio file from storage', async () => {
      const audioUrl = `https://example.com/storage/v1/object/public/${testBucketName}/episodes/abc123-123456.mp3`;

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        remove: mockRemove,
      } as any);

      const result = await audioStorage.deleteAudio(audioUrl);

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['episodes/abc123-123456.mp3']);
    });

    it('should throw error if deletion fails', async () => {
      const audioUrl = `https://example.com/storage/v1/object/public/${testBucketName}/episodes/abc123-123456.mp3`;

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' },
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        remove: mockRemove,
      } as any);

      await expect(audioStorage.deleteAudio(audioUrl)).rejects.toThrow(
        'Failed to delete audio: Deletion failed'
      );
    });

    it('should throw error for invalid URL format', async () => {
      const audioUrl = 'https://example.com/invalid-url';

      await expect(audioStorage.deleteAudio(audioUrl)).rejects.toThrow(
        'Invalid audio URL format'
      );
    });
  });

  describe('audioExists', () => {
    it('should return true if audio file exists', async () => {
      const audioUrl = `https://example.com/storage/v1/object/public/${testBucketName}/episodes/abc123-123456.mp3`;

      const mockList = vi.fn().mockResolvedValue({
        data: [{ name: 'abc123-123456.mp3' }],
        error: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        list: mockList,
      } as any);

      const result = await audioStorage.audioExists(audioUrl);

      expect(result).toBe(true);
    });

    it('should return false if audio file does not exist', async () => {
      const audioUrl = `https://example.com/storage/v1/object/public/${testBucketName}/episodes/abc123-123456.mp3`;

      const mockList = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        list: mockList,
      } as any);

      const result = await audioStorage.audioExists(audioUrl);

      expect(result).toBe(false);
    });

    it('should return false if list operation fails', async () => {
      const audioUrl = `https://example.com/storage/v1/object/public/${testBucketName}/episodes/abc123-123456.mp3`;

      const mockList = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'List failed' },
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        list: mockList,
      } as any);

      const result = await audioStorage.audioExists(audioUrl);

      expect(result).toBe(false);
    });

    it('should return false for invalid URL format', async () => {
      const audioUrl = 'https://example.com/invalid-url';

      const result = await audioStorage.audioExists(audioUrl);

      expect(result).toBe(false);
    });
  });
});

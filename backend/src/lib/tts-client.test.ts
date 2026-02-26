import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTSClient } from './tts-client';
import fs from 'fs';
import path from 'path';

describe('TTSClient', () => {
  let ttsClient: TTSClient;
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    // Mock environment variable
    process.env.OPENAI_API_KEY = testApiKey;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with API key from environment', () => {
      const client = new TTSClient();
      expect(client).toBeInstanceOf(TTSClient);
    });

    it('should create instance with provided API key', () => {
      const client = new TTSClient('custom-key');
      expect(client).toBeInstanceOf(TTSClient);
    });

    it('should throw error if no API key is provided', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new TTSClient()).toThrow('OpenAI API key is required');
    });

    it('should accept custom retry options', () => {
      const client = new TTSClient(testApiKey, {
        maxRetries: 5,
        initialDelayMs: 500,
        backoffMultiplier: 3,
        maxDelayMs: 20000,
      });
      expect(client).toBeInstanceOf(TTSClient);
    });
  });

  describe('generateAudio', () => {
    it('should generate audio buffer from script text', async () => {
      const client = new TTSClient(testApiKey);
      const mockBuffer = Buffer.from('mock-audio-data');

      // Mock the OpenAI client
      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: async () => mockBuffer.buffer,
      });

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      const result = await client.generateAudio('Test script text');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'tts-1',
        voice: 'alloy',
        input: 'Test script text',
        response_format: 'mp3',
      });
    });

    it('should use custom voice and model options', async () => {
      const client = new TTSClient(testApiKey);
      const mockBuffer = Buffer.from('mock-audio-data');

      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: async () => mockBuffer.buffer,
      });

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      await client.generateAudio('Test script', {
        voice: 'nova',
        model: 'tts-1-hd',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'tts-1-hd',
        voice: 'nova',
        input: 'Test script',
        response_format: 'mp3',
      });
    });

    it('should throw error if generated buffer is empty', async () => {
      const client = new TTSClient(testApiKey);
      const emptyBuffer = Buffer.from([]);

      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: async () => emptyBuffer.buffer,
      });

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      await expect(client.generateAudio('Test script')).rejects.toThrow(
        'TTS audio generation failed after 4 attempts'
      );
    }, 10000); // Increase timeout for retry delays

    it('should retry on failure up to 3 times', async () => {
      const client = new TTSClient(testApiKey);
      const mockBuffer = Buffer.from('mock-audio-data');

      let attemptCount = 0;
      const mockCreate = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('API error');
        }
        return {
          arrayBuffer: async () => mockBuffer.buffer,
        };
      });

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      const result = await client.generateAudio('Test script');

      expect(result).toBeInstanceOf(Buffer);
      expect(attemptCount).toBe(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const client = new TTSClient(testApiKey, { maxRetries: 2 });

      const mockCreate = vi.fn().mockRejectedValue(new Error('API error'));

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      await expect(client.generateAudio('Test script')).rejects.toThrow(
        'TTS audio generation failed after 3 attempts'
      );

      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateAudioToFile', () => {
    const testOutputPath = path.join(__dirname, '../../test-output/test-audio.mp3');

    afterEach(() => {
      // Clean up test file
      if (fs.existsSync(testOutputPath)) {
        fs.unlinkSync(testOutputPath);
      }
      const testDir = path.dirname(testOutputPath);
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir, { recursive: true });
      }
    });

    it('should generate audio and save to file', async () => {
      const client = new TTSClient(testApiKey);
      const mockBuffer = Buffer.from('mock-audio-data');

      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: async () => mockBuffer.buffer,
      });

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      const result = await client.generateAudioToFile('Test script', testOutputPath);

      expect(result).toBe(testOutputPath);
      expect(fs.existsSync(testOutputPath)).toBe(true);

      const savedContent = fs.readFileSync(testOutputPath);
      expect(savedContent.length).toBeGreaterThan(0);
    });

    it('should create directory if it does not exist', async () => {
      const client = new TTSClient(testApiKey);
      const mockBuffer = Buffer.from('mock-audio-data');

      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: async () => mockBuffer.buffer,
      });

      vi.spyOn(client.getClient().audio.speech, 'create').mockImplementation(mockCreate);

      const nestedPath = path.join(__dirname, '../../test-output/nested/dir/audio.mp3');
      
      await client.generateAudioToFile('Test script', nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);

      // Clean up
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath), { recursive: true });
    });
  });
});

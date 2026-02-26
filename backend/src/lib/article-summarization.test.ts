import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeArticle, generateContentExcerpt } from './article-summarization';
import * as openaiClientModule from './openai-client';

// Mock the openai-client module
vi.mock('./openai-client', () => ({
  openaiClient: {
    summarizeArticle: vi.fn(),
  },
}));

describe('article-summarization', () => {
  describe('generateContentExcerpt', () => {
    it('should return empty string for empty content', () => {
      expect(generateContentExcerpt('')).toBe('');
      expect(generateContentExcerpt('   ')).toBe('');
    });

    it('should return full content if shorter than maxLength', () => {
      const content = 'This is a short article.';
      expect(generateContentExcerpt(content, 100)).toBe(content);
    });

    it('should truncate at sentence boundary', () => {
      const content = 'First sentence. Second sentence. Third sentence.';
      const result = generateContentExcerpt(content, 30);
      expect(result).toBe('First sentence.');
    });

    it('should handle multiple sentence endings', () => {
      const content = 'Question? Answer! Statement.';
      const result = generateContentExcerpt(content, 20);
      // Should find the last sentence ending within maxLength (20 chars)
      // 'Question? Answer!' is 18 chars, so it fits
      expect(result).toBe('Question? Answer!');
    });

    it('should truncate at word boundary if no sentence end found', () => {
      const content = 'This is a very long content without any sentence endings';
      const result = generateContentExcerpt(content, 20);
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    it('should use default maxLength of 200', () => {
      const content = 'a'.repeat(300);
      const result = generateContentExcerpt(content);
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(203);
    });
  });

  describe('summarizeArticle', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return summary from OpenAI on success', async () => {
      const mockSummary = 'This is a generated summary.';
      vi.mocked(openaiClientModule.openaiClient.summarizeArticle).mockResolvedValueOnce(
        mockSummary
      );

      const result = await summarizeArticle(
        'Test Article',
        'This is the article content with lots of details...'
      );

      expect(result).toBe(mockSummary);
      expect(openaiClientModule.openaiClient.summarizeArticle).toHaveBeenCalledWith(
        'Test Article',
        'This is the article content with lots of details...',
        { maxTokens: undefined }
      );
    });

    it('should pass custom maxTokens to OpenAI', async () => {
      vi.mocked(openaiClientModule.openaiClient.summarizeArticle).mockResolvedValueOnce(
        'Summary'
      );

      await summarizeArticle('Title', 'Content', { maxTokens: 200 });

      expect(openaiClientModule.openaiClient.summarizeArticle).toHaveBeenCalledWith(
        'Title',
        'Content',
        { maxTokens: 200 }
      );
    });

    it('should fallback to content excerpt on OpenAI failure', async () => {
      vi.mocked(openaiClientModule.openaiClient.summarizeArticle).mockRejectedValueOnce(
        new Error('API Error')
      );

      const content = 'This is the article content. It has multiple sentences.';
      const result = await summarizeArticle('Test Article', content);

      expect(result).toBe(content); // Content is shorter than default excerpt length
      expect(openaiClientModule.openaiClient.summarizeArticle).toHaveBeenCalled();
    });

    it('should use custom excerptLength in fallback', async () => {
      vi.mocked(openaiClientModule.openaiClient.summarizeArticle).mockRejectedValueOnce(
        new Error('API Error')
      );

      const content = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = await summarizeArticle('Test Article', content, {
        excerptLength: 20,
      });

      expect(result).toBe('First sentence.');
    });

    it('should log error when summarization fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(openaiClientModule.openaiClient.summarizeArticle).mockRejectedValueOnce(
        new Error('API Error')
      );

      await summarizeArticle('Test Article', 'Content');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to summarize article "Test Article"')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using content excerpt as fallback')
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(openaiClientModule.openaiClient.summarizeArticle).mockRejectedValueOnce(
        'String error'
      );

      const result = await summarizeArticle('Test', 'Content');

      expect(result).toBe('Content');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error')
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

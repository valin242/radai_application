import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateArticleEmbedding, generateArticleEmbeddingsBatch } from './article-embedding';
import { openaiClient } from './openai-client';

vi.mock('./openai-client', () => ({
  openaiClient: {
    generateEmbedding: vi.fn(),
  },
}));

describe('article-embedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateArticleEmbedding', () => {
    it('should generate 1536-dimension embedding for article summary', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      vi.mocked(openaiClient.generateEmbedding).mockResolvedValue(mockEmbedding);

      const summary = 'This is a test article summary about technology news.';
      const embedding = await generateArticleEmbedding(summary);

      expect(embedding).toEqual(mockEmbedding);
      expect(embedding).toHaveLength(1536);
      expect(openaiClient.generateEmbedding).toHaveBeenCalledWith(summary);
    });

    it('should handle API failures gracefully', async () => {
      vi.mocked(openaiClient.generateEmbedding).mockRejectedValue(
        new Error('OpenAI API error')
      );

      const summary = 'Test summary';

      await expect(generateArticleEmbedding(summary)).rejects.toThrow(
        'Failed to generate embedding'
      );
    });

    it('should log errors when embedding generation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(openaiClient.generateEmbedding).mockRejectedValue(
        new Error('API timeout')
      );

      await expect(generateArticleEmbedding('test')).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('generateArticleEmbeddingsBatch', () => {
    it('should generate embeddings for multiple summaries', async () => {
      const mockEmbedding1 = new Array(1536).fill(0.1);
      const mockEmbedding2 = new Array(1536).fill(0.2);

      vi.mocked(openaiClient.generateEmbedding)
        .mockResolvedValueOnce(mockEmbedding1)
        .mockResolvedValueOnce(mockEmbedding2);

      const summaries = [
        { id: 'article-1', summary: 'First article summary' },
        { id: 'article-2', summary: 'Second article summary' },
      ];

      const results = await generateArticleEmbeddingsBatch(summaries);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'article-1',
        success: true,
        embedding: mockEmbedding1,
      });
      expect(results[1]).toEqual({
        id: 'article-2',
        success: true,
        embedding: mockEmbedding2,
      });
    });

    it('should handle partial failures in batch processing', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);

      vi.mocked(openaiClient.generateEmbedding)
        .mockResolvedValueOnce(mockEmbedding)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(mockEmbedding);

      const summaries = [
        { id: 'article-1', summary: 'First summary' },
        { id: 'article-2', summary: 'Second summary' },
        { id: 'article-3', summary: 'Third summary' },
      ];

      const results = await generateArticleEmbeddingsBatch(summaries);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
      expect(results[2].success).toBe(true);
    });

    it('should continue processing after individual failures', async () => {
      vi.mocked(openaiClient.generateEmbedding)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      const summaries = [
        { id: 'article-1', summary: 'First summary' },
        { id: 'article-2', summary: 'Second summary' },
      ];

      const results = await generateArticleEmbeddingsBatch(summaries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
    });
  });
});

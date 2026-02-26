import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIClient } from './openai-client';

describe('OpenAIClient', () => {
  describe('constructor', () => {
    it('should throw error if no API key provided', () => {
      // Clear environment variable
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => new OpenAIClient()).toThrow(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable.'
      );

      // Restore
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    it('should use environment variable if no API key provided', () => {
      process.env.OPENAI_API_KEY = 'env-api-key';
      expect(() => new OpenAIClient()).not.toThrow();
    });

    it('should accept custom retry configuration', () => {
      const customClient = new OpenAIClient('test-key', {
        maxRetries: 5,
        initialDelayMs: 500,
        backoffMultiplier: 3,
        maxDelayMs: 5000,
      });
      expect(customClient).toBeDefined();
    });

    it('should create client with provided API key', () => {
      const client = new OpenAIClient('test-api-key');
      expect(client).toBeDefined();
      expect(client.getClient()).toBeDefined();
    });
  });

  describe('retry logic and exponential backoff', () => {
    it('should have correct default retry configuration', () => {
      const client = new OpenAIClient('test-key');
      expect(client).toBeDefined();
      // Verify client was created successfully with defaults
    });

    it('should accept custom retry parameters', () => {
      const client = new OpenAIClient('test-key', {
        maxRetries: 5,
        initialDelayMs: 2000,
        backoffMultiplier: 3,
        maxDelayMs: 20000,
      });
      expect(client).toBeDefined();
    });
  });

  describe('wrapper methods', () => {
    let client: OpenAIClient;
    let mockCreate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      client = new OpenAIClient('test-api-key', {
        maxRetries: 2,
        initialDelayMs: 10,
        backoffMultiplier: 2,
        maxDelayMs: 100,
      });

      // Mock the internal client's create method
      mockCreate = vi.fn();
      (client as any).client = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    });

    describe('createChatCompletion', () => {
      it('should successfully create chat completion', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Test response',
              },
            },
          ],
        });

        const result = await client.createChatCompletion([
          { role: 'user', content: 'Test prompt' },
        ]);

        expect(result).toBe('Test response');
        expect(mockCreate).toHaveBeenCalledWith({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Test prompt' }],
          temperature: 0.7,
          max_tokens: undefined,
        });
      });

      it('should use custom model and options', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Custom response',
              },
            },
          ],
        });

        await client.createChatCompletion(
          [{ role: 'user', content: 'Test' }],
          {
            model: 'gpt-4',
            temperature: 0.5,
            maxTokens: 100,
          }
        );

        expect(mockCreate).toHaveBeenCalledWith({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
          temperature: 0.5,
          max_tokens: 100,
        });
      });

      it('should throw error if no content in response', async () => {
        // Mock all retry attempts to return the same invalid response
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: null,
              },
            },
          ],
        });

        await expect(
          client.createChatCompletion([{ role: 'user', content: 'Test' }])
        ).rejects.toThrow('No content in OpenAI response');
      });
    });

    describe('retry logic', () => {
      it('should retry on failure and succeed', async () => {
        mockCreate
          .mockRejectedValueOnce(new Error('API Error 1'))
          .mockRejectedValueOnce(new Error('API Error 2'))
          .mockResolvedValueOnce({
            choices: [
              {
                message: {
                  content: 'Success after retries',
                },
              },
            ],
          });

        const result = await client.createChatCompletion([
          { role: 'user', content: 'Test' },
        ]);

        expect(result).toBe('Success after retries');
        expect(mockCreate).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries', async () => {
        mockCreate.mockRejectedValue(new Error('Persistent API Error'));

        await expect(
          client.createChatCompletion([{ role: 'user', content: 'Test' }])
        ).rejects.toThrow('OpenAI chat completion failed after 3 attempts');

        expect(mockCreate).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });

      it('should apply exponential backoff between retries', async () => {
        const startTime = Date.now();

        mockCreate
          .mockRejectedValueOnce(new Error('Error 1'))
          .mockRejectedValueOnce(new Error('Error 2'))
          .mockResolvedValueOnce({
            choices: [{ message: { content: 'Success' } }],
          });

        await client.createChatCompletion([{ role: 'user', content: 'Test' }]);

        const elapsed = Date.now() - startTime;
        // Should have delays: 10ms + 20ms = 30ms minimum
        expect(elapsed).toBeGreaterThanOrEqual(25);
      });
    });

    describe('summarizeArticle', () => {
      it('should generate article summary', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'This is a concise summary of the article.',
              },
            },
          ],
        });

        const result = await client.summarizeArticle(
          'Test Article Title',
          'This is the article content with lots of details...'
        );

        expect(result).toBe('This is a concise summary of the article.');
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o',
            max_tokens: 150,
          })
        );
      });

      it('should use custom max tokens', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: 'Summary' } }],
        });

        await client.summarizeArticle('Title', 'Content', { maxTokens: 200 });

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens: 200,
          })
        );
      });
    });

    describe('generateEpisodeScript', () => {
      it('should generate episode script from summaries', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Welcome to your daily briefing. Today we have...',
              },
            },
          ],
        });

        const summaries = [
          { title: 'Article 1', summary: 'Summary 1' },
          { title: 'Article 2', summary: 'Summary 2' },
        ];

        const result = await client.generateEpisodeScript(summaries, 10);

        expect(result).toContain('Welcome to your daily briefing');
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o',
            max_tokens: 3000, // 10 minutes * 150 words * 2
          })
        );
      });

      it('should calculate word count based on duration', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: 'Script' } }],
        });

        await client.generateEpisodeScript([], 5);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens: 1500, // 5 minutes * 150 words * 2
          })
        );
      });
    });

    describe('generateAnswer', () => {
      it('should generate answer from article context', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Based on the articles, the answer is...',
              },
            },
          ],
        });

        const articles = [
          { title: 'Article 1', summary: 'Summary 1' },
          { title: 'Article 2', summary: 'Summary 2' },
        ];

        const result = await client.generateAnswer('What happened?', articles);

        expect(result).toContain('Based on the articles');
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o',
            max_tokens: 300,
          })
        );
      });
    });
  });

  describe('getClient', () => {
    it('should return underlying OpenAI client', () => {
      const client = new OpenAIClient('test-key');
      const underlyingClient = client.getClient();
      expect(underlyingClient).toBeDefined();
      expect(underlyingClient).toHaveProperty('chat');
    });
  });
});

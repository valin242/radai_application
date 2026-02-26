import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';

/**
 * Audio file serving routes
 * Serves locally stored audio files
 */
export async function audioRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const audioDir = path.join(process.cwd(), 'audio-files');

  /**
   * GET /audio/:filename
   * Serve audio file
   */
  fastify.get<{ Params: { filename: string } }>(
    '/:filename',
    async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
      const { filename } = request.params;
      const filePath = path.join(audioDir, filename);

      // Security: prevent directory traversal
      if (!filePath.startsWith(audioDir)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'Audio file not found' });
      }

      // Stream the file
      const stream = fs.createReadStream(filePath);
      reply.type('audio/mpeg');
      return reply.send(stream);
    }
  );
}

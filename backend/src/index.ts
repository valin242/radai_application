import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { healthRoutes } from './routes/health';
import { protectedExampleRoutes } from './routes/protected-example';
import { authRoutes } from './routes/auth';
import { feedRoutes } from './routes/feeds';
import { episodeRoutes } from './routes/episodes';
import { audioRoutes } from './routes/audio';
import { onboardingRoutes } from './routes/onboarding';
import { preferencesRoutes } from './routes/preferences';
import { statisticsRoutes } from './routes/statistics';
import { errorSanitizerHandler } from './middleware/error-sanitizer';
import { closeWorkers } from './jobs/workers';
import { closeQueues } from './jobs/queue';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function start(): Promise<void> {
  try {
    // Register CORS
    await server.register(cors, {
      origin: true,
    });

    // Register error handler
    server.setErrorHandler(errorSanitizerHandler);

    // Register routes
    await server.register(healthRoutes, { prefix: '/health' });
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(feedRoutes, { prefix: '/feeds' });
    await server.register(episodeRoutes, { prefix: '/episodes' });
    await server.register(audioRoutes, { prefix: '/audio' });
    await server.register(onboardingRoutes, { prefix: '/onboarding' });
    await server.register(preferencesRoutes, { prefix: '/preferences' });
    await server.register(statisticsRoutes, { prefix: '/statistics' });
    await server.register(protectedExampleRoutes, { prefix: '/api' });

    // Start background workers
    console.log('Starting background workers...');
    // Workers are automatically started when imported
    await import('./jobs/workers');
    console.log('Background workers started');

    // Start server
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, closing server...`);
    void Promise.all([
      server.close(),
      closeWorkers(),
      closeQueues(),
    ]).then(() => {
      process.exit(0);
    });
  });
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

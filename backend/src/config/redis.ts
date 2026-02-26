import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

// Create Redis connection options
export const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
};

// Create Redis client instance
export const createRedisConnection = (): Redis => {
  const redis = new Redis(redisOptions);

  redis.on('connect', () => {
    console.log('Redis client connected');
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('ready', () => {
    console.log('Redis client ready');
  });

  return redis;
};

// Export a singleton Redis instance for general use
export const redis = createRedisConnection();

import { Configuration } from 'src/shared/types';
import * as dotenv from 'dotenv';
import { optionalInt, required } from 'src/shared/utils/helper';

dotenv.config();

export default (): Configuration => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: optionalInt('PORT', 8080),
  redis: required('REDIS_URL'),
  corsOrigin: required('CORS_ORIGIN'),
  enableSwagger: process.env.ENABLE_SWAGGER === 'true',
  auth: {
    accessTokenSecret: required('ACCESS_TOKEN_SECRET'),
    refreshTokenSecret: required('REFRESH_TOKEN_SECRET'),
    accessTokenTtl: optionalInt('ACCESS_TOKEN_TTL', 900000),
    refreshTokenTtl: optionalInt('REFRESH_TOKEN_TTL', 604800000),
  },
  database: {
    url: required('DATABASE_URL'),
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'groq',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
    model: process.env.AI_MODEL || 'llama-3.1-8b-instant',
    requestTimeout: optionalInt('AI_REQUEST_TIMEOUT', 120000),
  },
  assistantQueue: {
    rateLimitMax: optionalInt('ASSISTANT_RATE_LIMIT_MAX', 25),
    rateLimitDuration: optionalInt('ASSISTANT_RATE_LIMIT_DURATION', 60000),
    scaleCheckInterval: optionalInt('ASSISTANT_SCALE_CHECK_INTERVAL', 15000),
    scaleDepthThreshold: optionalInt('ASSISTANT_SCALE_DEPTH_THRESHOLD', 20),
    scaleWaitThreshold: optionalInt('ASSISTANT_SCALE_WAIT_THRESHOLD', 5000),
  },
});

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
});

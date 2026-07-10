import { Configuration } from 'src/shared/types';
import * as dotenv from 'dotenv';

dotenv.config();

export default (): Configuration => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  redis: process.env.REDIS_URL,
  auth: {
    accessTokenSecret:
      process.env.ACCESS_TOKEN_SECRET || 'querybase-access-secret',
    refreshTokenSecret:
      process.env.REFRESH_TOKEN_SECRET || 'querybase-refresh-secret',
    accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL, 10) || 900000,
    refreshTokenTtl: parseInt(process.env.REFRESH_TOKEN_TTL, 10) || 604800000,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
});

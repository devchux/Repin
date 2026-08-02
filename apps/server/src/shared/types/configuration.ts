export type Configuration = {
  nodeEnv: string;
  port: number;
  redis: string;
  corsOrigin: string;
  enableSwagger: boolean;
  auth: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenTtl: number;
    refreshTokenTtl: number;
  };
  database: {
    url: string;
  };
  ai: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    model: string;
  };
};

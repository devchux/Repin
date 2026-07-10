export type Configuration = {
  port: number;
  redis: string;
  auth: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenTtl: number;
    refreshTokenTtl: number;
  };
  database: {
    url: string;
  };
};

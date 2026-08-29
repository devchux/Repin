export type Configuration = {
  nodeEnv: string;
  port: number;
  redis: string;
  corsOrigin: string;
  enableSwagger: boolean;
  telemetry: {
    serviceName: string;
    enabled: boolean;
    metricExportInterval: number;
  };
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
    requestTimeout: number;
  };
  assistantQueue: {
    rateLimitMax: number;
    rateLimitDuration: number;
    scaleCheckInterval: number;
    scaleDepthThreshold: number;
    scaleWaitThreshold: number;
    shortRunTimeout: number;
    longRunTimeout: number;
  };
};

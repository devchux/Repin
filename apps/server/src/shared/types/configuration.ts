export type Configuration = {
  nodeEnv: string;
  port: number;
  requestTimeout: number;
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
    extensionClientIds: string[];
    accessTokenTtl: number;
    extensionAuthorizationCodeTtl: number;
    extensionRefreshTokenTtl: number;
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
    embeddingModel: string;
    requestTimeout: number;
  };
  memoryRetrieval: {
    lexicalWeight: number;
    semanticWeight: number;
    exactScopeBoost: number;
    globalScopeBoost: number;
    recencyWeight: number;
    minimumSemanticSimilarity: number;
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

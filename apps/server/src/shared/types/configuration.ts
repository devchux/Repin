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
  email: {
    provider: 'log' | 'resend' | 'smtp' | 'sendgrid';
    fromAddress: string;
    fromName: string;
    resendApiKey: string;
    sendGridApiKey: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      password?: string;
    };
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
  assistantAgent: {
    noProgressThreshold: number;
    budgets: {
      short: { maxToolCalls: number };
      long: { maxToolCalls: number };
      capabilities: Partial<
        Record<
          'summarize' | 'explain' | 'translate' | 'chat',
          { maxToolCalls: number }
        >
      >;
    };
  };
};

import { Configuration } from 'src/shared/types';
import * as dotenv from 'dotenv';
import { optionalInt, optionalNumber, required } from 'src/shared/utils/helper';

dotenv.config();

const optionalToolBudget = (
  key: string,
): { maxToolCalls: number } | undefined =>
  process.env[key] === undefined
    ? undefined
    : { maxToolCalls: optionalInt(key, 0) };

const capabilityToolBudgets = {
  summarize: optionalToolBudget('ASSISTANT_SUMMARIZE_MAX_TOOL_CALLS'),
  explain: optionalToolBudget('ASSISTANT_EXPLAIN_MAX_TOOL_CALLS'),
  translate: optionalToolBudget('ASSISTANT_TRANSLATE_MAX_TOOL_CALLS'),
  chat: optionalToolBudget('ASSISTANT_CHAT_MAX_TOOL_CALLS'),
};

export default (): Configuration => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: optionalInt('PORT', 8080),
  requestTimeout: optionalInt('SERVER_REQUEST_TIMEOUT', 25000),
  redis: required('REDIS_URL'),
  corsOrigin: required('CORS_ORIGIN'),
  enableSwagger: process.env.ENABLE_SWAGGER === 'true',
  telemetry: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'repin-server',
    enabled:
      process.env.OTEL_SDK_DISABLED !== 'true' &&
      (process.env.OTEL_ENABLED === 'true' ||
        Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)),
    metricExportInterval:
      Number(process.env.OTEL_METRIC_EXPORT_INTERVAL) > 0
        ? Number(process.env.OTEL_METRIC_EXPORT_INTERVAL)
        : 60_000,
  },
  auth: {
    accessTokenSecret: required('ACCESS_TOKEN_SECRET'),
    refreshTokenSecret: required('REFRESH_TOKEN_SECRET'),
    extensionClientIds: (process.env.EXTENSION_CLIENT_IDS ?? '')
      .split(',')
      .map((clientId) => clientId.trim())
      .filter(Boolean),
    accessTokenTtl: optionalInt('ACCESS_TOKEN_TTL', 900000),
    extensionAuthorizationCodeTtl: optionalInt(
      'EXTENSION_AUTHORIZATION_CODE_TTL',
      60000,
    ),
    extensionRefreshTokenTtl: optionalInt(
      'EXTENSION_REFRESH_TOKEN_TTL',
      2592000000,
    ),
    refreshTokenTtl: optionalInt('REFRESH_TOKEN_TTL', 604800000),
  },
  email: emailConfiguration(),
  database: {
    url: required('DATABASE_URL'),
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-5-mini',
    embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
    requestTimeout: optionalInt('AI_REQUEST_TIMEOUT', 120000),
  },
  memoryRetrieval: {
    lexicalWeight: optionalNumber('MEMORY_LEXICAL_WEIGHT', 0.4),
    semanticWeight: optionalNumber('MEMORY_SEMANTIC_WEIGHT', 0.5),
    exactScopeBoost: optionalNumber('MEMORY_EXACT_SCOPE_BOOST', 0.07),
    globalScopeBoost: optionalNumber('MEMORY_GLOBAL_SCOPE_BOOST', 0.04),
    recencyWeight: optionalNumber('MEMORY_RECENCY_WEIGHT', 0.03),
    minimumSemanticSimilarity: optionalNumber(
      'MEMORY_MINIMUM_SEMANTIC_SIMILARITY',
      0.55,
      1,
    ),
  },
  assistantQueue: {
    rateLimitMax: optionalInt('ASSISTANT_RATE_LIMIT_MAX', 25),
    rateLimitDuration: optionalInt('ASSISTANT_RATE_LIMIT_DURATION', 60000),
    scaleCheckInterval: optionalInt('ASSISTANT_SCALE_CHECK_INTERVAL', 15000),
    scaleDepthThreshold: optionalInt('ASSISTANT_SCALE_DEPTH_THRESHOLD', 20),
    scaleWaitThreshold: optionalInt('ASSISTANT_SCALE_WAIT_THRESHOLD', 5000),
    shortRunTimeout: optionalInt('ASSISTANT_SHORT_RUN_TIMEOUT', 180000),
    longRunTimeout: optionalInt('ASSISTANT_LONG_RUN_TIMEOUT', 1800000),
  },
  assistantAgent: {
    noProgressThreshold: optionalInt('ASSISTANT_NO_PROGRESS_THRESHOLD', 3),
    budgets: {
      short: {
        maxToolCalls: optionalInt('ASSISTANT_SHORT_MAX_TOOL_CALLS', 24),
      },
      long: {
        maxToolCalls: optionalInt('ASSISTANT_LONG_MAX_TOOL_CALLS', 120),
      },
      capabilities: Object.fromEntries(
        Object.entries(capabilityToolBudgets).filter(([, budget]) => budget),
      ),
    },
  },
});

function emailConfiguration(): Configuration['email'] {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const provider = (process.env.EMAIL_PROVIDER ||
    (nodeEnv === 'production'
      ? ''
      : 'log')) as Configuration['email']['provider'];
  if (!['log', 'resend', 'smtp', 'sendgrid'].includes(provider)) {
    throw new Error(
      'EMAIL_PROVIDER must be one of log, resend, smtp, or sendgrid',
    );
  }
  if (nodeEnv === 'production' && provider === 'log') {
    throw new Error('EMAIL_PROVIDER=log is not allowed in production');
  }

  const fromAddress =
    provider === 'log'
      ? process.env.EMAIL_FROM_ADDRESS || 'dev@repin.local'
      : required('EMAIL_FROM_ADDRESS');
  const resendApiKey = provider === 'resend' ? required('RESEND_API_KEY') : '';
  const sendGridApiKey =
    provider === 'sendgrid' ? required('SENDGRID_API_KEY') : '';
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  if (provider === 'smtp' && Boolean(smtpUser) !== Boolean(smtpPassword)) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together');
  }

  return {
    provider,
    fromAddress,
    fromName: process.env.EMAIL_FROM_NAME || 'Repin',
    resendApiKey,
    sendGridApiKey,
    smtp: {
      host: provider === 'smtp' ? required('SMTP_HOST') : '',
      port: optionalInt('SMTP_PORT', 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: smtpUser,
      password: smtpPassword,
    },
  };
}

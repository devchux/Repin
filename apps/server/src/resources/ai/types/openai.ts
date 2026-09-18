export interface OpenAiCompatibleProviderOptions {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
  requestTimeout: number;
}

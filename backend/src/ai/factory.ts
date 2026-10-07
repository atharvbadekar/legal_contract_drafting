import {
  LLMProvider,
  LLMProviderType,
  GenerateTextOptions,
  GenerateJSONOptions,
  LLMResponse
} from './types.js';
import { OpenAICompatibleProvider } from './providers/openai_compatible.js';
import { OllamaProvider } from './providers/ollama.js';
import { DeterministicMockProvider } from './providers/deterministic_mock.js';
import { llmCache } from './cache.js';
import { globalLLMRateLimiter } from './rate_limiter.js';
import { legalNLPClient } from '../services/nlp/legal_nlp_client.js';

export class LLMManager implements LLMProvider {
  readonly id: LLMProviderType = 'openai_compatible';
  private primaryProvider: LLMProvider;
  private fallbackProvider: LLMProvider;

  constructor() {
    const primaryType = (process.env.LLM_PROVIDER_PRIMARY || 'groq').toLowerCase() as LLMProviderType;
    const fallbackType = (process.env.LLM_PROVIDER_FALLBACK || 'deterministic').toLowerCase() as LLMProviderType;

    this.primaryProvider = this.createProvider(primaryType);
    this.fallbackProvider = this.createProvider(fallbackType);

    console.log(
      `[LLMManager] Initialized with Primary: [${this.primaryProvider.id}: ${this.primaryProvider.modelName}], Fallback: [${this.fallbackProvider.id}: ${this.fallbackProvider.modelName}]`
    );
  }

  get modelName(): string {
    return this.primaryProvider.modelName;
  }

  createProvider(type: LLMProviderType): LLMProvider {
    switch (type) {
      case 'gemini':
        return new OpenAICompatibleProvider({
          id: 'gemini',
          modelName: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
          apiKey: process.env.GEMINI_API_KEY
        });
      case 'groq':
        return new OpenAICompatibleProvider({
          id: 'groq',
          modelName: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY
        });
      case 'openrouter':
        return new OpenAICompatibleProvider({
          id: 'openrouter',
          modelName: process.env.OPENROUTER_MODEL || 'openrouter/free',
          baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          apiKey: process.env.OPENROUTER_API_KEY,
          extraHeaders: {
            'HTTP-Referer': 'https://atharv.legal',
            'X-Title': 'Atharv Legal AI'
          }
        });
      case 'mistral':
        return new OpenAICompatibleProvider({
          id: 'mistral',
          modelName: process.env.MISTRAL_MODEL || 'mistral-small-latest',
          baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
          apiKey: process.env.MISTRAL_API_KEY
        });
      case 'ollama':
        return new OllamaProvider({
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          modelName: process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct'
        });
      case 'deterministic':
      default:
        return new DeterministicMockProvider();
    }
  }

  async isAvailable(): Promise<boolean> {
    const primaryOk = await this.primaryProvider.isAvailable();
    if (primaryOk) return true;
    return await this.fallbackProvider.isAvailable();
  }

  async generateText(options: GenerateTextOptions): Promise<LLMResponse<string>> {
    try {
      if (await this.primaryProvider.isAvailable()) {
        return await this.primaryProvider.generateText(options);
      }
    } catch (err: any) {
      console.warn(
        `[LLMManager] Primary provider (${this.primaryProvider.id}) failed: ${err.message}. Cascading to fallback (${this.fallbackProvider.id})...`
      );
    }

    // Fallback execution
    return await this.fallbackProvider.generateText(options);
  }

  async generateJSON<T>(options: GenerateJSONOptions<T>): Promise<LLMResponse<T>> {
    try {
      if (await this.primaryProvider.isAvailable()) {
        return await this.primaryProvider.generateJSON(options);
      }
    } catch (err: any) {
      console.warn(
        `[LLMManager] Primary provider (${this.primaryProvider.id}) failed: ${err.message}. Cascading to fallback (${this.fallbackProvider.id})...`
      );
    }

    // Fallback execution
    return await this.fallbackProvider.generateJSON(options);
  }

  async embed(texts: string[]): Promise<number[][]> {
    return await legalNLPClient.getEmbeddings(texts);
  }

  async getStatus(): Promise<{
    primary: { id: string; model: string; available: boolean };
    fallback: { id: string; model: string; available: boolean };
    activeModel: string;
    queueLength: number;
    activeRequests: number;
    cacheStats: { hits: number; misses: number; entries: number };
  }> {
    const [primaryOk, fallbackOk] = await Promise.all([
      this.primaryProvider.isAvailable().catch(() => false),
      this.fallbackProvider.isAvailable().catch(() => false)
    ]);

    return {
      primary: {
        id: this.primaryProvider.id,
        model: this.primaryProvider.modelName,
        available: primaryOk
      },
      fallback: {
        id: this.fallbackProvider.id,
        model: this.fallbackProvider.modelName,
        available: fallbackOk
      },
      activeModel: primaryOk ? this.primaryProvider.modelName : this.fallbackProvider.modelName,
      queueLength: globalLLMRateLimiter.queueLength,
      activeRequests: globalLLMRateLimiter.activeRequests,
      cacheStats: llmCache.getStats()
    };
  }
}

export const llmManager = new LLMManager();

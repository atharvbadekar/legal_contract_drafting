import { ZodSchema } from 'zod';

export type LLMProviderType = 'gemini' | 'groq' | 'openrouter' | 'mistral' | 'ollama' | 'openai_compatible' | 'deterministic';

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface GenerateJSONOptions<T> {
  prompt: string;
  systemPrompt?: string;
  schema: ZodSchema<T>;
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  repairPrompt?: string;
}

export interface LLMResponse<T = string> {
  data: T;
  rawText?: string;
  modelUsed: string;
  provider: LLMProviderType;
  cached: boolean;
  latencyMs: number;
}

export interface LLMProvider {
  readonly id: LLMProviderType;
  readonly modelName: string;
  isAvailable(): Promise<boolean>;
  generateText(options: GenerateTextOptions): Promise<LLMResponse<string>>;
  generateJSON<T>(options: GenerateJSONOptions<T>): Promise<LLMResponse<T>>;
  embed(texts: string[]): Promise<number[][]>;
}

export interface SystemEngineStatus {
  name: string;
  status: 'ACTIVE' | 'DEGRADED' | 'FALLBACK_ADAPTER' | 'OFFLINE';
  provider?: string;
  model?: string;
  details?: Record<string, any>;
  latencyMs?: number;
}

export interface CompleteSystemStatus {
  timestamp: string;
  environment: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  engines: {
    deterministicRules: SystemEngineStatus;
    semanticNlp: SystemEngineStatus;
    llm: SystemEngineStatus;
    rag: SystemEngineStatus;
  };
  cacheStats: {
    hits: number;
    misses: number;
    entries: number;
  };
  rateLimitQueueLength: number;
}

import axios from 'axios';
import { BaseLLMProvider } from './base.js';
import { LLMProviderType } from '../types.js';

export interface OllamaConfig {
  baseUrl?: string;
  modelName?: string;
  timeoutMs?: number;
}

export class OllamaProvider extends BaseLLMProvider {
  readonly id: LLMProviderType = 'ollama';
  readonly modelName: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: OllamaConfig = {}) {
    super();
    this.baseUrl = (config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
    this.modelName = config.modelName || process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
    this.timeoutMs = config.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  protected async executePrompt(
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: this.modelName,
      messages,
      stream: false,
      options: {
        temperature: temperature ?? 0.1,
        num_predict: maxTokens ?? 4096
      }
    };

    const res = await axios.post(`${this.baseUrl}/api/chat`, payload, {
      timeout: this.timeoutMs
    });

    const text = res.data?.message?.content;
    if (typeof text !== 'string') {
      throw new Error(`Invalid response format from Ollama (${this.modelName})`);
    }

    return text.trim();
  }
}

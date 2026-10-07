import axios from 'axios';
import { BaseLLMProvider } from './base.js';
import { LLMProviderType } from '../types.js';

export interface OpenAICompatibleConfig {
  id: LLMProviderType;
  modelName: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  extraHeaders?: Record<string, string>;
}

export class OpenAICompatibleProvider extends BaseLLMProvider {
  readonly id: LLMProviderType;
  readonly modelName: string;
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;
  private extraHeaders: Record<string, string>;

  constructor(config: OpenAICompatibleConfig) {
    super();
    this.id = config.id;
    this.modelName = config.modelName;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);
    this.extraHeaders = config.extraHeaders || {};
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey && this.id !== 'ollama') {
      return false;
    }
    try {
      // Lightweight models check or ping
      const res = await axios.get(`${this.baseUrl}/models`, {
        headers: this.buildHeaders(),
        timeout: 3000
      });
      return res.status >= 200 && res.status < 300;
    } catch {
      // Some endpoints disallow GET /models for restricted keys, but allow completions
      return !!this.apiKey;
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
      temperature: temperature ?? 0.1,
      max_tokens: maxTokens ?? 4096
    };

    const endpoint = `${this.baseUrl}/chat/completions`;
    const res = await axios.post(endpoint, payload, {
      headers: this.buildHeaders(),
      timeout: this.timeoutMs
    });

    const choice = res.data?.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== 'string') {
      throw new Error(`Invalid response format from ${this.id} (${this.modelName})`);
    }

    return text.trim();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.extraHeaders
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
}

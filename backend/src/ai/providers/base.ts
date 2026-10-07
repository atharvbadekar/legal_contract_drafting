import { ZodSchema } from 'zod';
import {
  LLMProvider,
  LLMProviderType,
  GenerateTextOptions,
  GenerateJSONOptions,
  LLMResponse
} from '../types.js';
import { llmCache } from '../cache.js';
import { globalLLMRateLimiter, RateLimiterAndQueue } from '../rate_limiter.js';
import { legalNLPClient } from '../../services/nlp/legal_nlp_client.js';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly id: LLMProviderType;
  abstract readonly modelName: string;

  abstract isAvailable(): Promise<boolean>;
  protected abstract executePrompt(
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<string>;

  async generateText(options: GenerateTextOptions): Promise<LLMResponse<string>> {
    const startTime = Date.now();
    const cacheKey = llmCache.generateKey(this.id, {
      model: this.modelName,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      temp: options.temperature
    });

    const cached = llmCache.get<string>(cacheKey);
    if (cached !== null) {
      return {
        data: cached,
        rawText: cached,
        modelUsed: this.modelName,
        provider: this.id,
        cached: true,
        latencyMs: Date.now() - startTime
      };
    }

    const rawText = await globalLLMRateLimiter.enqueue(() =>
      RateLimiterAndQueue.withBackoff(() =>
        this.executePrompt(
          options.prompt,
          options.systemPrompt,
          options.temperature,
          options.maxTokens
        )
      )
    );

    llmCache.set(cacheKey, rawText);

    return {
      data: rawText,
      rawText,
      modelUsed: this.modelName,
      provider: this.id,
      cached: false,
      latencyMs: Date.now() - startTime
    };
  }

  async generateJSON<T>(options: GenerateJSONOptions<T>): Promise<LLMResponse<T>> {
    const startTime = Date.now();
    const schemaInstructions = `\n\nCRITICAL INSTRUCTION: You must respond ONLY with valid JSON conforming to the requested schema. Do not enclose in explanations or conversational text. Output raw JSON or markdown JSON fenced with \`\`\`json.`;
    const enrichedPrompt = `${options.prompt}\n${schemaInstructions}`;

    const cacheKey = llmCache.generateKey(this.id, {
      model: this.modelName,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      schemaName: options.schemaName || 'schema',
      temp: options.temperature
    });

    const cached = llmCache.get<T>(cacheKey);
    if (cached !== null) {
      return {
        data: cached,
        rawText: JSON.stringify(cached),
        modelUsed: this.modelName,
        provider: this.id,
        cached: true,
        latencyMs: Date.now() - startTime
      };
    }

    let rawText = await globalLLMRateLimiter.enqueue(() =>
      RateLimiterAndQueue.withBackoff(() =>
        this.executePrompt(
          enrichedPrompt,
          options.systemPrompt,
          options.temperature ?? 0.1,
          options.maxTokens
        )
      )
    );

    // Attempt parsing
    let parsed: any;
    let parseError: string | null = null;

    try {
      parsed = this.extractJSONFromText(rawText);
      const validated = options.schema.parse(parsed);
      llmCache.set(cacheKey, validated);
      return {
        data: validated,
        rawText,
        modelUsed: this.modelName,
        provider: this.id,
        cached: false,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      parseError = err?.message || 'JSON schema validation failed';
      console.warn(`[BaseLLMProvider] Initial JSON validation failed for ${this.id}: ${parseError}. Executing repair prompt retry...`);
    }

    // Single repair prompt retry
    const repairPrompt =
      options.repairPrompt ||
      `The previous output was invalid JSON or did not match the expected schema:\n${parseError}\n\nPrevious output:\n${rawText}\n\nPlease output ONLY the corrected JSON object.`;

    const repairedText = await globalLLMRateLimiter.enqueue(() =>
      RateLimiterAndQueue.withBackoff(() =>
        this.executePrompt(repairPrompt, options.systemPrompt, 0.0, options.maxTokens)
      )
    );

    try {
      parsed = this.extractJSONFromText(repairedText);
      const validated = options.schema.parse(parsed);
      llmCache.set(cacheKey, validated);
      return {
        data: validated,
        rawText: repairedText,
        modelUsed: this.modelName,
        provider: this.id,
        cached: false,
        latencyMs: Date.now() - startTime
      };
    } catch (finalErr: any) {
      throw new Error(
        `Failed to generate valid structured JSON after repair retry using ${this.id} (${this.modelName}): ${finalErr?.message}`
      );
    }
  }

  protected extractJSONFromText(text: string): any {
    const trimmed = text.trim();
    // 1. Try markdown fenced block
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }

    // 2. Try raw parse
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return JSON.parse(trimmed);
    }

    // 3. Find first { or [ to last } or ]
    const firstBrace = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');
    const startIdx = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);

    const lastBrace = trimmed.lastIndexOf('}');
    const lastBracket = trimmed.lastIndexOf(']');
    const endIdx = Math.max(lastBrace, lastBracket);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const candidate = trimmed.substring(startIdx, endIdx + 1);
      return JSON.parse(candidate);
    }

    throw new Error('No valid JSON block detected in output');
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Standardize dense 384-dimensional embedding to preserve existing pgvector configuration
    return await legalNLPClient.getEmbeddings(texts);
  }
}

import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LLMResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  private defaultTtlMs: number;
  private maxEntries: number;

  constructor(defaultTtlMs: number = 3600 * 1000, maxEntries: number = 500) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  generateKey(namespace: string, payload: any): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHash('sha256')
      .update(`${namespace}:${serialized}`)
      .digest('hex');
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Purge oldest 20% entries
      const keysToDelete = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxEntries * 0.2));
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs)
    });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { hits: number; misses: number; entries: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      entries: this.cache.size
    };
  }
}

export const llmCache = new LLMResponseCache(
  parseInt(process.env.LLM_CACHE_TTL_MS || '3600000', 10),
  500
);

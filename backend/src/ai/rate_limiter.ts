export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
}

export class RateLimiterAndQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get activeRequests(): number {
    return this.activeCount;
  }

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        this.activeCount++;
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.activeCount--;
          this.processNext();
        }
      };

      if (this.activeCount < this.maxConcurrency) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private processNext(): void {
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  static async withBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 2;
    const initialDelay = options.initialDelayMs ?? 800;
    const factor = options.backoffFactor ?? 2;
    const maxDelay = options.maxDelayMs ?? 8000;

    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        const isRateLimit = err?.response?.status === 429 || /rate limit|quota|too many requests/i.test(err?.message || '');
        const isTransientNetwork = err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT' || err?.response?.status >= 500;

        if (attempt > maxRetries || (!isRateLimit && !isTransientNetwork)) {
          throw err;
        }

        const delay = Math.min(
          maxDelay,
          initialDelay * Math.pow(factor, attempt - 1) + Math.random() * 200
        );
        console.warn(`[LLM RateLimiter] Attempt ${attempt} failed (${err?.message || 'Transient error'}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
}

export const globalLLMRateLimiter = new RateLimiterAndQueue(3);

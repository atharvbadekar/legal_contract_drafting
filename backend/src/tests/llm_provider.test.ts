import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { DeterministicMockProvider } from '../ai/providers/deterministic_mock.js';
import { OpenAICompatibleProvider } from '../ai/providers/openai_compatible.js';
import { LLMResponseCache } from '../ai/cache.js';
import { RateLimiterAndQueue } from '../ai/rate_limiter.js';
import { LLMManager } from '../ai/factory.js';
import { systemController } from '../controllers/system.controller.js';

describe('Phase 1 — Provider-Agnostic LLM Layer & System Status Tests', () => {
  it('1. DeterministicMockProvider complies with LLMProvider interface', async () => {
    const provider = new DeterministicMockProvider();
    const available = await provider.isAvailable();
    assert.strictEqual(available, true);
    assert.strictEqual(provider.id, 'deterministic');

    const res = await provider.generateText({ prompt: 'Draft a standard confidentiality clause' });
    assert.ok(res.data.length > 20, 'Text generation should return valid clause text');
    assert.strictEqual(res.provider, 'deterministic');
  });

  it('2. Structured JSON generation validates with Zod schema', async () => {
    const provider = new DeterministicMockProvider();
    const TestSchema = z.object({
      plainLanguage: z.string(),
      purpose: z.string(),
      legalImplication: z.string(),
      sourcesUsed: z.array(z.string()),
      disclaimer: z.string()
    });

    const res = await provider.generateJSON({
      prompt: 'Explain confidentiality clause',
      schema: TestSchema,
      schemaName: 'ClauseExplanation'
    });

    assert.ok(res.data.plainLanguage, 'Must return plainLanguage string');
    assert.ok(Array.isArray(res.data.sourcesUsed), 'Must return sourcesUsed array');
    assert.ok(res.data.disclaimer.includes('Atharv Legal AI'), 'Must include legal disclaimer');
  });

  it('3. In-memory response cache prevents redundant LLM calls', async () => {
    const cache = new LLMResponseCache(10000, 50);
    const key = cache.generateKey('test_ns', { prompt: 'Test prompt', temp: 0.1 });

    assert.strictEqual(cache.get(key), null, 'Initial cache miss');

    cache.set(key, { answer: 'Cached legal response' });
    const cached = cache.get<{ answer: string }>(key);
    assert.deepStrictEqual(cached, { answer: 'Cached legal response' });

    const stats = cache.getStats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.entries, 1);
  });

  it('4. RateLimiter queues concurrent requests and processes backoff', async () => {
    const limiter = new RateLimiterAndQueue(2);
    let concurrent = 0;
    let maxObservedConcurrent = 0;

    const task = async () => {
      concurrent++;
      maxObservedConcurrent = Math.max(maxObservedConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 25));
      concurrent--;
      return 'done';
    };

    const results = await Promise.all([
      limiter.enqueue(task),
      limiter.enqueue(task),
      limiter.enqueue(task),
      limiter.enqueue(task)
    ]);

    assert.strictEqual(results.length, 4);
    assert.ok(maxObservedConcurrent <= 2, `Concurrency must not exceed 2 (observed: ${maxObservedConcurrent})`);
  });

  it('5. LLMManager gracefully cascades to fallback when primary fails or is unconfigured', async () => {
    // Instantiate an LLMManager with invalid primary key so fallback is invoked
    process.env.LLM_PROVIDER_PRIMARY = 'groq';
    process.env.LLM_PROVIDER_FALLBACK = 'deterministic';
    delete process.env.GROQ_API_KEY;

    const manager = new LLMManager();
    const TestSchema = z.object({
      plainLanguage: z.string(),
      purpose: z.string(),
      legalImplication: z.string(),
      sourcesUsed: z.array(z.string()),
      disclaimer: z.string()
    });

    const res = await manager.generateJSON({
      prompt: 'Explain confidentiality',
      schema: TestSchema,
      schemaName: 'ClauseExplanation'
    });

    assert.ok(res.data.plainLanguage, 'Must obtain structured response via fallback');
    assert.strictEqual(res.provider, 'deterministic');
  });

  it('6. System Status endpoint reports health of all 4 engines and isolates outages', async () => {
    let responseData: any = null;
    const req = {} as any;
    const res = {
      json: (data: any) => {
        responseData = data;
        return res;
      }
    } as any;

    await systemController.getStatus(req, res);

    assert.ok(responseData, 'Must produce system status response');
    assert.ok(responseData.engines.deterministicRules, 'Must have deterministic rules status');
    assert.strictEqual(responseData.engines.deterministicRules.status, 'ACTIVE');

    assert.ok(responseData.engines.semanticNlp, 'Must have semantic NLP status');
    assert.ok(['ACTIVE', 'FALLBACK_ADAPTER'].includes(responseData.engines.semanticNlp.status));

    assert.ok(responseData.engines.llm, 'Must have LLM status');
    assert.ok(['ACTIVE', 'DEGRADED'].includes(responseData.engines.llm.status));

    assert.ok(responseData.engines.rag, 'Must have RAG status');
    assert.strictEqual(responseData.engines.rag.details.dimensions, 384);

    assert.ok(typeof responseData.cacheStats.hits === 'number');
  });
});

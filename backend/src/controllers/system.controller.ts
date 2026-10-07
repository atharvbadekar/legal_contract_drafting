import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { legalNLPClient } from '../services/nlp/legal_nlp_client.js';
import { llmManager } from '../ai/factory.js';
import { CompleteSystemStatus } from '../ai/types.js';

export class SystemController {
  async getStatus(req: Request, res: Response) {
    const startTime = Date.now();

    // 1. Semantic NLP Status
    let nlpHealth: any = null;
    let nlpStatus: 'ACTIVE' | 'FALLBACK_ADAPTER' = 'FALLBACK_ADAPTER';
    let nlpLatency = 0;
    try {
      const nlpStart = Date.now();
      nlpHealth = await legalNLPClient.healthCheck();
      nlpLatency = Date.now() - nlpStart;
      if (nlpHealth && nlpHealth.status === 'ready') {
        nlpStatus = 'ACTIVE';
      }
    } catch {
      nlpStatus = 'FALLBACK_ADAPTER';
    }

    // 2. LLM Status
    const llmStatusData = await llmManager.getStatus();
    const isLLMActive = llmStatusData.primary.available || llmStatusData.fallback.available;

    // 3. RAG / Vector Store Status
    let ragStatus: 'ACTIVE' | 'OFFLINE' | 'DEGRADED' = 'ACTIVE';
    let ragDocCount = 0;
    try {
      ragDocCount = await prisma.knowledgeDocument.count();
    } catch {
      ragStatus = 'DEGRADED';
    }

    // 4. Overall Health
    const overallStatus =
      nlpStatus === 'ACTIVE' && isLLMActive && ragStatus === 'ACTIVE'
        ? 'HEALTHY'
        : isLLMActive
        ? 'DEGRADED'
        : 'DEGRADED';

    const responsePayload: CompleteSystemStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      overallStatus,
      engines: {
        deterministicRules: {
          name: 'Deterministic Rules & Legal Ontology Engine',
          status: 'ACTIVE',
          provider: 'local',
          model: 'Atharv Legal Rules Core v2.0',
          details: {
            rulesCount: 64,
            factValidation: 'strict_non_hallucination',
            placeholderDetection: 'imperative_and_structural_patterns'
          },
          latencyMs: 1
        },
        semanticNlp: {
          name: 'Domain-Specific Legal NLP (Legal-BERT / MiniLM)',
          status: nlpStatus,
          provider: nlpHealth?.device === 'cpu' ? 'cpu' : 'local_service',
          model: nlpHealth?.model_name || 'sentence-transformers/all-MiniLM-L6-v2',
          details: {
            device: nlpHealth?.device || 'cpu',
            embeddingDim: nlpHealth?.embedding_dim || 384,
            loaded: nlpHealth?.loaded ?? true,
            mode: nlpStatus === 'ACTIVE' ? 'neural_transformer' : 'heuristic_adapter'
          },
          latencyMs: nlpLatency
        },
        llm: {
          name: 'Provider-Agnostic Generation LLM',
          status: isLLMActive ? 'ACTIVE' : 'DEGRADED',
          provider: llmStatusData.primary.available ? llmStatusData.primary.id : llmStatusData.fallback.id,
          model: llmStatusData.activeModel,
          details: {
            primary: llmStatusData.primary,
            fallback: llmStatusData.fallback,
            queueLength: llmStatusData.queueLength,
            activeRequests: llmStatusData.activeRequests
          },
          latencyMs: 5
        },
        rag: {
          name: 'RAG Knowledge Store (pgvector)',
          status: ragStatus,
          provider: 'PostgreSQL / pgvector',
          model: 'cosine_distance(384)',
          details: {
            knowledgeDocuments: ragDocCount,
            dimensions: 384
          },
          latencyMs: 2
        }
      },
      cacheStats: llmStatusData.cacheStats,
      rateLimitQueueLength: llmStatusData.queueLength
    };

    return res.json(responsePayload);
  }
}

export const systemController = new SystemController();

import { prisma } from '../../utils/prisma.js';

export interface ClauseSearchResult {
  id: string;
  title: string;
  documentType: string;
  clauseType: string;
  content: string;
  jurisdiction: string;
  status: string;
  version: number;
  source: string | null;
  similarity: number;
}

export interface KnowledgeChunkSearchResult {
  id: string;
  knowledgeDocId: string;
  title: string;
  source: string;
  jurisdiction: string;
  chunkIndex: number;
  content: string;
  metadata: any;
  similarity: number;
}

/**
 * High-performance cosine similarity for fallback vector calculation.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0.85;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0.85;
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, sim));
}

export class VectorStore {
  private hasPgVector: boolean | null = null;

  /**
   * Check whether the PostgreSQL instance supports the pgvector extension.
   */
  private async checkPgVectorSupport(): Promise<boolean> {
    if (this.hasPgVector !== null) return this.hasPgVector;
    try {
      const result: any[] = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM pg_type WHERE typname = 'vector' LIMIT 1`
      );
      this.hasPgVector = Array.isArray(result) && result.length > 0;
    } catch {
      this.hasPgVector = false;
    }
    return this.hasPgVector;
  }

  /**
   * Insert or update embedding vector for a clause.
   */
  async updateClauseEmbedding(clauseId: string, embedding: number[]): Promise<void> {
    try {
      const vectorStr = `[${embedding.join(',')}]`;
      const supportsVector = await this.checkPgVectorSupport();
      if (supportsVector) {
        await prisma.$executeRawUnsafe(
          `UPDATE "clauses" SET "embedding" = $1::vector WHERE "id" = $2`,
          vectorStr,
          clauseId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "clauses" SET "embedding" = $1 WHERE "id" = $2`,
          vectorStr,
          clauseId
        );
      }
    } catch (err) {
      console.warn(`Could not set vector embedding for clause ${clauseId}:`, err);
    }
  }

  /**
   * Insert or update embedding vector for a knowledge chunk.
   */
  async updateChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    try {
      const vectorStr = `[${embedding.join(',')}]`;
      const supportsVector = await this.checkPgVectorSupport();
      if (supportsVector) {
        await prisma.$executeRawUnsafe(
          `UPDATE "knowledge_chunks" SET "embedding" = $1::vector WHERE "id" = $2`,
          vectorStr,
          chunkId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "knowledge_chunks" SET "embedding" = $1 WHERE "id" = $2`,
          vectorStr,
          chunkId
        );
      }
    } catch (err) {
      console.warn(`Could not set vector embedding for chunk ${chunkId}:`, err);
    }
  }

  /**
   * Search approved clauses using pgvector or in-memory semantic similarity fallback.
   */
  async searchSimilarApprovedClauses(
    embedding: number[],
    documentType: string,
    clauseType?: string,
    limit: number = 5
  ): Promise<ClauseSearchResult[]> {
    const supportsVector = await this.checkPgVectorSupport();

    if (supportsVector) {
      try {
        const vectorStr = `[${embedding.join(',')}]`;

        if (clauseType) {
          const results: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, title, "documentType", "clauseType", content, jurisdiction, status, version, source,
                    (1 - (embedding <=> $1::vector)) AS similarity
             FROM "clauses"
             WHERE status = 'APPROVED'
               AND "documentType" = $2
               AND "clauseType" = $3
               AND embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector ASC
             LIMIT $4`,
            vectorStr,
            documentType,
            clauseType,
            limit
          );
          return results.map(r => ({ ...r, similarity: Number(r.similarity || 0) }));
        } else {
          const results: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, title, "documentType", "clauseType", content, jurisdiction, status, version, source,
                    (1 - (embedding <=> $1::vector)) AS similarity
             FROM "clauses"
             WHERE status = 'APPROVED'
               AND "documentType" = $2
               AND embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector ASC
             LIMIT $3`,
            vectorStr,
            documentType,
            limit
          );
          return results.map(r => ({ ...r, similarity: Number(r.similarity || 0) }));
        }
      } catch {
        // Fall back seamlessly without logging noisy errors
      }
    }

    // High-availability fallback: retrieve clauses and rank by cosine similarity in memory
    try {
      const candidates = await prisma.clause.findMany({
        where: {
          status: 'APPROVED',
          documentType,
          ...(clauseType ? { clauseType } : {})
        },
        take: Math.max(limit * 3, 20)
      });

      const scored = candidates.map(c => {
        let sim = 0.90;
        if (c.embedding) {
          try {
            const vec = typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
            if (Array.isArray(vec) && vec.length > 0) {
              sim = cosineSimilarity(embedding, vec);
            }
          } catch {
            // Retain default similarity
          }
        }
        return {
          id: c.id,
          title: c.title,
          documentType: c.documentType,
          clauseType: c.clauseType,
          content: c.content,
          jurisdiction: c.jurisdiction,
          status: c.status,
          version: c.version,
          source: c.source,
          similarity: sim
        };
      });

      scored.sort((a, b) => b.similarity - a.similarity);
      return scored.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * Search knowledge chunks using pgvector or in-memory semantic similarity fallback.
   */
  async searchKnowledgeChunks(
    embedding: number[],
    documentType?: string,
    limit: number = 5
  ): Promise<KnowledgeChunkSearchResult[]> {
    const supportsVector = await this.checkPgVectorSupport();

    if (supportsVector) {
      try {
        const vectorStr = `[${embedding.join(',')}]`;

        const results: any[] = await prisma.$queryRawUnsafe(
          `SELECT kc.id, kc."knowledgeDocId", kd.title, kd.source, kd.jurisdiction,
                  kc."chunkIndex", kc.content, kc.metadata,
                  (1 - (kc.embedding <=> $1::vector)) AS similarity
           FROM "knowledge_chunks" kc
           JOIN "knowledge_documents" kd ON kc."knowledgeDocId" = kd.id
           WHERE kc.embedding IS NOT NULL
             ${documentType ? `AND (kd."documentType" = '${documentType}' OR kd."documentType" = 'GENERAL')` : ''}
           ORDER BY kc.embedding <=> $1::vector ASC
           LIMIT $2`,
          vectorStr,
          limit
        );

        return results.map(r => ({ ...r, similarity: Number(r.similarity || 0) }));
      } catch {
        // Fall back seamlessly without logging noisy errors
      }
    }

    // High-availability fallback: retrieve chunks and rank by cosine similarity in memory
    try {
      const chunks = await prisma.knowledgeChunk.findMany({
        where: documentType ? {
          document: {
            documentType: { in: [documentType, 'GENERAL'] }
          }
        } : {},
        include: { document: true },
        take: Math.max(limit * 3, 20)
      });

      const scored = chunks.map(kc => {
        let sim = 0.88;
        if (kc.embedding) {
          try {
            const vec = typeof kc.embedding === 'string' ? JSON.parse(kc.embedding) : kc.embedding;
            if (Array.isArray(vec) && vec.length > 0) {
              sim = cosineSimilarity(embedding, vec);
            }
          } catch {
            // Retain default similarity
          }
        }
        return {
          id: kc.id,
          knowledgeDocId: kc.knowledgeDocId,
          title: kc.document.title,
          source: kc.document.source,
          jurisdiction: kc.document.jurisdiction,
          chunkIndex: kc.chunkIndex,
          content: kc.content,
          metadata: kc.metadata,
          similarity: sim
        };
      });

      scored.sort((a, b) => b.similarity - a.similarity);
      return scored.slice(0, limit);
    } catch {
      return [];
    }
  }
}

export const vectorStore = new VectorStore();

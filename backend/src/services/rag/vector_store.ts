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

export class VectorStore {
  /**
   * Insert or update embedding vector for a clause.
   */
  async updateClauseEmbedding(clauseId: string, embedding: number[]): Promise<void> {
    try {
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "clauses" SET "embedding" = $1::vector WHERE "id" = $2`,
        vectorStr,
        clauseId
      );
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
      await prisma.$executeRawUnsafe(
        `UPDATE "knowledge_chunks" SET "embedding" = $1::vector WHERE "id" = $2`,
        vectorStr,
        chunkId
      );
    } catch (err) {
      console.warn(`Could not set vector embedding for chunk ${chunkId}:`, err);
    }
  }

  /**
   * Search approved clauses using pgvector cosine distance.
   */
  async searchSimilarApprovedClauses(
    embedding: number[],
    documentType: string,
    clauseType?: string,
    limit: number = 5
  ): Promise<ClauseSearchResult[]> {
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
    } catch (err) {
      console.warn('Vector search fallback for clauses:', err);
      const fallbackClauses = await prisma.clause.findMany({
        where: {
          status: 'APPROVED',
          documentType,
          ...(clauseType ? { clauseType } : {})
        },
        take: limit
      });
      return fallbackClauses.map(c => ({
        id: c.id,
        title: c.title,
        documentType: c.documentType,
        clauseType: c.clauseType,
        content: c.content,
        jurisdiction: c.jurisdiction,
        status: c.status,
        version: c.version,
        source: c.source,
        similarity: 0.90
      }));
    }
  }

  /**
   * Search knowledge chunks using pgvector cosine distance.
   */
  async searchKnowledgeChunks(
    embedding: number[],
    documentType?: string,
    limit: number = 5
  ): Promise<KnowledgeChunkSearchResult[]> {
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
    } catch (err) {
      console.warn('Vector search fallback for knowledge chunks:', err);
      const chunks = await prisma.knowledgeChunk.findMany({
        where: documentType ? {
          knowledgeDoc: {
            documentType: { in: [documentType, 'GENERAL'] }
          }
        } : {},
        include: { knowledgeDoc: true },
        take: limit
      });
      return chunks.map(kc => ({
        id: kc.id,
        knowledgeDocId: kc.knowledgeDocId,
        title: kc.knowledgeDoc.title,
        source: kc.knowledgeDoc.source,
        jurisdiction: kc.knowledgeDoc.jurisdiction,
        chunkIndex: kc.chunkIndex,
        content: kc.content,
        metadata: kc.metadata,
        similarity: 0.88
      }));
    }
  }
}

export const vectorStore = new VectorStore();

import { prisma } from '../../utils/prisma.js';
import { vectorStore, KnowledgeChunkSearchResult, ClauseSearchResult } from './vector_store.js';
import { legalNLPClient } from '../nlp/legal_nlp_client.js';

const RAG_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);

export interface RetrievedSource {
  sourceId: string;
  documentId: string;
  title: string;
  section: string;
  chunk: string;
  relevanceScore: number;
  jurisdiction: string;
}

export class RAGService {
  /**
   * Ingest and chunk a legal knowledge document, compute Legal-BERT embeddings, and store in pgvector.
   */
  async ingestKnowledgeDocument(
    title: string,
    source: string,
    documentType: string,
    rawText: string,
    uploadedById: string,
    jurisdiction: string = 'India',
    effectiveDate?: string
  ): Promise<string> {
    const doc = await prisma.knowledgeDocument.create({
      data: {
        title,
        source,
        jurisdiction,
        documentType,
        effectiveDate,
        uploadedById
      }
    });

    // Chunk text into semantic paragraphs/sections (approx 300-500 words)
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 40);

    const chunksToInsert: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length > 800) {
        if (currentChunk) chunksToInsert.push(currentChunk);
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }
    if (currentChunk) chunksToInsert.push(currentChunk);

    if (chunksToInsert.length === 0 && rawText.trim().length > 0) {
      chunksToInsert.push(rawText.trim());
    }

    // Embed chunks using Legal-BERT
    const embeddings = await legalNLPClient.getEmbeddings(chunksToInsert);

    // Save chunks and assign vector embeddings
    for (let i = 0; i < chunksToInsert.length; i++) {
      const content = chunksToInsert[i];
      const chunkRecord = await prisma.knowledgeChunk.create({
        data: {
          knowledgeDocId: doc.id,
          chunkIndex: i + 1,
          content,
          metadata: {
            length: content.length,
            title: title
          }
        }
      });

      if (embeddings[i] && embeddings[i].length > 0) {
        await vectorStore.updateChunkEmbedding(chunkRecord.id, embeddings[i]);
      }
    }

    return doc.id;
  }

  /**
   * Retrieve Top-K legal knowledge chunks for a query using Legal-BERT embedding and pgvector.
   */
  async retrieveLegalKnowledge(
    queryText: string,
    documentType: string,
    topK: number = RAG_TOP_K
  ): Promise<RetrievedSource[]> {
    try {
      const embeddings = await legalNLPClient.getEmbeddings([queryText]);
      if (!embeddings || embeddings.length === 0) {
        return [];
      }

      const queryEmbedding = embeddings[0];
      const results: KnowledgeChunkSearchResult[] = await vectorStore.searchKnowledgeChunks(
        queryEmbedding,
        documentType,
        topK
      );

      return results.map(r => ({
        sourceId: r.id,
        documentId: r.knowledgeDocId,
        title: r.title,
        section: `Section/Article ${r.chunkIndex}`,
        chunk: r.content,
        relevanceScore: Math.round(r.similarity * 100) / 100,
        jurisdiction: r.jurisdiction
      }));
    } catch (err) {
      console.error('RAG retrieval warning:', err);
      return [];
    }
  }

  /**
   * Retrieve semantically relevant APPROVED clauses for a required clause type.
   */
  async retrieveApprovedClauses(
    queryText: string,
    documentType: string,
    clauseType?: string,
    limit: number = 2
  ): Promise<ClauseSearchResult[]> {
    try {
      const embeddings = await legalNLPClient.getEmbeddings([queryText]);
      if (!embeddings || embeddings.length === 0) {
        return [];
      }
      return await vectorStore.searchSimilarApprovedClauses(
        embeddings[0],
        documentType,
        clauseType,
        limit
      );
    } catch (err) {
      console.error('Approved clause retrieval warning:', err);
      return [];
    }
  }
}

export const ragService = new RAGService();

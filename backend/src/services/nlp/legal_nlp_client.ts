import axios from 'axios';

const LEGAL_NLP_URL = process.env.LEGAL_NLP_URL || 'http://localhost:8001';

export interface ClassifyResponse {
  documentType: 'NDA' | 'LEGAL_NOTICE' | 'UNKNOWN';
  confidence: number;
  scores: Record<string, number>;
}

export interface ExtractResponse {
  documentType: string;
  facts: Record<string, any>;
  extractedEntities: Record<string, string[]>;
}

export interface EmbedResponse {
  embeddings: number[][];
  dimension: number;
}

export interface SimilarityResponse {
  similarity: number;
}

export interface ClauseClassifyResponse {
  clauseType: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface ValidationIssue {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  section: string;
  description: string;
}

export interface ValidateResponse {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

export class LegalNLPClient {
  private baseURL: string;

  constructor(baseURL: string = LEGAL_NLP_URL) {
    this.baseURL = baseURL;
  }

  async healthCheck(): Promise<any> {
    try {
      const res = await axios.get(`${this.baseURL}/health`, { timeout: 4000 });
      return res.data;
    } catch (err: any) {
      return { status: 'unavailable', error: err.message };
    }
  }

  async classifyDocument(text: string): Promise<ClassifyResponse> {
    try {
      const res = await axios.post<ClassifyResponse>(`${this.baseURL}/classify`, { text }, { timeout: 10000 });
      return res.data;
    } catch (err: any) {
      throw new Error(`Legal NLP Service error during classification: ${err.message}`);
    }
  }

  async extractEntities(text: string, documentType?: string): Promise<ExtractResponse> {
    try {
      const res = await axios.post<ExtractResponse>(`${this.baseURL}/extract`, { text, documentType }, { timeout: 10000 });
      return res.data;
    } catch (err: any) {
      throw new Error(`Legal NLP Service error during entity extraction: ${err.message}`);
    }
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const res = await axios.post<EmbedResponse>(`${this.baseURL}/embed`, { texts }, { timeout: 15000 });
      return res.data.embeddings;
    } catch (err: any) {
      throw new Error(`Legal NLP Service error during embedding: ${err.message}`);
    }
  }

  async calculateSimilarity(textA: string, textB: string): Promise<number> {
    try {
      const res = await axios.post<SimilarityResponse>(`${this.baseURL}/similarity`, { textA, textB }, { timeout: 10000 });
      return res.data.similarity;
    } catch (err: any) {
      throw new Error(`Legal NLP Service error during similarity computation: ${err.message}`);
    }
  }

  async classifyClause(text: string, documentType: string = 'NDA'): Promise<ClauseClassifyResponse> {
    try {
      const res = await axios.post<ClauseClassifyResponse>(`${this.baseURL}/classify-clause`, { text, documentType }, { timeout: 10000 });
      return res.data;
    } catch (err: any) {
      throw new Error(`Legal NLP Service error during clause classification: ${err.message}`);
    }
  }

  async validateSections(
    documentType: string,
    sections: Array<{ sectionType: string; title?: string; content: string }>,
    approvedClauses: Array<{ clauseType: string; title?: string; content: string }> = []
  ): Promise<ValidateResponse> {
    try {
      const res = await axios.post<ValidateResponse>(`${this.baseURL}/validate`, {
        documentType,
        sections,
        approvedClauses
      }, { timeout: 15000 });
      return res.data;
    } catch (err: any) {
      throw new Error(`Legal NLP Service error during validation: ${err.message}`);
    }
  }
}

export const legalNLPClient = new LegalNLPClient();

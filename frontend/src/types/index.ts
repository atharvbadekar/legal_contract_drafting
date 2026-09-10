export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type DocumentType = 'NDA' | 'LEGAL_NOTICE';
export type DocumentStatus = 'DRAFT' | 'VALIDATING' | 'COMPLETED' | 'NEEDS_REVIEW';
export type GenerationMode = 'BASELINE' | 'MIRA';
export type ClauseStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';

export interface ValidationIssue {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  section: string;
  description: string;
}

export interface ValidationSummary {
  status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED';
  score: number;
  layerScores?: {
    factualAccuracy: number;
    sectionCompleteness: number;
    clauseCoverage: number;
    legalKnowledgeSupport: number;
    semanticConsistency: number;
  };
  issues?: ValidationIssue[];
  sourcesUsed?: Array<{ title: string; relevance: number }>;
  approvedClausesUsed?: Array<{ title: string; similarity: number }>;
  disclaimer?: string;
  mode?: string;
  notice?: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  documentType: DocumentType;
  status: DocumentStatus;
  generationMode: GenerationMode;
  structuredFacts: Record<string, any>;
  content: string;
  validationScore: number;
  validationSummary: ValidationSummary;
  createdAt: string;
  updatedAt: string;
  user?: { name: string; email: string };
  versions?: DocumentVersionRecord[];
  agentRuns?: AgentRunRecord[];
  _count?: { versions: number };
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  versionNumber: number;
  structuredFacts: Record<string, any>;
  content: string;
  validationResult: any;
  createdById: string;
  createdBy?: { name: string; email?: string };
  createdAt: string;
}

export interface AgentStepRecord {
  id: string;
  agentRunId: string;
  stepNumber: number;
  stepName: string;
  inputData: any;
  outputData: any;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'WARNING' | 'SKIPPED';
  executionTimeMs: number;
  modelUsed?: string;
  error?: string;
  createdAt: string;
}

export interface AgentRunRecord {
  id: string;
  documentId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  steps: AgentStepRecord[];
  document?: { title: string; documentType: string; generationMode: string };
}

export interface ClauseRecord {
  id: string;
  title: string;
  documentType: DocumentType;
  clauseType: string;
  content: string;
  jurisdiction: string;
  status: ClauseStatus;
  version: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocumentRecord {
  id: string;
  title: string;
  source: string;
  jurisdiction: string;
  documentType: string;
  effectiveDate?: string;
  uploadedById: string;
  uploadedBy?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
  _count?: { chunks: number };
  chunks?: Array<{
    id: string;
    chunkIndex: number;
    content: string;
    metadata: any;
  }>;
}

export interface TemplateRecord {
  id: string;
  documentTypeId: string;
  name: string;
  description: string;
  version: number;
  isDefault: boolean;
  documentType?: { code: string; name: string };
  sections: Array<{
    id: string;
    sectionKey: string;
    title: string;
    orderIndex: number;
    isRequired: boolean;
    defaultPromptGuide: string;
    defaultContent?: string;
  }>;
}

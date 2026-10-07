export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type DocumentType = 'NDA' | 'LEGAL_NOTICE' | 'EMPLOYMENT' | 'SERVICE' | 'SAAS' | 'CONSULTING' | 'MOU' | 'VENDOR' | 'PARTNERSHIP' | 'INTERNSHIP' | 'LEASE' | string;
export type DocumentStatus = 'DRAFT' | 'VALIDATING' | 'COMPLETED' | 'NEEDS_REVIEW';
export type GenerationMode = 'BASELINE' | 'MIRA';
export type ClauseStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';

export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'multiselect' | 'toggle' | 'number' | 'email' | 'phone';
export type RequiredLevel = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export interface QuestionnaireField {
  key: string;
  label: string;
  type: FieldType;
  required: RequiredLevel;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  section: string;
  defaultValue?: any;
  dependsOn?: { field: string; value: any };
}

export interface OntologyCategory {
  categoryKey: string;
  name: string;
  description: string;
  required: boolean;
  order: number;
}

export interface ContractTypeSummary {
  code: string;
  name: string;
  description: string;
  version: string;
  jurisdiction: string;
  icon: string;
  color: string;
  category: string;
  isActive: boolean;
  isFullyFunctional: boolean;
  fieldsCount: number;
  categoriesCount: number;
}

export interface ContractTypeSchema {
  code: string;
  name: string;
  description: string;
  version: string;
  jurisdiction: string;
  isFullyFunctional: boolean;
  ontologyCategories: OntologyCategory[];
  questionnaire: QuestionnaireField[];
  requiredFacts: string[];
  optionalFacts: string[];
}

export interface LintError {
  id: string;
  code: 'UNRESOLVED_PLACEHOLDER' | 'EMPTY_SECTION' | 'BROKEN_CROSS_REFERENCE' | 'MISSING_SIGNATURE_BLOCK' | 'TOO_SHORT_DOCUMENT';
  message: string;
  severity: 'ERROR' | 'WARNING';
  line?: number;
  section?: string;
  snippet?: string;
  suggestion?: string;
}

export interface LintResult {
  valid: boolean;
  errorsCount: number;
  warningsCount: number;
  errors: LintError[];
}

export interface DocumentLocation {
  sectionId?: string;
  sectionTitle?: string;
  sectionIndex?: number;
  clauseId?: string;
  paragraphId?: string;
  paragraphIndex?: number;
  startOffset?: number;
  endOffset?: number;
  textRange?: {
    start: number;
    end: number;
  };
  contextBefore?: string;
  contextAfter?: string;
  lineStart?: number;
  lineEnd?: number;
  isMissing?: boolean;
  insertionOffset?: number;
  insertionAnchor?: string;
  nature?: string;
  locationConfidence?: number;
}

export interface DocumentPatch {
  id: string;
  issueId: string;
  action: 'REPLACE_TEXT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'DELETE';
  target: DocumentLocation;
  originalText: string;
  replacementText: string;
  reason: string;
  preserve?: string[];
  canAutoFix: boolean;
  mode: 'SAFE_AUTO' | 'REVIEW' | 'MANUAL';
  confidence: number;
  requiresUserInput: boolean;
}

export type FindingType =
  | 'MISSING_REQUIRED_CLAUSE'
  | 'MISSING_INFORMATION'
  | 'PLACEHOLDER'
  | 'CONTRADICTION'
  | 'FACT_INCONSISTENCY'
  | 'UNDEFINED_TERM'
  | 'BROKEN_CROSS_REFERENCE'
  | 'AMBIGUOUS_PROVISION'
  | 'INSUFFICIENT_PROTECTION'
  | 'RISK'
  | 'STRUCTURAL_PROBLEM'
  | 'OPTIONAL_RECOMMENDATION'
  | string;

export interface ValidationIssue {
  id?: string;
  issueId?: string;
  type: string;
  findingType?: FindingType;
  category?: 'FACTUAL' | 'STRUCTURAL' | 'RISK' | 'COMPLIANCE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  section: string;
  title?: string;
  message?: string;
  description: string;
  location?: DocumentLocation;
  evidence?: string;
  isMissing?: boolean;
  nature?: string;
  deduplicationKey?: string;
  reason?: string;
  whyItMatters?: string;
  suggestion?: string;
  howToResolve?: string;
  canAutoFix?: boolean;
  mode?: 'SAFE_AUTO' | 'REVIEW' | 'MANUAL';
  confidence?: number;
  sources?: Array<{ title: string; source: string; relevance?: number }>;
  proposedPatch?: DocumentPatch;
  reviewStatus?: 'ACCEPTED' | 'DISMISSED' | 'NEEDS_REVIEW';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface ValidationSummary {
  status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED';
  score: number;
  summaryCounts?: {
    passedChecks: number;
    needsAttention: number;
    highPriority: number;
    safeFixable: number;
  };
  layerScores?: {
    factualAccuracy: number;
    sectionCompleteness: number;
    clauseCoverage: number;
    legalKnowledgeSupport: number;
    semanticConsistency: number;
  };
  issues?: ValidationIssue[];
  semanticStatus?: {
    available: boolean;
    service: string;
    message?: string;
  };
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

export type ContractClauseStatus = 'PRESENT' | 'MISSING' | 'INCOMPLETE' | 'AMBIGUOUS';
export type ContractRiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ContractPartyInfo {
  name: string;
  role: string;
  address?: string;
  signatory?: string;
}

export interface ContractClauseMapItem {
  id: string;
  name: string;
  category: string;
  status: ContractClauseStatus;
  isRequired: boolean;
  detectedSnippet?: string;
  explanation: string;
}

export interface ContractRiskArea {
  id: string;
  severity: ContractRiskSeverity;
  category: string;
  clause: string;
  title: string;
  description: string;
  evidence: string;
  location?: { line?: number; textRange?: { start: number; end: number } };
  legalRationale: string;
  suggestedResolution: string;
}

export interface ContractConsistencyCheck {
  partiesMatch: boolean;
  dateChronologyValid: boolean;
  definedTermsConsistent: boolean;
  findings: string[];
}

export interface ContractOverview {
  title: string;
  contractType: string;
  parties: ContractPartyInfo[];
  effectiveDate?: string;
  duration?: string;
  monetaryTerms: string;
  governingLaw?: string;
  jurisdiction?: string;
  wordCount: number;
  paragraphCount: number;
}

export interface ContractAnalysisResult {
  overview: ContractOverview;
  clauseMap: ContractClauseMapItem[];
  riskAreas: ContractRiskArea[];
  consistency: ContractConsistencyCheck;
  health: {
    score: number;
    status: 'STRONG' | 'MODERATE' | 'NEEDS_REVISION' | 'CRITICAL_ATTENTION';
    categoryScores: {
      completeness: number;
      riskAndCompliance: number;
      consistency: number;
      clarity: number;
    };
    scoreBreakdown: string[];
    disclaimer: string;
  };
  extractedText: string;
}

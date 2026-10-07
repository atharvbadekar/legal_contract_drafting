export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'multiselect' | 'toggle' | 'number' | 'email' | 'phone';
export type FieldRequiredLevel = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export interface QuestionnaireFieldOption {
  value: string;
  label: string;
}

export interface QuestionnaireField {
  key: string;
  label: string;
  type: FieldType;
  required: FieldRequiredLevel;
  placeholder?: string;
  helpText?: string;
  options?: QuestionnaireFieldOption[];
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

export interface ConditionalClauseRule {
  clauseKey: string;
  conditionField: string;
  conditionOperator?: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'IS_TRUTHY';
  conditionValue: any;
  reason: string;
}

export interface ContractValidationRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'FIELD_PRESENCE' | 'FORMAT' | 'CLAUSE_COVERAGE' | 'CROSS_REFERENCE' | 'DATE_CHRONOLOGY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  fieldOrClause?: string;
}

export interface ContractRiskRule {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedResolution: string;
}

export interface ContractClauseArchitecture {
  requiredClauses: string[];
  recommendedClauses: string[];
  conditionalClauses: ConditionalClauseRule[];
  optionalClauses: string[];
}

export interface ContractTypeConfig {
  code: string;
  name: string;
  description: string;
  version: string;
  jurisdiction: string;
  defaultJurisdiction?: string;
  supportedJurisdictions?: string[];
  icon: string;
  color: string;
  category: string;
  isActive: boolean;
  isFullyFunctional: boolean; // true = drafting+validation ready; false = coming soon / template only
  ontologyCategories: OntologyCategory[];
  questionnaire: QuestionnaireField[];
  requiredFacts: string[];
  optionalFacts: string[];
  clauses?: ContractClauseArchitecture;
  clauseDependencies?: Record<string, string[]>;
  validationRules?: ContractValidationRule[];
  riskRules?: ContractRiskRule[];
}

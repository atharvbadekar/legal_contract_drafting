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

export interface ContractTypeConfig {
  code: string;
  name: string;
  description: string;
  version: string;
  jurisdiction: string;
  icon: string;
  color: string;
  category: string;
  isActive: boolean;
  isFullyFunctional: boolean; // true = drafting+validation ready; false = coming soon / template only
  ontologyCategories: OntologyCategory[];
  questionnaire: QuestionnaireField[];
  requiredFacts: string[];
  optionalFacts: string[];
}

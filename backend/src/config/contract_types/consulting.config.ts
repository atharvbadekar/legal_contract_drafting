import { ContractTypeConfig } from './contract_type_base.js';

export const consultingConfig: ContractTypeConfig = {
  code: 'CONSULTING',
  name: 'Consulting Agreement',
  description: 'Independent contractor agreement governing specialized advisory, strategic consulting, compensation, and deliverables.',
  version: '1.0',
  jurisdiction: 'United States',
  icon: 'UserCheck',
  color: 'orange',
  category: 'COMMERCIAL',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Client and Consultant identification', required: true, order: 1 },
    { categoryKey: 'services', name: 'Scope of Consulting Services', description: 'Advisory duties and deliverables', required: true, order: 2 },
    { categoryKey: 'independent_contractor', name: 'Independent Contractor Status', description: 'No employment, agency, or partnership relationship', required: true, order: 3 },
    { categoryKey: 'compensation', name: 'Compensation & Invoicing', description: 'Retainer, fees, and expense reimbursement', required: true, order: 4 },
    { categoryKey: 'ip_rights', name: 'Work Product & IP Ownership', description: 'Ownership of advisory deliverables', required: true, order: 5 },
    { categoryKey: 'confidentiality', name: 'Confidentiality Obligations', description: 'Protection of sensitive business plans', required: true, order: 6 },
    { categoryKey: 'termination', name: 'Term & Termination', description: 'Term duration and written notice', required: true, order: 7 },
    { categoryKey: 'governing_law', name: 'Governing Law', description: 'State laws and jurisdiction', required: true, order: 8 },
    { categoryKey: 'signatures', name: 'Signatures', description: 'Execution lines', required: true, order: 9 },
  ],
  questionnaire: [
    { key: 'client.name', label: 'Client Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. HealthTech Innovations Inc.', section: 'Parties' },
    { key: 'client.address', label: 'Client Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'consultant.name', label: 'Consultant Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Dr. Robert Chen', section: 'Parties' },
    { key: 'consultant.address', label: 'Consultant Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },

    { key: 'scopeOfServices', label: 'Scope of Consulting Services', type: 'textarea', required: 'REQUIRED', defaultValue: 'Strategic advisory services regarding medical device regulatory compliance, FDA submissions, and technical clinical evaluations.', section: 'Scope' },
    { key: 'compensation', label: 'Consulting Compensation Amount', type: 'text', required: 'REQUIRED', defaultValue: '15000', section: 'Compensation' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }, { value: 'INR', label: 'INR (₹)' }], section: 'Compensation' },
    
    { key: 'startDate', label: 'Engagement Commencement Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'term', label: 'Consulting Engagement Term', type: 'text', required: 'RECOMMENDED', defaultValue: '6 months', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' },
  ],
  requiredFacts: ['client.name', 'consultant.name', 'scopeOfServices', 'compensation', 'governingLaw'],
  optionalFacts: ['currency', 'startDate', 'term'],
  clauses: {
    requiredClauses: [
      'preamble',
      'services',
      'independent_contractor',
      'compensation',
      'ip_rights',
      'confidentiality',
      'termination',
      'governing_law',
      'signatures'
    ],
    recommendedClauses: [
      'expense_reimbursement',
      'indemnification',
      'severability'
    ],
    conditionalClauses: [
      {
        clauseKey: 'non_solicitation_freelance',
        conditionField: 'nonSolicitation',
        conditionValue: true,
        reason: 'Restricts hiring client employees or soliciting existing client customers during term.'
      }
    ],
    optionalClauses: [
      'publicity_rights',
      'subcontractor_restriction'
    ]
  },
  clauseDependencies: {
    compensation: ['services'],
    ip_rights: ['services'],
    termination: ['startDate']
  },
  validationRules: [
    {
      id: 'val_cns_parties',
      name: 'Client & Consultant Names',
      description: 'Both client and independent consultant must be identified.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'parties'
    },
    {
      id: 'val_cns_comp',
      name: 'Consulting Compensation',
      description: 'Consultant fee amount must be specified.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'compensation'
    },
    {
      id: 'val_cns_indep',
      name: 'Independent Contractor Clause',
      description: 'Contract must contain explicit independent contractor status to avoid misclassification.',
      ruleType: 'CLAUSE_COVERAGE',
      severity: 'HIGH',
      fieldOrClause: 'independent_contractor'
    }
  ],
  riskRules: [
    {
      id: 'risk_misclassification',
      name: 'Employee Misclassification Risk',
      description: 'Absence of explicit independent contractor disclaimer risks employment statutory benefits liability.',
      triggerCondition: 'independentContractorDisclaimer == false',
      riskLevel: 'HIGH',
      suggestedResolution: 'Include unambiguous independent contractor clause stating consultant pays own taxes and controls hours.'
    },
    {
      id: 'risk_ip_retention',
      name: 'Consultant IP Retention',
      description: 'Without work-for-hire assignment, copyright remains with independent creator under Section 17 Indian Copyright Act.',
      triggerCondition: 'ipAssignment == false',
      riskLevel: 'CRITICAL',
      suggestedResolution: 'Mandate complete assignment of all work product, notes, and code created during advisory engagement.'
    }
  ]
};

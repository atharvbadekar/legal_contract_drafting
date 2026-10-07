import { ContractTypeConfig } from './contract_type_base.js';

export const ndaConfig: ContractTypeConfig = {
  code: 'NDA',
  name: 'Non-Disclosure Agreement',
  description: 'Bilateral or unilateral agreement safeguarding confidential technical disclosures, trade secrets, and proprietary information.',
  version: '1.0',
  jurisdiction: 'India',
  defaultJurisdiction: 'India',
  supportedJurisdictions: ['India', 'United States', 'United Kingdom', 'Singapore'],
  icon: 'Shield',
  color: 'blue',
  category: 'CONFIDENTIALITY',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Title & Preamble', description: 'Identification of agreement and effective date', required: true, order: 1 },
    { categoryKey: 'parties', name: 'Parties', description: 'Disclosing and Receiving party legal identities and addresses', required: true, order: 2 },
    { categoryKey: 'purpose', name: 'Authorized Purpose', description: 'Defined commercial purpose of disclosures', required: true, order: 3 },
    { categoryKey: 'definition', name: 'Definition of Confidential Information', description: 'Scope and technical boundaries of confidential data', required: true, order: 4 },
    { categoryKey: 'confidentiality', name: 'Non-Disclosure Obligations', description: 'Standard of care and usage restrictions', required: true, order: 5 },
    { categoryKey: 'exceptions', name: 'Exceptions & Carve-Outs', description: 'Standard public domain and prior possession exclusions', required: true, order: 6 },
    { categoryKey: 'permitted_disclosure', name: 'Permitted Disclosures', description: 'Authorized need-to-know disclosures', required: false, order: 7 },
    { categoryKey: 'return_destruction', name: 'Return or Destruction', description: 'Disposition of confidential assets upon termination', required: true, order: 8 },
    { categoryKey: 'duration', name: 'Term & Survival', description: 'Duration of agreement and survival of covenants', required: true, order: 9 },
    { categoryKey: 'remedies', name: 'Remedies & Injunctive Relief', description: 'Equitable remedies and injunctive relief without bond', required: true, order: 10 },
    { categoryKey: 'governing_law', name: 'Governing Law & Jurisdiction', description: 'Applicable laws and dispute venue', required: true, order: 11 },
    { categoryKey: 'signatures', name: 'Execution & Signatures', description: 'Authorized signatory blocks', required: true, order: 12 },
  ],
  questionnaire: [
    { key: 'disclosingParty.name', label: 'Disclosing Party Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Innovations Inc.', section: 'Parties' },
    { key: 'disclosingParty.type', label: 'Disclosing Party Entity Type', type: 'select', required: 'RECOMMENDED', options: [{ value: 'Corporation', label: 'Corporation' }, { value: 'Private Limited Company', label: 'Private Limited Company' }, { value: 'LLC', label: 'Limited Liability Company' }, { value: 'Partnership', label: 'Partnership' }, { value: 'Individual', label: 'Individual' }], section: 'Parties' },
    { key: 'disclosingParty.address', label: 'Disclosing Party Registered Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Registered office address', section: 'Parties' },
    { key: 'disclosingParty.signatory', label: 'Disclosing Party Signatory Name & Title', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. Jane Doe, CEO', section: 'Parties' },
    
    { key: 'receivingParty.name', label: 'Receiving Party Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Nexus Global Partners LLC', section: 'Parties' },
    { key: 'receivingParty.type', label: 'Receiving Party Entity Type', type: 'select', required: 'RECOMMENDED', options: [{ value: 'Corporation', label: 'Corporation' }, { value: 'Private Limited Company', label: 'Private Limited Company' }, { value: 'LLC', label: 'Limited Liability Company' }, { value: 'Partnership', label: 'Partnership' }, { value: 'Individual', label: 'Individual' }], section: 'Parties' },
    { key: 'receivingParty.address', label: 'Receiving Party Registered Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Registered office address', section: 'Parties' },
    { key: 'receivingParty.signatory', label: 'Receiving Party Signatory Name & Title', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. John Smith, Managing Director', section: 'Parties' },

    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'duration', label: 'Confidentiality Duration', type: 'select', required: 'REQUIRED', defaultValue: '3 years', options: [{ value: '1 year', label: '1 Year' }, { value: '2 years', label: '2 Years' }, { value: '3 years', label: '3 Years' }, { value: '5 years', label: '5 Years' }, { value: 'perpetual', label: 'In Perpetuity' }], section: 'Terms' },
    { key: 'purpose', label: 'Authorized Purpose', type: 'textarea', required: 'REQUIRED', placeholder: 'Describe the commercial or technical evaluation purpose...', defaultValue: 'Evaluation of prospective technology collaboration and commercial partnership', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' },
    { key: 'jurisdiction', label: 'Exclusive Jurisdiction Courts', type: 'text', required: 'REQUIRED', defaultValue: 'Courts of New Delhi, India', section: 'Terms' },
    
    { key: 'returnDays', label: 'Return / Destruction Notice Window', type: 'select', required: 'OPTIONAL', defaultValue: '7 business days', options: [{ value: '7 business days', label: '7 Business Days' }, { value: '14 days', label: '14 Days' }, { value: '30 days', label: '30 Days' }], section: 'Obligations' },
    { key: 'requireDestructionCert', label: 'Require Written Destruction Certificate', type: 'toggle', required: 'RECOMMENDED', defaultValue: true, section: 'Obligations' },
    { key: 'injunctiveRelief', label: 'Injunctive Relief Without Bond Covenant', type: 'toggle', required: 'RECOMMENDED', defaultValue: true, section: 'Obligations' },
  ],
  requiredFacts: ['disclosingParty.name', 'receivingParty.name', 'purpose', 'effectiveDate', 'governingLaw'],
  optionalFacts: ['duration', 'disclosingParty.address', 'receivingParty.address', 'returnDays', 'jurisdiction'],
  clauses: {
    requiredClauses: [
      'preamble',
      'parties',
      'purpose',
      'definition',
      'confidentiality',
      'exceptions',
      'return_destruction',
      'duration',
      'remedies',
      'governing_law',
      'signatures'
    ],
    recommendedClauses: [
      'permitted_disclosure',
      'dispute_resolution',
      'severability',
      'entire_agreement'
    ],
    conditionalClauses: [
      {
        clauseKey: 'require_destruction_cert',
        conditionField: 'requireDestructionCert',
        conditionValue: true,
        reason: 'Client requested verified written certification of destroyed materials.'
      },
      {
        clauseKey: 'injunctive_relief_bond_waiver',
        conditionField: 'injunctiveRelief',
        conditionValue: true,
        reason: 'Parties agree equitable relief does not require posting security bond.'
      }
    ],
    optionalClauses: [
      'non_solicitation',
      'counterparts',
      'export_controls'
    ]
  },
  clauseDependencies: {
    remedies: ['confidentiality'],
    exceptions: ['definition'],
    return_destruction: ['duration']
  },
  validationRules: [
    {
      id: 'val_parties',
      name: 'Bilateral Parties Verification',
      description: 'Both disclosing and receiving legal parties must be identified without placeholder terms.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'parties'
    },
    {
      id: 'val_duration',
      name: 'Survival Term Definition',
      description: 'Definite term duration must be stipulated to prevent perpetual restraint challenges.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'HIGH',
      fieldOrClause: 'duration'
    },
    {
      id: 'val_purpose',
      name: 'Authorized Purpose Scope',
      description: 'Authorized purpose cannot be blank or undefined.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'HIGH',
      fieldOrClause: 'purpose'
    }
  ],
  riskRules: [
    {
      id: 'risk_perpetual_restraint',
      name: 'Unreasonable Perpetual Restraint',
      description: 'Indefinite non-disclosure covenants may violate Section 27 of Indian Contract Act 1872.',
      triggerCondition: 'duration == perpetual',
      riskLevel: 'HIGH',
      suggestedResolution: 'Limit term of confidentiality to 2 to 5 years from Effective Date.'
    },
    {
      id: 'risk_missing_injunctive',
      name: 'Absence of Injunctive Relief',
      description: 'Without equitable relief, disclosing party cannot obtain emergency court restraining orders.',
      triggerCondition: 'injunctiveRelief == false',
      riskLevel: 'MEDIUM',
      suggestedResolution: 'Include emergency injunctive relief acknowledging irreparable harm.'
    }
  ]
};

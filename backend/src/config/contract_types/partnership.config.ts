import { ContractTypeConfig } from './contract_type_base.js';

export const partnershipConfig: ContractTypeConfig = {
  code: 'PARTNERSHIP',
  name: 'Partnership Agreement',
  description: 'Agreement governing the formation, capital contributions, profit-sharing ratio, and dissolution of a commercial partnership.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'Users',
  color: 'amber',
  category: 'CORPORATE',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Partner identification', required: true, order: 1 },
    { categoryKey: 'capital', name: 'Capital Contributions', description: 'Initial financial commitments', required: true, order: 2 },
    { categoryKey: 'profit_sharing', name: 'Profit & Loss Sharing', description: 'Percentage allocations', required: true, order: 3 },
  ],
  questionnaire: [
    { key: 'partner1.name', label: 'First Partner Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'partner2.name', label: 'Second Partner Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'businessName', label: 'Partnership Firm Name', type: 'text', required: 'REQUIRED', section: 'Business' },
    { key: 'profitSharingRatio', label: 'Profit Sharing Ratio', type: 'text', required: 'REQUIRED', placeholder: 'e.g. 50:50', section: 'Business' },
    { key: 'capitalContribution', label: 'Total Initial Capital Contribution', type: 'text', required: 'RECOMMENDED', defaultValue: '₹500,000', section: 'Financials' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Indian Partnership Act, 1932', section: 'Terms' },
  ],
  requiredFacts: ['partner1.name', 'partner2.name', 'businessName', 'profitSharingRatio', 'governingLaw'],
  optionalFacts: ['managementRights', 'dissolutionConditions', 'capitalContribution'],
  clauses: {
    requiredClauses: [
      'preamble',
      'business_purpose',
      'capital',
      'profit_sharing',
      'management_voting',
      'dissolution',
      'governing_law',
      'signatures'
    ],
    recommendedClauses: [
      'banking_accounts',
      'retirement_expulsion',
      'dispute_arbitration'
    ],
    conditionalClauses: [
      {
        clauseKey: 'non_compete_partner',
        conditionField: 'restrictPartnerOutsideBusiness',
        conditionValue: true,
        reason: 'Partners agree not to engage in competing business during partnership pursuant to Section 11(2) of Indian Partnership Act 1932.'
      }
    ],
    optionalClauses: [
      'goodwill_valuation',
      'admission_new_partners'
    ]
  },
  clauseDependencies: {
    profit_sharing: ['capital'],
    dissolution: ['business_purpose']
  },
  validationRules: [
    {
      id: 'val_prt_names',
      name: 'Partner Names',
      description: 'At least two distinct partner legal names must be provided.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'parties'
    },
    {
      id: 'val_prt_ratio',
      name: 'Profit Sharing Ratio',
      description: 'Profit and loss allocation ratio must be defined.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'profitSharingRatio'
    },
    {
      id: 'val_prt_firm',
      name: 'Partnership Firm Name',
      description: 'Trade name of the partnership firm must be specified.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'HIGH',
      fieldOrClause: 'businessName'
    }
  ],
  riskRules: [
    {
      id: 'risk_unregistered_firm',
      name: 'Unregistered Partnership Firm Disability',
      description: 'Under Section 69 of Indian Partnership Act 1932, an unregistered firm cannot file suits in court to enforce contractual rights against third parties.',
      triggerCondition: 'firmRegistration == false',
      riskLevel: 'HIGH',
      suggestedResolution: 'Advise registration of the partnership deed with Registrar of Firms (ROF).'
    },
    {
      id: 'risk_silent_dissolution',
      name: 'Partnership at Will Vulnerability',
      description: 'Without a fixed duration or notice covenant, any partner may dissolve the firm at will under Section 43 of Indian Partnership Act 1932.',
      triggerCondition: 'fixedTermDuration == null',
      riskLevel: 'MEDIUM',
      suggestedResolution: 'Specify minimum notice period (e.g. 90 days in writing) before unilateral retirement or dissolution.'
    }
  ]
};

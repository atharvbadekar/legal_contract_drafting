import { ContractTypeConfig } from './contract_type_base.js';

export const serviceConfig: ContractTypeConfig = {
  code: 'SERVICE',
  name: 'Master Services Agreement',
  description: 'Commercial contract governing the provision of professional engineering, IT, or corporate services, deliverables, and payment terms.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'Tool',
  color: 'purple',
  category: 'COMMERCIAL',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Title & Preamble', description: 'Identification of Client and Service Provider', required: true, order: 1 },
    { categoryKey: 'scope', name: 'Scope of Services', description: 'Defined deliverables, tasks, and standards', required: true, order: 2 },
    { categoryKey: 'deliverables', name: 'Deliverables & Acceptance', description: 'Inspection criteria and acceptance window', required: true, order: 3 },
    { categoryKey: 'fees', name: 'Fees & Payment Terms', description: 'Commercial rates, invoicing, and tax treatment', required: true, order: 4 },
    { categoryKey: 'term_termination', name: 'Term & Termination', description: 'Duration, termination for cause or convenience', required: true, order: 5 },
    { categoryKey: 'ip_ownership', name: 'Intellectual Property Rights', description: 'Assignment of deliverables vs pre-existing IP', required: true, order: 6 },
    { categoryKey: 'confidentiality', name: 'Confidentiality', description: 'Protection of proprietary corporate disclosures', required: true, order: 7 },
    { categoryKey: 'warranties', name: 'Warranties & Disclaimers', description: 'Professional standard of service warranty', required: true, order: 8 },
    { categoryKey: 'liability', name: 'Limitation of Liability', description: 'Liability cap and consequential loss disclaimer', required: true, order: 9 },
    { categoryKey: 'governing_law', name: 'Governing Law & Dispute Resolution', description: 'Applicable law, courts, or arbitration', required: true, order: 10 },
    { categoryKey: 'signatures', name: 'Execution & Signatures', description: 'Signatory lines for both corporate entities', required: true, order: 11 },
  ],
  questionnaire: [
    { key: 'client.name', label: 'Client Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Financial Corp', section: 'Parties' },
    { key: 'client.address', label: 'Client Registered Office', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'serviceProvider.name', label: 'Service Provider Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. CloudMatrix Technologies LLP', section: 'Parties' },
    { key: 'serviceProvider.address', label: 'Service Provider Registered Office', type: 'text', required: 'RECOMMENDED', section: 'Parties' },

    { key: 'scopeOfServices', label: 'Scope of Services', type: 'textarea', required: 'REQUIRED', placeholder: 'Detailed description of engineering, design, or operational services...', defaultValue: 'Software architecture design, microservices backend implementation, and cloud deployment integration services', section: 'Services' },
    { key: 'deliverables', label: 'Key Deliverables', type: 'textarea', required: 'RECOMMENDED', placeholder: 'Milestones and output artifacts...', defaultValue: 'Source code repository, API documentation, deployment automation scripts, and user acceptance reports', section: 'Services' },

    { key: 'fees', label: 'Total Service Fee / Consideration Amount', type: 'text', required: 'REQUIRED', placeholder: 'e.g. 50,000 or 1,500,000', defaultValue: '50000', section: 'Commercials' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'INR', label: 'INR (₹)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }], section: 'Commercials' },
    { key: 'paymentSchedule', label: 'Payment Schedule', type: 'select', required: 'RECOMMENDED', defaultValue: 'milestone-based', options: [{ value: 'milestone-based', label: 'Milestone-Based (Upon Acceptance)' }, { value: 'monthly-in-arrears', label: 'Monthly in Arrears' }, { value: '50-upfront-50-completion', label: '50% Upfront, 50% on Completion' }], section: 'Commercials' },
    { key: 'invoicePaymentDays', label: 'Invoice Payment Period', type: 'select', required: 'OPTIONAL', defaultValue: '30', options: [{ value: '15', label: '15 Days' }, { value: '30', label: '30 Days (Net 30)' }, { value: '45', label: '45 Days' }], section: 'Commercials' },

    { key: 'commencementDate', label: 'Services Commencement Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'duration', label: 'Term Duration', type: 'text', required: 'RECOMMENDED', defaultValue: '1 year', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' },
  ],
  requiredFacts: ['client.name', 'serviceProvider.name', 'scopeOfServices', 'fees', 'commencementDate', 'governingLaw'],
  optionalFacts: ['deliverables', 'currency', 'duration', 'invoicePaymentDays'],
  clauses: {
    requiredClauses: [
      'preamble',
      'scope',
      'fees',
      'ip_ownership',
      'confidentiality',
      'liability',
      'term_termination',
      'governing_law',
      'signatures'
    ],
    recommendedClauses: [
      'deliverables',
      'warranties',
      'indemnification',
      'severability'
    ],
    conditionalClauses: [
      {
        clauseKey: 'service_level_agreement',
        conditionField: 'hasSla',
        conditionValue: true,
        reason: 'Uptime guarantees and service credit provisions requested by client.'
      }
    ],
    optionalClauses: [
      'force_majeure',
      'non_solicitation',
      'subcontracting'
    ]
  },
  clauseDependencies: {
    deliverables: ['scope'],
    liability: ['fees'],
    term_termination: ['commencementDate']
  },
  validationRules: [
    {
      id: 'val_svc_parties',
      name: 'Client & Service Provider Entities',
      description: 'Both client and service provider legal entities must be clearly defined.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'parties'
    },
    {
      id: 'val_svc_fees',
      name: 'Service Fees & Consideration',
      description: 'Definite commercial consideration must be specified.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'fees'
    },
    {
      id: 'val_svc_scope',
      name: 'Scope of Services',
      description: 'Professional scope of services cannot be empty or placeholder.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'HIGH',
      fieldOrClause: 'scopeOfServices'
    }
  ],
  riskRules: [
    {
      id: 'risk_uncapped_liability',
      name: 'Uncapped Service Provider Liability',
      description: 'Absence of an aggregate liability cap exposes service provider to unlimited damages.',
      triggerCondition: 'liabilityCap == none',
      riskLevel: 'CRITICAL',
      suggestedResolution: 'Cap aggregate liability to fees paid or payable in preceding 12 months.'
    },
    {
      id: 'risk_missing_ip_transfer',
      name: 'Ambiguous Deliverable IP Ownership',
      description: 'Failing to assign custom deliverables leaves copyright with the contractor under Section 17 Indian Copyright Act.',
      triggerCondition: 'ipOwnership == ambiguous',
      riskLevel: 'HIGH',
      suggestedResolution: 'Specify that custom deliverables belong to Client upon payment in full, while retaining Service Provider background tools.'
    }
  ]
};

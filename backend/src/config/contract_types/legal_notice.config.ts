import { ContractTypeConfig } from './contract_type_base.js';

export const legalNoticeConfig: ContractTypeConfig = {
  code: 'LEGAL_NOTICE',
  name: 'Formal Legal Demand Notice',
  description: 'Statutory and commercial pre-litigation demand notice under Indian legal practice (Civil Procedure / Section 138 NI Act / Contract Act).',
  version: '1.0',
  jurisdiction: 'India',
  defaultJurisdiction: 'India',
  supportedJurisdictions: ['India'],
  icon: 'AlertTriangle',
  color: 'amber',
  category: 'LITIGATION',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'sender', name: 'Sender & Advocate Details', description: 'Sender party and legal counsel details', required: true, order: 1 },
    { categoryKey: 'recipient', name: 'Recipient Details', description: 'Addressee and registered legal address', required: true, order: 2 },
    { categoryKey: 'subject', name: 'Subject Line', description: 'Formal subject summary of claim and default', required: true, order: 3 },
    { categoryKey: 'background', name: 'Contractual Background', description: 'Origin of commercial relationship or transaction', required: true, order: 4 },
    { categoryKey: 'facts', name: 'Chronological Statement of Facts', description: 'Delivery, milestones, and invoice details', required: true, order: 5 },
    { categoryKey: 'breach', name: 'Breach & Actionable Default', description: 'Specific covenant or statutory non-performance', required: true, order: 6 },
    { categoryKey: 'legal_basis', name: 'Statutory & Contractual Basis', description: 'Sections under Indian Contract Act 1872 etc.', required: true, order: 7 },
    { categoryKey: 'demand', name: 'Quantified Monetary Demand', description: 'Exact principal sum, interest, and designated account', required: true, order: 8 },
    { categoryKey: 'response_period', name: 'Peremptory Response Period', description: 'Window for compliance (typically 15 days)', required: true, order: 9 },
    { categoryKey: 'consequences', name: 'Litigation Consequences', description: 'Civil recovery and commercial court proceedings', required: true, order: 10 },
    { categoryKey: 'closing', name: 'Closing Attestation', description: 'Office retention note and dispatch summary', required: true, order: 11 },
    { categoryKey: 'signatures', name: 'Advocate Signature & Seal', description: 'Counsel bar enrollment and execution', required: true, order: 12 }
  ],
  questionnaire: [
    { key: 'sender.name', label: 'Claimant / Client Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Industrial Solutions Pvt. Ltd.', section: 'Claimant' },
    { key: 'sender.address', label: 'Claimant Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Full registered office address', section: 'Claimant' },
    { key: 'sender.advocate', label: 'Legal Counsel / Advocate Name', type: 'text', required: 'RECOMMENDED', defaultValue: 'Adv. Rajesh M. Joshi (High Court of Delhi)', section: 'Counsel' },
    { key: 'sender.enrollment', label: 'Bar Council Enrollment Number', type: 'text', required: 'OPTIONAL', defaultValue: 'D/1482/2014', section: 'Counsel' },
    
    { key: 'recipient.name', label: 'Defaulting Party / Recipient Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Bharat Logistics Enterprises LLP', section: 'Recipient' },
    { key: 'recipient.address', label: 'Recipient Address', type: 'text', required: 'REQUIRED', placeholder: 'Official address where notice will be served', section: 'Recipient' },

    { key: 'subject', label: 'Notice Subject Summary', type: 'text', required: 'REQUIRED', defaultValue: 'Legal Notice for Recovery of Outstanding Dues and Breach of Contract', section: 'Notice Details' },
    { key: 'facts', label: 'Chronology & Invoice Particulars', type: 'textarea', required: 'REQUIRED', placeholder: 'Narrate invoices, delivery dates, and formal reminders...', section: 'Notice Details' },
    { key: 'breach', label: 'Nature of Default', type: 'textarea', required: 'REQUIRED', placeholder: 'Specify failure to remit payments or repudiation of contract...', section: 'Notice Details' },

    { key: 'amount', label: 'Outstanding Demand Amount', type: 'text', required: 'REQUIRED', placeholder: 'e.g. 5,00,000', section: 'Financial Terms' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'INR', options: [{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }], section: 'Financial Terms' },
    { key: 'interestRate', label: 'Claimed Interest Rate (% per annum)', type: 'select', required: 'RECOMMENDED', defaultValue: '18% per annum', options: [{ value: '18% per annum', label: '18% p.a. (Commercial Standard)' }, { value: '24% per annum', label: '24% p.a.' }, { value: 'none', label: 'No Interest' }], section: 'Financial Terms' },

    { key: 'responsePeriod', label: 'Compliance Window', type: 'select', required: 'REQUIRED', defaultValue: '15 days', options: [{ value: '15 days', label: '15 Days (Standard)' }, { value: '30 days', label: '30 Days' }, { value: '7 days', label: '7 Days (Urgent)' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Statutory Jurisdiction', type: 'text', required: 'REQUIRED', defaultValue: 'Indian Contract Act, 1872 & Commercial Courts Act, 2015', section: 'Terms' },
  ],
  requiredFacts: ['sender.name', 'recipient.name', 'amount', 'responsePeriod', 'breach'],
  optionalFacts: ['sender.address', 'sender.advocate', 'interestRate', 'recipient.address'],
  clauses: {
    requiredClauses: [
      'sender',
      'recipient',
      'subject',
      'background',
      'facts',
      'breach',
      'legal_basis',
      'demand',
      'response_period',
      'consequences',
      'signatures'
    ],
    recommendedClauses: [
      'interest_claim',
      'closing'
    ],
    conditionalClauses: [
      {
        clauseKey: 'interest_claim_clause',
        conditionField: 'interestRate',
        conditionValue: '18% per annum',
        reason: 'Claimant has demanded commercial pre-suit interest.'
      }
    ],
    optionalClauses: [
      'without_prejudice_reservation',
      'courier_tracking_note'
    ]
  },
  clauseDependencies: {
    demand: ['breach', 'facts'],
    consequences: ['response_period', 'demand']
  },
  validationRules: [
    {
      id: 'val_notice_amount',
      name: 'Definite Monetary Claim',
      description: 'A pre-litigation demand notice must state the quantified claim amount without ambiguity.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'amount'
    },
    {
      id: 'val_notice_period',
      name: 'Statutory Response Window',
      description: 'Must provide a definite notice period (15 or 30 days) before initiating litigation.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'responsePeriod'
    }
  ],
  riskRules: [
    {
      id: 'risk_missing_cure_window',
      name: 'Unreasonable Response Window',
      description: 'Notice periods shorter than 7 days may be deemed deficient in commercial courts.',
      triggerCondition: 'responsePeriod < 7 days',
      riskLevel: 'HIGH',
      suggestedResolution: 'Set compliance period to standard 15 days.'
    }
  ]
};

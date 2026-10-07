import { ContractTypeConfig } from './contract_type_base.js';

export const leaseConfig: ContractTypeConfig = {
  code: 'LEASE',
  name: 'Residential / Commercial Lease',
  description: 'Real estate lease and tenancy agreement outlining premises description, monthly rent, security deposit, and covenants.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'Home',
  color: 'emerald',
  category: 'PROPERTY',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Landlord and Tenant identification', required: true, order: 1 },
    { categoryKey: 'premises', name: 'Leased Premises', description: 'Property address and designated area', required: true, order: 2 },
    { categoryKey: 'rent_deposit', name: 'Rent & Security Deposit', description: 'Monthly payment, due date, deposit refund', required: true, order: 3 },
  ],
  questionnaire: [
    { key: 'landlord.name', label: 'Landlord / Lessor Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'tenant.name', label: 'Tenant / Lessee Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'propertyAddress', label: 'Demised Premises Address', type: 'textarea', required: 'REQUIRED', section: 'Premises' },
    { key: 'monthlyRent', label: 'Monthly Rent Amount', type: 'text', required: 'REQUIRED', section: 'Financials' },
    { key: 'securityDeposit', label: 'Interest-Free Refundable Security Deposit', type: 'text', required: 'REQUIRED', section: 'Financials' },
    { key: 'leaseTerm', label: 'Lease Duration / Term', type: 'text', required: 'RECOMMENDED', defaultValue: '11 months', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law & Jurisdiction', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India (Transfer of Property Act, 1882)', section: 'Terms' },
  ],
  requiredFacts: ['landlord.name', 'tenant.name', 'propertyAddress', 'monthlyRent', 'securityDeposit', 'governingLaw'],
  optionalFacts: ['commencementDate', 'maintenanceCharges', 'leaseTerm'],
  clauses: {
    requiredClauses: [
      'preamble',
      'premises',
      'rent_deposit',
      'maintenance_utilities',
      'termination_vacation',
      'governing_law',
      'signatures'
    ],
    recommendedClauses: [
      'lock_in_period',
      'inspection_rights',
      'severability'
    ],
    conditionalClauses: [
      {
        clauseKey: 'subletting_restriction',
        conditionField: 'allowSubletting',
        conditionValue: false,
        reason: 'Strict prohibition on subletting without prior written consent of lessor.'
      }
    ],
    optionalClauses: [
      'parking_space',
      'pet_policy'
    ]
  },
  clauseDependencies: {
    rent_deposit: ['premises'],
    termination_vacation: ['leaseTerm']
  },
  validationRules: [
    {
      id: 'val_lse_parties',
      name: 'Lessor & Lessee Names',
      description: 'Both landlord and tenant names must be provided.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'parties'
    },
    {
      id: 'val_lse_rent',
      name: 'Monthly Rent Amount',
      description: 'Monthly rent must be explicitly specified.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'monthlyRent'
    },
    {
      id: 'val_lse_deposit',
      name: 'Security Deposit Terms',
      description: 'Security deposit amount and refund conditions must be defined.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'HIGH',
      fieldOrClause: 'securityDeposit'
    }
  ],
  riskRules: [
    {
      id: 'risk_unregistered_lease_over_year',
      name: 'Compulsory Registration Risk (Over 11 Months)',
      description: 'Leases exceeding 11 months require mandatory registration under Section 17 of Registration Act 1908 and Transfer of Property Act 1882.',
      triggerCondition: 'leaseTermMonths > 11',
      riskLevel: 'HIGH',
      suggestedResolution: 'Ensure lease is executed as an 11-month Leave & License agreement or registered formally before sub-registrar.'
    },
    {
      id: 'risk_missing_deposit_refund',
      name: 'Vague Deposit Refund Timeline',
      description: 'Failure to specify a timeline for deposit refund leads to tenant disputes upon handover.',
      triggerCondition: 'depositRefundDays == null',
      riskLevel: 'MEDIUM',
      suggestedResolution: 'Specify security deposit refund within 15 to 30 days of vacant possession handover.'
    }
  ]
};

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
  ],
  requiredFacts: ['landlord.name', 'tenant.name', 'propertyAddress', 'monthlyRent', 'securityDeposit'],
  optionalFacts: ['commencementDate', 'maintenanceCharges']
};

import { ContractTypeConfig } from './contract_type_base.js';

export const saasConfig: ContractTypeConfig = {
  code: 'SAAS',
  name: 'SaaS Subscription Agreement',
  description: 'Software-as-a-Service customer subscription agreement covering cloud licensing, SLA uptime, data processing, and subscription renewals.',
  version: '1.0',
  jurisdiction: 'United States',
  icon: 'Cloud',
  color: 'indigo',
  category: 'TECHNOLOGY',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Provider and Customer identification', required: true, order: 1 },
    { categoryKey: 'license_grant', name: 'Subscription & License Grant', description: 'Non-exclusive cloud access rights', required: true, order: 2 },
    { categoryKey: 'sla', name: 'Service Level Agreement (SLA)', description: 'Target system uptime and scheduled maintenance', required: true, order: 3 },
    { categoryKey: 'fees_billing', name: 'Subscription Fees & Billing', description: 'Recurring billing cycle and fee adjustments', required: true, order: 4 },
    { categoryKey: 'data_protection', name: 'Data Security & Ownership', description: 'Customer data sovereignty and encryption standards', required: true, order: 5 },
    { categoryKey: 'term_renewal', name: 'Subscription Term & Renewal', description: 'Initial term, auto-renewal, and non-renewal notice', required: true, order: 6 },
    { categoryKey: 'liability', name: 'Limitation of Liability', description: 'Annual fee cap on liability', required: true, order: 7 },
    { categoryKey: 'governing_law', name: 'Governing Law', description: 'Jurisdiction and courts', required: true, order: 8 },
    { categoryKey: 'signatures', name: 'Signatures', description: 'Execution blocks', required: true, order: 9 },
  ],
  questionnaire: [
    { key: 'provider.name', label: 'SaaS Provider Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Mira Cloud Technologies Inc.', section: 'Parties' },
    { key: 'provider.address', label: 'Provider Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'customer.name', label: 'Customer Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Enterprise Retailers LLC', section: 'Parties' },
    { key: 'customer.address', label: 'Customer Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },

    { key: 'productName', label: 'SaaS Platform / Product Name', type: 'text', required: 'REQUIRED', defaultValue: 'Mira Legal AI Suite', section: 'Subscription' },
    { key: 'subscriptionFee', label: 'Recurring Subscription Fee Amount', type: 'text', required: 'REQUIRED', defaultValue: '12000', section: 'Subscription' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }, { value: 'INR', label: 'INR (₹)' }], section: 'Subscription' },
    { key: 'billingCycle', label: 'Billing Cycle', type: 'select', required: 'RECOMMENDED', defaultValue: 'Annual', options: [{ value: 'Monthly', label: 'Monthly' }, { value: 'Quarterly', label: 'Quarterly' }, { value: 'Annual', label: 'Annual (Upfront)' }], section: 'Subscription' },

    { key: 'startDate', label: 'Subscription Start Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'initialTerm', label: 'Initial Subscription Period', type: 'select', required: 'RECOMMENDED', defaultValue: '1 year', options: [{ value: '1 year', label: '1 Year' }, { value: '2 years', label: '2 Years' }, { value: '3 years', label: '3 Years' }], section: 'Terms' },
    { key: 'uptimeSLA', label: 'Target System Availability SLA', type: 'select', required: 'RECOMMENDED', defaultValue: '99.9%', options: [{ value: '99.5%', label: '99.5%' }, { value: '99.9%', label: '99.9%' }, { value: '99.99%', label: '99.99%' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of Delaware', section: 'Terms' },
  ],
  requiredFacts: ['provider.name', 'customer.name', 'productName', 'subscriptionFee', 'startDate', 'governingLaw'],
  optionalFacts: ['currency', 'billingCycle', 'initialTerm', 'uptimeSLA']
};

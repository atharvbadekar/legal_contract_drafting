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
  ],
  requiredFacts: ['partner1.name', 'partner2.name', 'businessName', 'profitSharingRatio'],
  optionalFacts: ['managementRights', 'dissolutionConditions']
};

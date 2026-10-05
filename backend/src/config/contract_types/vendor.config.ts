import { ContractTypeConfig } from './contract_type_base.js';

export const vendorConfig: ContractTypeConfig = {
  code: 'VENDOR',
  name: 'Vendor & Supply Agreement',
  description: 'Procurement agreement governing purchase orders, goods/hardware delivery, specifications, warranties, and supplier liabilities.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'Package',
  color: 'gray',
  category: 'COMMERCIAL',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Buyer and Vendor identification', required: true, order: 1 },
    { categoryKey: 'products', name: 'Product Specifications & Orders', description: 'Procurement specs and purchase order process', required: true, order: 2 },
    { categoryKey: 'pricing', name: 'Pricing & Payment Terms', description: 'Price schedules, taxes, and invoicing', required: true, order: 3 },
    { categoryKey: 'warranties', name: 'Quality Warranties', description: 'Defect replacement and conformance', required: true, order: 4 },
  ],
  questionnaire: [
    { key: 'buyer.name', label: 'Buyer Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'vendor.name', label: 'Vendor Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'description', label: 'Goods / Products Description', type: 'textarea', required: 'REQUIRED', section: 'Products' },
    { key: 'price', label: 'Procurement Price', type: 'text', required: 'REQUIRED', section: 'Commercials' },
  ],
  requiredFacts: ['buyer.name', 'vendor.name', 'description', 'price'],
  optionalFacts: ['specifications', 'deliveryTerms']
};

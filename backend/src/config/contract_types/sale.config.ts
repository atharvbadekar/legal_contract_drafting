import { ContractTypeConfig } from './contract_type_base.js';

export const saleConfig: ContractTypeConfig = {
  code: 'SALE_AGREEMENT',
  name: 'Sale of Goods / Commercial Supply Agreement',
  description: 'Commercial contract governing the purchase, sale, inspection, warranties, and delivery of goods under the Sale of Goods Act, 1930 / UCC Article 2.',
  version: '1.0',
  jurisdiction: 'India',
  defaultJurisdiction: 'India',
  supportedJurisdictions: ['India', 'United States', 'United Kingdom', 'Singapore'],
  icon: 'Building2',
  color: 'emerald',
  category: 'COMMERCIAL',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Title & Preamble', description: 'Agreement effective date and formal recitals', required: true, order: 1 },
    { categoryKey: 'parties', name: 'Buyer & Seller', description: 'Legal corporate identities and addresses', required: true, order: 2 },
    { categoryKey: 'goods_specs', name: 'Goods & Technical Specifications', description: 'Description, quantity, quality standards, and tolerances', required: true, order: 3 },
    { categoryKey: 'pricing_payment', name: 'Purchase Price & Payment Terms', description: 'Unit pricing, taxes, invoices, and credit window', required: true, order: 4 },
    { categoryKey: 'delivery_title', name: 'Delivery, Risk of Loss & Title', description: 'Incoterms, shipping location, transfer of property in goods', required: true, order: 5 },
    { categoryKey: 'inspection', name: 'Inspection & Rejection Rights', description: 'Testing, defect notification window, and return procedures', required: true, order: 6 },
    { categoryKey: 'warranties', name: 'Warranties & Conformity', description: 'Merchantability, fitness for purpose, and warranty duration', required: true, order: 7 },
    { categoryKey: 'liability', name: 'Limitation of Liability', description: 'Aggregate liability cap and exclusion of indirect damages', required: true, order: 8 },
    { categoryKey: 'governing_law', name: 'Governing Law & Dispute Resolution', description: 'Substantive law (Sale of Goods Act, 1872/1930) and forum', required: true, order: 9 },
    { categoryKey: 'signatures', name: 'Execution & Signatures', description: 'Authorized corporate officer execution blocks', required: true, order: 10 }
  ],
  questionnaire: [
    { key: 'seller.name', label: 'Seller Legal Corporate Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Precision Manufacturing Pvt. Ltd.', section: 'Parties' },
    { key: 'seller.address', label: 'Seller Registered Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Factory or registered corporate address', section: 'Parties' },
    { key: 'seller.signatory', label: 'Seller Signatory Name & Title', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. Anil Kumar, Director', section: 'Parties' },

    { key: 'buyer.name', label: 'Buyer Legal Corporate Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Industrial Systems Inc.', section: 'Parties' },
    { key: 'buyer.address', label: 'Buyer Registered Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Registered office or receiving warehouse address', section: 'Parties' },
    { key: 'buyer.signatory', label: 'Buyer Signatory Name & Title', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. Sandra Hayes, Head of Procurement', section: 'Parties' },

    { key: 'goodsDescription', label: 'Description of Goods & Specifications', type: 'textarea', required: 'REQUIRED', placeholder: 'Specify products, unit quantities, technical standards...', defaultValue: 'High-precision industrial hardware components conforming to ISO 9001 standards', section: 'Product' },
    
    { key: 'totalPrice', label: 'Total Purchase Price / Order Value', type: 'text', required: 'REQUIRED', placeholder: 'e.g. 15,00,000', section: 'Commercial' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'INR', options: [{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Commercial' },
    { key: 'paymentTermsDays', label: 'Payment Credit Period (Days)', type: 'select', required: 'REQUIRED', defaultValue: '30 days', options: [{ value: '30 days', label: 'Net 30 Days' }, { value: '45 days', label: 'Net 45 Days' }, { value: '15 days', label: 'Net 15 Days' }, { value: 'advance', label: '100% Advance Payment' }], section: 'Commercial' },

    { key: 'deliveryLocation', label: 'Delivery Destination / Port', type: 'text', required: 'REQUIRED', defaultValue: 'Buyer Central Warehouse, Dock 3', section: 'Logistics' },
    { key: 'deliveryTerms', label: 'Shipping Incoterms (2020)', type: 'select', required: 'REQUIRED', defaultValue: 'DDP (Delivered Duty Paid)', options: [{ value: 'DDP', label: 'DDP (Delivered Duty Paid)' }, { value: 'FOB', label: 'FOB (Free on Board)' }, { value: 'CIF', label: 'CIF (Cost, Insurance, Freight)' }, { value: 'EXW', label: 'EXW (Ex Works)' }], section: 'Logistics' },
    
    { key: 'inspectionDays', label: 'Inspection Window (Days)', type: 'select', required: 'RECOMMENDED', defaultValue: '10 business days', options: [{ value: '10 business days', label: '10 Business Days' }, { value: '14 days', label: '14 Days' }, { value: '7 days', label: '7 Days' }], section: 'Quality' },
    { key: 'warrantyMonths', label: 'Warranty Duration (Months)', type: 'select', required: 'REQUIRED', defaultValue: '12 months', options: [{ value: '12 months', label: '12 Months (1 Year)' }, { value: '24 months', label: '24 Months (2 Years)' }, { value: '6 months', label: '6 Months' }], section: 'Quality' },

    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: 'REQUIRED', section: 'Legal' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Sale of Goods Act, 1930 & Laws of India', section: 'Legal' },
  ],
  requiredFacts: ['seller.name', 'buyer.name', 'goodsDescription', 'totalPrice', 'effectiveDate', 'governingLaw'],
  optionalFacts: ['seller.address', 'buyer.address', 'deliveryTerms', 'inspectionDays', 'warrantyMonths'],
  clauses: {
    requiredClauses: [
      'preamble',
      'parties',
      'goods_specs',
      'pricing_payment',
      'delivery_title',
      'inspection',
      'warranties',
      'liability',
      'governing_law',
      'signatures'
    ],
    recommendedClauses: [
      'force_majeure',
      'title_retention',
      'severability'
    ],
    conditionalClauses: [
      {
        clauseKey: 'title_retention_clause',
        conditionField: 'paymentTermsDays',
        conditionValue: '30 days',
        reason: 'Credit sales require Romalpa title retention until full payment.'
      }
    ],
    optionalClauses: [
      'arbitration_venue',
      'counterparts'
    ]
  },
  clauseDependencies: {
    inspection: ['goods_specs', 'delivery_title'],
    warranties: ['inspection'],
    liability: ['warranties']
  },
  validationRules: [
    {
      id: 'val_sale_price',
      name: 'Consideration Specified',
      description: 'Under Sale of Goods law, valid contracts of sale require agreed monetary consideration or price-fixing formula.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'totalPrice'
    },
    {
      id: 'val_sale_goods',
      name: 'Ascertained Goods Description',
      description: 'Goods must be clearly identified and specified.',
      ruleType: 'FIELD_PRESENCE',
      severity: 'CRITICAL',
      fieldOrClause: 'goodsDescription'
    }
  ],
  riskRules: [
    {
      id: 'risk_uncapped_goods_liability',
      name: 'Uncapped Consequential Damages',
      description: 'Defective goods exposure without limitation cap creates existential liability.',
      triggerCondition: 'aggregate_cap == missing',
      riskLevel: 'HIGH',
      suggestedResolution: 'Limit aggregate liability to 100% of purchase price paid.'
    }
  ]
};

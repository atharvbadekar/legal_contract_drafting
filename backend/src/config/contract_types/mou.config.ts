import { ContractTypeConfig } from './contract_type_base.js';

export const mouConfig: ContractTypeConfig = {
  code: 'MOU',
  name: 'Memorandum of Understanding',
  description: 'Formal statement of intent documenting the preliminary terms of collaboration and shared objectives between two organizations.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'Handshake',
  color: 'teal',
  category: 'PARTNERSHIP',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Identification of collaborating institutions', required: true, order: 1 },
    { categoryKey: 'purpose', name: 'Purpose & Objectives', description: 'Collaborative mission and intended outcomes', required: true, order: 2 },
    { categoryKey: 'scope', name: 'Scope of Cooperation', description: 'Joint initiatives, resource sharing, and events', required: true, order: 3 },
    { categoryKey: 'roles', name: 'Roles & Responsibilities', description: 'Division of tasks between parties', required: true, order: 4 },
    { categoryKey: 'non_binding_nature', name: 'Legal Status of MOU', description: 'Non-binding understanding except confidentiality and governing law', required: true, order: 5 },
    { categoryKey: 'term_termination', name: 'Term & Termination', description: 'Duration and mutual right to withdraw', required: true, order: 6 },
    { categoryKey: 'governing_law', name: 'Governing Law', description: 'Applicable law and amicable dispute resolution', required: true, order: 7 },
    { categoryKey: 'signatures', name: 'Signatures', description: 'Signatory lines for both representatives', required: true, order: 8 },
  ],
  questionnaire: [
    { key: 'partyA.name', label: 'First Institution / Party A Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Institute of Legal Innovation', section: 'Parties' },
    { key: 'partyA.address', label: 'Party A Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'partyB.name', label: 'Second Institution / Party B Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. National Bar Council Foundation', section: 'Parties' },
    { key: 'partyB.address', label: 'Party B Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },

    { key: 'purpose', label: 'Purpose of Collaboration', type: 'textarea', required: 'REQUIRED', defaultValue: 'Joint research in legal technology automation, AI contract analytics, and educational seminars for legal practitioners.', section: 'Objectives' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'term', label: 'MOU Duration', type: 'text', required: 'RECOMMENDED', defaultValue: '2 years', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' },
  ],
  requiredFacts: ['partyA.name', 'partyB.name', 'purpose', 'effectiveDate', 'governingLaw'],
  optionalFacts: ['term', 'partyA.address', 'partyB.address']
};

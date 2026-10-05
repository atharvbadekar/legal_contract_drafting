import { ContractTypeConfig } from './contract_type_base.js';

export const internshipConfig: ContractTypeConfig = {
  code: 'INTERNSHIP',
  name: 'Internship Agreement',
  description: 'Short-term training agreement defining internship learning objectives, stipend, intellectual property, and duration.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'GraduationCap',
  color: 'cyan',
  category: 'HUMAN_RESOURCES',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Preamble', description: 'Organization and Intern identification', required: true, order: 1 },
    { categoryKey: 'scope', name: 'Training Objectives', description: 'Learning curriculum and department placement', required: true, order: 2 },
    { categoryKey: 'stipend', name: 'Stipend & Hours', description: 'Monthly allowance and working hours', required: true, order: 3 },
  ],
  questionnaire: [
    { key: 'organization.name', label: 'Company / Organization Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'intern.name', label: 'Intern Full Legal Name', type: 'text', required: 'REQUIRED', section: 'Parties' },
    { key: 'duration', label: 'Internship Duration', type: 'text', required: 'REQUIRED', placeholder: 'e.g. 3 months', section: 'Terms' },
    { key: 'stipend', label: 'Monthly Stipend Amount', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. 25,000', section: 'Terms' },
  ],
  requiredFacts: ['organization.name', 'intern.name', 'duration'],
  optionalFacts: ['stipend', 'supervisor']
};

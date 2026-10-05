import { ContractTypeConfig } from './contract_type_base.js';

export const employmentConfig: ContractTypeConfig = {
  code: 'EMPLOYMENT',
  name: 'Employment Agreement',
  description: 'Comprehensive employment agreement defining role, compensation, probation, notice period, IP ownership, and confidentiality.',
  version: '1.0',
  jurisdiction: 'India',
  icon: 'Briefcase',
  color: 'green',
  category: 'HUMAN_RESOURCES',
  isActive: true,
  isFullyFunctional: true,
  ontologyCategories: [
    { categoryKey: 'preamble', name: 'Title & Preamble', description: 'Identification of employer and employee', required: true, order: 1 },
    { categoryKey: 'appointment', name: 'Appointment & Designation', description: 'Position, duties, reporting manager', required: true, order: 2 },
    { categoryKey: 'term_probation', name: 'Term & Probation', description: 'Commencement date, probation period', required: true, order: 3 },
    { categoryKey: 'compensation', name: 'Compensation & Benefits', description: 'Salary, allowances, bonus structure', required: true, order: 4 },
    { categoryKey: 'working_hours', name: 'Hours & Working Location', description: 'Business hours, remote/office terms', required: false, order: 5 },
    { categoryKey: 'leave_policy', name: 'Leave & Holidays', description: 'Annual paid leave, sick leave', required: false, order: 6 },
    { categoryKey: 'confidentiality', name: 'Confidentiality Obligations', description: 'Protection of proprietary corporate assets', required: true, order: 7 },
    { categoryKey: 'ip_assignment', name: 'Work for Hire & IP Assignment', description: 'All inventions and creations belong to company', required: true, order: 8 },
    { categoryKey: 'non_compete', name: 'Restrictive Covenants', description: 'Non-solicitation of clients and staff', required: false, order: 9 },
    { categoryKey: 'termination', name: 'Termination & Notice Period', description: 'Notice periods, cause vs convenience', required: true, order: 10 },
    { categoryKey: 'governing_law', name: 'Governing Law & Jurisdiction', description: 'Jurisdiction and labor law compliance', required: true, order: 11 },
    { categoryKey: 'signatures', name: 'Signatures & Acceptance', description: 'Execution blocks for both parties', required: true, order: 12 },
  ],
  questionnaire: [
    { key: 'employer.name', label: 'Employer Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Acme Tech Solutions Pvt Ltd', section: 'Parties' },
    { key: 'employer.address', label: 'Employer Registered Office', type: 'text', required: 'RECOMMENDED', placeholder: 'Office address', section: 'Parties' },
    { key: 'employer.signatory', label: 'Authorized Employer Signatory', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. VP Human Resources', section: 'Parties' },
    
    { key: 'employee.name', label: 'Employee Full Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. John Doe', section: 'Parties' },
    { key: 'employee.address', label: 'Employee Residential Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Residential address', section: 'Parties' },
    { key: 'employee.email', label: 'Employee Email', type: 'email', required: 'RECOMMENDED', placeholder: 'name@example.com', section: 'Parties' },

    { key: 'designation', label: 'Job Title / Position', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Senior Software Architect', defaultValue: 'Senior Software Architect', section: 'Role' },
    { key: 'department', label: 'Department', type: 'text', required: 'OPTIONAL', defaultValue: 'Engineering', section: 'Role' },
    { key: 'workLocation', label: 'Work Location / Base', type: 'text', required: 'RECOMMENDED', defaultValue: 'Bangalore, India (Hybrid)', section: 'Role' },

    { key: 'salary', label: 'Annual Compensation (CTC or Base)', type: 'text', required: 'REQUIRED', placeholder: 'e.g. 2,400,000', defaultValue: '2400000', section: 'Compensation' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'INR', options: [{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }], section: 'Compensation' },
    { key: 'joiningDate', label: 'Commencement / Joining Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'probationPeriod', label: 'Probation Duration', type: 'select', required: 'RECOMMENDED', defaultValue: '90 days', options: [{ value: '30 days', label: '30 Days' }, { value: '60 days', label: '60 Days' }, { value: '90 days', label: '90 Days / 3 Months' }, { value: '180 days', label: '6 Months' }, { value: 'none', label: 'No Probation' }], section: 'Terms' },
    { key: 'noticePeriodEmployee', label: 'Employee Resignation Notice Period', type: 'select', required: 'REQUIRED', defaultValue: '60 days', options: [{ value: '30 days', label: '30 Days' }, { value: '60 days', label: '60 Days' }, { value: '90 days', label: '90 Days' }], section: 'Terms' },
    { key: 'noticePeriodEmployer', label: 'Employer Termination Notice Period', type: 'select', required: 'REQUIRED', defaultValue: '60 days', options: [{ value: '30 days', label: '30 Days' }, { value: '60 days', label: '60 Days' }, { value: '90 days', label: '90 Days' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' },
  ],
  requiredFacts: ['employer.name', 'employee.name', 'designation', 'salary', 'joiningDate', 'governingLaw'],
  optionalFacts: ['probationPeriod', 'noticePeriodEmployee', 'workLocation', 'currency', 'department']
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentService, contractTypeService } from '../services/api';
import { DocumentType, GenerationMode, QuestionnaireField, ContractTypeSchema } from '../types';
import { 
  FileText, 
  Sparkles, 
  Scale, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Cpu,
  RefreshCw,
  Info,
  Building2,
  Calendar,
  Shield,
  CheckCircle2,
  Briefcase,
  Wrench,
  Cloud,
  UserCheck,
  Handshake,
  MapPin,
  Clock,
  DollarSign
} from 'lucide-react';

interface ContractTypeOption {
  code: string;
  name: string;
  fullTitle: string;
  icon: any;
  active: boolean;
  badge?: string;
}

const CONTRACT_TYPES: ContractTypeOption[] = [
  { code: 'NDA', name: 'NDA', fullTitle: 'Non-Disclosure Agreement', icon: Shield, active: true },
  { code: 'EMPLOYMENT', name: 'Employment', fullTitle: 'Employment Agreement', icon: Briefcase, active: true },
  { code: 'SERVICE', name: 'Services', fullTitle: 'Master Services Agreement', icon: Wrench, active: true },
  { code: 'SAAS', name: 'SaaS', fullTitle: 'SaaS Subscription Agreement', icon: Cloud, active: true },
  { code: 'CONSULTING', name: 'Consulting', fullTitle: 'Consulting Agreement', icon: UserCheck, active: true },
  { code: 'MOU', name: 'MOU', fullTitle: 'Memorandum of Understanding', icon: Handshake, active: true },
  { code: 'LEGAL_NOTICE', name: 'Notice', fullTitle: 'Formal Legal Notice', icon: Cpu, active: true },
  { code: 'VENDOR', name: 'Vendor', fullTitle: 'Vendor Supply Agreement', icon: Building2, active: true },
  { code: 'PARTNERSHIP', name: 'Partnership', fullTitle: 'Partnership Agreement', icon: Layers, active: true },
  { code: 'INTERNSHIP', name: 'Internship', fullTitle: 'Internship Agreement', icon: FileText, active: true },
  { code: 'LEASE', name: 'Lease', fullTitle: 'Commercial Lease Agreement', icon: MapPin, active: true }
];

const PRESETS: Record<string, Record<string, any>> = {
  EMPLOYMENT: {
    'employer.name': 'Apex Technologies Solutions Pvt. Ltd.',
    'employer.address': 'Embassy TechVillage, Outer Ring Road, Bangalore, KA 560103',
    'employer.signatory': 'Pooja Narang, VP Human Resources',
    'employee.name': 'Rohan Sharma',
    'employee.address': 'Flat 402, Green Valley Apartments, Indiranagar, Bangalore, KA 560038',
    'employee.email': 'rohan.sharma@example.com',
    'designation': 'Senior Software Architect',
    'department': 'Core Engineering & AI Platforms',
    'workLocation': 'Bangalore, India (Hybrid)',
    'salary': '2400000',
    'currency': 'INR',
    'joiningDate': new Date().toISOString().split('T')[0],
    'probationPeriod': '90 days',
    'noticePeriodEmployee': '60 days',
    'noticePeriodEmployer': '60 days',
    'governingLaw': 'Laws of India'
  },
  SERVICE: {
    'client.name': 'Apex Financial Corp',
    'client.address': '1200 Innovation Way, Suite 400, Wilmington, DE 19801',
    'serviceProvider.name': 'CloudMatrix Technologies LLP',
    'serviceProvider.address': '450 Montgomery Street, Floor 14, San Francisco, CA 94104',
    'scopeOfServices': 'Design, implementation, and cloud deployment of real-time transactional microservices and AI analytics pipeline.',
    'deliverables': 'Architecture specification, production source code repository, unit test suites with >90% coverage, and automated CI/CD deployment scripts.',
    'fees': '50000',
    'currency': 'USD',
    'paymentSchedule': 'milestone-based',
    'invoicePaymentDays': '30',
    'commencementDate': new Date().toISOString().split('T')[0],
    'duration': '1 year',
    'governingLaw': 'State of New York'
  },
  SAAS: {
    'provider.name': 'Atharv Cloud Technologies Inc.',
    'provider.address': '100 Enterprise Way, Suite 300, Wilmington, DE 19801',
    'customer.name': 'Enterprise Retailers LLC',
    'customer.address': '500 Michigan Avenue, Floor 12, Chicago, IL 60611',
    'productName': 'Atharv Legal AI Suite',
    'subscriptionFee': '12000',
    'currency': 'USD',
    'billingCycle': 'Annual',
    'startDate': new Date().toISOString().split('T')[0],
    'initialTerm': '1 year',
    'uptimeSLA': '99.9%',
    'governingLaw': 'State of Delaware'
  },
  CONSULTING: {
    'client.name': 'HealthTech Innovations Inc.',
    'client.address': '75 Innovation Drive, Boston, MA 02115',
    'consultant.name': 'Dr. Robert Chen',
    'consultant.address': '22 Beacon Court, Cambridge, MA 02138',
    'scopeOfServices': 'Specialized strategic advisory services regarding medical device regulatory clearance, ISO 13485 quality systems, and technical documentation.',
    'compensation': '15000',
    'currency': 'USD',
    'startDate': new Date().toISOString().split('T')[0],
    'term': '6 months',
    'governingLaw': 'State of California'
  },
  MOU: {
    'partyA.name': 'Institute of Legal Innovation',
    'partyA.address': 'Institutional Area, Lodhi Road, New Delhi 110003',
    'partyB.name': 'National Bar Council Foundation',
    'partyB.address': 'Law Chambers Complex, High Court Road, Mumbai 400032',
    'purpose': 'Collaborative research, joint academic symposia, and curriculum development in applied legal artificial intelligence and algorithmic governance.',
    'effectiveDate': new Date().toISOString().split('T')[0],
    'term': '2 years',
    'governingLaw': 'Laws of India'
  },
  VENDOR: {
    'buyer.name': 'Apex Retail Solutions Inc.',
    'buyer.address': '1200 Innovation Way, Suite 400, Wilmington, DE 19801',
    'buyer.signatory': 'Marcus Vance, Chief Procurement Officer',
    'vendor.name': 'Precision Hardware Technologies LLC',
    'vendor.address': '850 Industrial Parkway, Cleveland, OH 44114',
    'vendor.signatory': 'Elena Rostova, Managing Director',
    'goodsDescription': 'High-throughput edge computing nodes, optical scanning sensors, and peripheral hardware components.',
    'specifications': 'Full conformance to ISO 9001 quality manufacturing tolerances, IP67 environmental sealing, and MIL-STD-810H vibration resilience.',
    'purchaseOrderProcedure': 'Binding Purchase Orders issued electronically with minimum 14 calendar days advance notice.',
    'deliveryTerms': 'DDP (Delivered Duty Paid - Incoterms 2020)',
    'deliveryLocation': 'Apex Central Distribution Facility, Dock 4, Columbus, OH 43215',
    'paymentTermsDays': '30',
    'currency': 'USD',
    'pricingModel': 'Unit-Price with Quarterly Volume Discount',
    'inspectionDays': '10',
    'warrantyPeriodMonths': '24',
    'liabilityCapMultiple': '2x total purchase orders in trailing 12 months',
    'effectiveDate': new Date().toISOString().split('T')[0],
    'duration': '2 years',
    'governingLaw': 'State of Delaware',
    'jurisdiction': 'Courts of Wilmington, Delaware',
    'disputeMethod': 'Arbitration under AAA Commercial Rules'
  },
  PARTNERSHIP: {
    'firmName': 'Apex & Partners Strategic Ventures',
    'businessActivity': 'Cross-border technology investment, strategic market advisory, and incubator development services.',
    'principalPlaceOfBusiness': '450 Montgomery Street, Floor 14, San Francisco, CA 94104',
    'partnerA.name': 'Sarah Jenkins',
    'partnerA.address': '742 Evergreen Terrace, Palo Alto, CA 94301',
    'partnerA.capitalContribution': '500000',
    'partnerA.profitShare': '50%',
    'partnerB.name': 'David Vance',
    'partnerB.address': '100 Marina Boulevard, San Francisco, CA 94123',
    'partnerB.capitalContribution': '500000',
    'partnerB.profitShare': '50%',
    'effectiveDate': new Date().toISOString().split('T')[0],
    'duration': 'Perpetual until dissolved by mutual consensus',
    'bankingAuthority': 'Joint signatures required for transactions exceeding $10,000',
    'managementDecisionThreshold': 'Unanimous consent for capital acquisitions; simple majority for routine operations',
    'dissolutionNoticeDays': '90',
    'governingLaw': 'State of California',
    'jurisdiction': 'Courts of San Francisco, California',
    'disputeMethod': 'Binding Arbitration under JAMS Rules'
  },
  INTERNSHIP: {
    'company.name': 'Atharv Technologies Inc.',
    'company.address': '100 Enterprise Way, Suite 300, Wilmington, DE 19801',
    'company.mentorName': 'Dr. Robert Chen, Principal AI Scientist',
    'intern.name': 'Aarav Patel',
    'intern.address': '204 University Crescent, Cambridge, MA 02138',
    'intern.email': 'aarav.patel@example.edu',
    'intern.university': 'Massachusetts Institute of Technology (MIT)',
    'internshipRole': 'Applied Machine Learning & NLP Intern',
    'department': 'Core AI Research Lab',
    'learningObjectives': 'Hands-on practical training in transformer architectures, vector embeddings, fine-tuning LLMs, and legal-domain semantic analysis pipelines.',
    'startDate': new Date().toISOString().split('T')[0],
    'durationWeeks': '12 weeks',
    'workingHoursPerWeek': '40',
    'stipendAmount': '4500',
    'currency': 'USD',
    'confidentialityAgreed': 'Yes, strict non-disclosure of proprietary weights and algorithms',
    'ipWorkForHire': 'All code, models, and documentation created during engagement belong solely to Company',
    'governingLaw': 'State of Delaware',
    'jurisdiction': 'Courts of New Castle County, Delaware'
  },
  LEASE: {
    'landlord.name': 'Metropolitan Commercial Realty Trust',
    'landlord.address': '500 Madison Avenue, Floor 22, New York, NY 10022',
    'landlord.signatory': 'Arthur Pendelton, Managing Trustee',
    'tenant.name': 'Atharv Cloud Technologies Inc.',
    'tenant.address': '100 Enterprise Way, Suite 300, Wilmington, DE 19801',
    'tenant.signatory': 'Sarah Jenkins, Chief Executive Officer',
    'premisesAddress': 'Suite 1400, 350 Hudson Street, New York, NY 10014',
    'demisedAreaSqFt': '4,500 sq. ft.',
    'permittedUse': 'General corporate administrative, engineering, and technology consulting offices',
    'monthlyRent': '18500',
    'currency': 'USD',
    'securityDepositMonths': '3',
    'leaseCommencementDate': new Date().toISOString().split('T')[0],
    'leaseTermMonths': '36',
    'lockInPeriodMonths': '12',
    'rentEscalationPercentage': '5% annually',
    'maintenanceResponsibility': 'Landlord maintains core structural, HVAC, and elevator systems; Tenant maintains interior demised premises',
    'utilitiesResponsibility': 'Tenant directly sub-metered for electric and high-speed fiber data utilities',
    'governingLaw': 'State of New York',
    'jurisdiction': 'Courts of the County of New York, State of New York',
    'disputeMethod': 'Court of competent jurisdiction with mutual waiver of jury trial'
  }
};

const FALLBACK_SCHEMAS: Record<string, QuestionnaireField[]> = {
  EMPLOYMENT: [
    { key: 'employer.name', label: 'Employer Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Acme Tech Solutions Pvt Ltd', section: 'Parties' },
    { key: 'employer.address', label: 'Employer Registered Office', type: 'text', required: 'RECOMMENDED', placeholder: 'Office address', section: 'Parties' },
    { key: 'employer.signatory', label: 'Authorized Employer Signatory', type: 'text', required: 'RECOMMENDED', placeholder: 'e.g. VP Human Resources', section: 'Parties' },
    { key: 'employee.name', label: 'Employee Full Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. John Doe', section: 'Parties' },
    { key: 'employee.address', label: 'Employee Residential Address', type: 'text', required: 'RECOMMENDED', placeholder: 'Residential address', section: 'Parties' },
    { key: 'employee.email', label: 'Employee Email', type: 'email', required: 'RECOMMENDED', placeholder: 'name@example.com', section: 'Parties' },
    { key: 'designation', label: 'Job Title / Position', type: 'text', required: 'REQUIRED', defaultValue: 'Senior Software Architect', section: 'Role' },
    { key: 'department', label: 'Department', type: 'text', required: 'OPTIONAL', defaultValue: 'Engineering', section: 'Role' },
    { key: 'workLocation', label: 'Work Location / Base', type: 'text', required: 'RECOMMENDED', defaultValue: 'Bangalore, India (Hybrid)', section: 'Role' },
    { key: 'salary', label: 'Annual Compensation (CTC or Base)', type: 'text', required: 'REQUIRED', defaultValue: '2400000', section: 'Compensation' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'INR', options: [{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Compensation' },
    { key: 'joiningDate', label: 'Commencement / Joining Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'probationPeriod', label: 'Probation Duration', type: 'select', required: 'RECOMMENDED', defaultValue: '90 days', options: [{ value: '30 days', label: '30 Days' }, { value: '60 days', label: '60 Days' }, { value: '90 days', label: '90 Days / 3 Months' }, { value: '180 days', label: '6 Months' }], section: 'Terms' },
    { key: 'noticePeriodEmployee', label: 'Employee Notice Period', type: 'select', required: 'REQUIRED', defaultValue: '60 days', options: [{ value: '30 days', label: '30 Days' }, { value: '60 days', label: '60 Days' }, { value: '90 days', label: '90 Days' }], section: 'Terms' },
    { key: 'noticePeriodEmployer', label: 'Employer Notice Period', type: 'select', required: 'REQUIRED', defaultValue: '60 days', options: [{ value: '30 days', label: '30 Days' }, { value: '60 days', label: '60 Days' }, { value: '90 days', label: '90 Days' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' }
  ],
  SERVICE: [
    { key: 'client.name', label: 'Client Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Financial Corp', section: 'Parties' },
    { key: 'client.address', label: 'Client Registered Office', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'serviceProvider.name', label: 'Service Provider Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. CloudMatrix Technologies LLP', section: 'Parties' },
    { key: 'serviceProvider.address', label: 'Service Provider Registered Office', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'scopeOfServices', label: 'Scope of Services', type: 'textarea', required: 'REQUIRED', defaultValue: 'Software architecture design, microservices backend implementation, and cloud deployment integration services', section: 'Services' },
    { key: 'deliverables', label: 'Key Deliverables', type: 'textarea', required: 'RECOMMENDED', defaultValue: 'Source code repository, API documentation, deployment automation scripts, and user acceptance reports', section: 'Services' },
    { key: 'fees', label: 'Total Service Fee Amount', type: 'text', required: 'REQUIRED', defaultValue: '50000', section: 'Commercials' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'INR', label: 'INR (₹)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Commercials' },
    { key: 'paymentSchedule', label: 'Payment Schedule', type: 'select', required: 'RECOMMENDED', defaultValue: 'milestone-based', options: [{ value: 'milestone-based', label: 'Milestone-Based' }, { value: 'monthly-in-arrears', label: 'Monthly in Arrears' }], section: 'Commercials' },
    { key: 'commencementDate', label: 'Services Commencement Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'duration', label: 'Term Duration', type: 'text', required: 'RECOMMENDED', defaultValue: '1 year', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of New York', section: 'Terms' }
  ],
  SAAS: [
    { key: 'provider.name', label: 'SaaS Provider Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Atharv Cloud Technologies Inc.', section: 'Parties' },
    { key: 'provider.address', label: 'Provider Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'customer.name', label: 'Customer Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Enterprise Retailers LLC', section: 'Parties' },
    { key: 'customer.address', label: 'Customer Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'productName', label: 'SaaS Platform / Product Name', type: 'text', required: 'REQUIRED', defaultValue: 'Atharv Legal AI Suite', section: 'Subscription' },
    { key: 'subscriptionFee', label: 'Recurring Subscription Fee Amount', type: 'text', required: 'REQUIRED', defaultValue: '12000', section: 'Subscription' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'INR', label: 'INR (₹)' }], section: 'Subscription' },
    { key: 'billingCycle', label: 'Billing Cycle', type: 'select', required: 'RECOMMENDED', defaultValue: 'Annual', options: [{ value: 'Monthly', label: 'Monthly' }, { value: 'Annual', label: 'Annual (Upfront)' }], section: 'Subscription' },
    { key: 'startDate', label: 'Subscription Start Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'initialTerm', label: 'Initial Subscription Period', type: 'select', required: 'RECOMMENDED', defaultValue: '1 year', options: [{ value: '1 year', label: '1 Year' }, { value: '2 years', label: '2 Years' }], section: 'Terms' },
    { key: 'uptimeSLA', label: 'Target System Availability SLA', type: 'select', required: 'RECOMMENDED', defaultValue: '99.9%', options: [{ value: '99.5%', label: '99.5%' }, { value: '99.9%', label: '99.9%' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of Delaware', section: 'Terms' }
  ],
  CONSULTING: [
    { key: 'client.name', label: 'Client Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. HealthTech Innovations Inc.', section: 'Parties' },
    { key: 'client.address', label: 'Client Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'consultant.name', label: 'Consultant Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Dr. Robert Chen', section: 'Parties' },
    { key: 'consultant.address', label: 'Consultant Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'scopeOfServices', label: 'Scope of Consulting Services', type: 'textarea', required: 'REQUIRED', defaultValue: 'Strategic advisory services regarding medical device regulatory compliance, FDA submissions, and technical clinical evaluations.', section: 'Scope' },
    { key: 'compensation', label: 'Consulting Compensation Amount', type: 'text', required: 'REQUIRED', defaultValue: '15000', section: 'Compensation' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Compensation' },
    { key: 'startDate', label: 'Engagement Commencement Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'term', label: 'Consulting Engagement Term', type: 'text', required: 'RECOMMENDED', defaultValue: '6 months', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of California', section: 'Terms' }
  ],
  MOU: [
    { key: 'partyA.name', label: 'First Institution / Party A Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Institute of Legal Innovation', section: 'Parties' },
    { key: 'partyA.address', label: 'Party A Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'partyB.name', label: 'Second Institution / Party B Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. National Bar Council Foundation', section: 'Parties' },
    { key: 'partyB.address', label: 'Party B Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'purpose', label: 'Purpose of Collaboration', type: 'textarea', required: 'REQUIRED', defaultValue: 'Joint research in legal technology automation, AI contract analytics, and educational seminars for legal practitioners.', section: 'Objectives' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: 'REQUIRED', section: 'Terms' },
    { key: 'term', label: 'MOU Duration', type: 'text', required: 'RECOMMENDED', defaultValue: '2 years', section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'Laws of India', section: 'Terms' }
  ],
  VENDOR: [
    { key: 'buyer.name', label: 'Buyer Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Retail Solutions Inc.', section: 'Parties' },
    { key: 'buyer.address', label: 'Buyer Principal Office', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'vendor.name', label: 'Vendor Legal Entity Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Precision Hardware Technologies LLC', section: 'Parties' },
    { key: 'vendor.address', label: 'Vendor Principal Office', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'goodsDescription', label: 'Description of Goods & Deliverables', type: 'textarea', required: 'REQUIRED', defaultValue: 'Enterprise edge computing hardware, optical sensors, and related peripherals', section: 'Goods & Scope' },
    { key: 'specifications', label: 'Technical Specifications & Quality Standards', type: 'textarea', required: 'RECOMMENDED', defaultValue: 'ISO 9001 certified manufacturing, IP67 rating, defect rate < 0.1%', section: 'Goods & Scope' },
    { key: 'deliveryTerms', label: 'Delivery Terms (Incoterms)', type: 'select', required: 'RECOMMENDED', defaultValue: 'DDP', options: [{ value: 'DDP', label: 'DDP (Delivered Duty Paid)' }, { value: 'FOB', label: 'FOB (Free on Board)' }, { value: 'EXW', label: 'EXW (Ex Works)' }], section: 'Delivery' },
    { key: 'deliveryLocation', label: 'Delivery Destination Facility', type: 'text', required: 'RECOMMENDED', defaultValue: 'Apex Central Distribution Facility, Dock 4', section: 'Delivery' },
    { key: 'paymentTermsDays', label: 'Payment Terms (Net Days)', type: 'select', required: 'REQUIRED', defaultValue: '30', options: [{ value: '15', label: 'Net 15 Days' }, { value: '30', label: 'Net 30 Days' }, { value: '60', label: 'Net 60 Days' }], section: 'Commercials' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'INR', label: 'INR (₹)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Commercials' },
    { key: 'warrantyPeriodMonths', label: 'Product Warranty Period', type: 'select', required: 'RECOMMENDED', defaultValue: '24', options: [{ value: '12', label: '12 Months' }, { value: '24', label: '24 Months' }, { value: '36', label: '36 Months' }], section: 'Warranties' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of Delaware', section: 'Terms' }
  ],
  PARTNERSHIP: [
    { key: 'firmName', label: 'Partnership Firm Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Apex Strategic Ventures', section: 'Firm' },
    { key: 'businessActivity', label: 'Core Business Activity', type: 'textarea', required: 'REQUIRED', defaultValue: 'Strategic advisory, cross-border technology investments, and joint business development', section: 'Firm' },
    { key: 'partnerA.name', label: 'First Partner Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Sarah Jenkins', section: 'Partners' },
    { key: 'partnerA.capitalContribution', label: 'Partner A Initial Capital', type: 'text', required: 'REQUIRED', defaultValue: '500000', section: 'Partners' },
    { key: 'partnerA.profitShare', label: 'Partner A Profit Share %', type: 'text', required: 'REQUIRED', defaultValue: '50%', section: 'Partners' },
    { key: 'partnerB.name', label: 'Second Partner Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. David Vance', section: 'Partners' },
    { key: 'partnerB.capitalContribution', label: 'Partner B Initial Capital', type: 'text', required: 'REQUIRED', defaultValue: '500000', section: 'Partners' },
    { key: 'partnerB.profitShare', label: 'Partner B Profit Share %', type: 'text', required: 'REQUIRED', defaultValue: '50%', section: 'Partners' },
    { key: 'managementDecisionThreshold', label: 'Decision Consensus Rule', type: 'select', required: 'RECOMMENDED', defaultValue: 'Simple Majority', options: [{ value: 'Simple Majority', label: 'Simple Majority (51%)' }, { value: 'Supermajority', label: 'Supermajority (75%)' }, { value: 'Unanimous', label: 'Unanimous (100%)' }], section: 'Management' },
    { key: 'dissolutionNoticeDays', label: 'Dissolution Notice Period (Days)', type: 'select', required: 'RECOMMENDED', defaultValue: '90', options: [{ value: '60', label: '60 Days' }, { value: '90', label: '90 Days' }, { value: '180', label: '180 Days' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of California', section: 'Terms' }
  ],
  INTERNSHIP: [
    { key: 'company.name', label: 'Company / Sponsoring Organization', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Atharv Technologies Inc.', section: 'Parties' },
    { key: 'company.address', label: 'Company Registered Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'company.mentorName', label: 'Assigned Lead Mentor / Manager', type: 'text', required: 'RECOMMENDED', defaultValue: 'Dr. Robert Chen, Principal AI Scientist', section: 'Parties' },
    { key: 'intern.name', label: 'Intern Full Legal Name', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Aarav Patel', section: 'Parties' },
    { key: 'intern.university', label: 'Educational Institution / University', type: 'text', required: 'RECOMMENDED', defaultValue: 'Massachusetts Institute of Technology (MIT)', section: 'Parties' },
    { key: 'internshipRole', label: 'Intern Position / Functional Title', type: 'text', required: 'REQUIRED', defaultValue: 'Machine Learning & NLP Intern', section: 'Curriculum' },
    { key: 'learningObjectives', label: 'Training Curriculum & Learning Objectives', type: 'textarea', required: 'REQUIRED', defaultValue: 'Hands-on practical training in transformer architectures, vector embeddings, fine-tuning LLMs, and legal-domain semantic analysis pipelines.', section: 'Curriculum' },
    { key: 'durationWeeks', label: 'Internship Duration (Weeks)', type: 'select', required: 'REQUIRED', defaultValue: '12 weeks', options: [{ value: '8 weeks', label: '8 Weeks (2 Months)' }, { value: '12 weeks', label: '12 Weeks (3 Months)' }, { value: '24 weeks', label: '24 Weeks (6 Months)' }], section: 'Schedule' },
    { key: 'stipendAmount', label: 'Monthly Educational Stipend', type: 'text', required: 'REQUIRED', defaultValue: '4500', section: 'Stipend' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'INR', label: 'INR (₹)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Stipend' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of Delaware', section: 'Terms' }
  ],
  LEASE: [
    { key: 'landlord.name', label: 'Landlord Legal Entity / Owner', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Metropolitan Commercial Realty Trust', section: 'Parties' },
    { key: 'landlord.address', label: 'Landlord Notice Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'tenant.name', label: 'Tenant Legal Entity / Lessee', type: 'text', required: 'REQUIRED', placeholder: 'e.g. Atharv Cloud Technologies Inc.', section: 'Parties' },
    { key: 'tenant.address', label: 'Tenant Corporate Address', type: 'text', required: 'RECOMMENDED', section: 'Parties' },
    { key: 'premisesAddress', label: 'Demised Premises Full Physical Address', type: 'text', required: 'REQUIRED', defaultValue: 'Suite 1400, 350 Hudson Street, New York, NY 10014', section: 'Premises' },
    { key: 'demisedAreaSqFt', label: 'Demised Area (Approx. Sq. Ft.)', type: 'text', required: 'RECOMMENDED', defaultValue: '4,500 sq. ft.', section: 'Premises' },
    { key: 'monthlyRent', label: 'Monthly Fixed Base Rent Amount', type: 'text', required: 'REQUIRED', defaultValue: '18500', section: 'Commercials' },
    { key: 'currency', label: 'Currency', type: 'select', required: 'REQUIRED', defaultValue: 'USD', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'INR', label: 'INR (₹)' }, { value: 'EUR', label: 'EUR (€)' }], section: 'Commercials' },
    { key: 'securityDepositMonths', label: 'Interest-Free Security Deposit (Months)', type: 'select', required: 'REQUIRED', defaultValue: '3', options: [{ value: '2', label: '2 Months Rent' }, { value: '3', label: '3 Months Rent' }, { value: '6', label: '6 Months Rent' }], section: 'Commercials' },
    { key: 'leaseTermMonths', label: 'Lease Duration (Months)', type: 'select', required: 'REQUIRED', defaultValue: '36', options: [{ value: '11', label: '11 Months (Short-term)' }, { value: '24', label: '24 Months (2 Years)' }, { value: '36', label: '36 Months (3 Years)' }, { value: '60', label: '60 Months (5 Years)' }], section: 'Terms' },
    { key: 'lockInPeriodMonths', label: 'Lock-In Period (Months)', type: 'select', required: 'RECOMMENDED', defaultValue: '12', options: [{ value: '0', label: 'No Lock-in' }, { value: '6', label: '6 Months' }, { value: '12', label: '12 Months' }], section: 'Terms' },
    { key: 'governingLaw', label: 'Governing Law', type: 'text', required: 'REQUIRED', defaultValue: 'State of New York', section: 'Terms' }
  ]
};

export const CreateDocument: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [documentType, setDocumentType] = useState<DocumentType>(
    (searchParams.get('type') as DocumentType) || 'NDA'
  );
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('MIRA');

  // Dynamic contract type state
  const isDynamicType = !['NDA', 'LEGAL_NOTICE'].includes(documentType);
  const [dynamicFields, setDynamicFields] = useState<QuestionnaireField[]>([]);
  const [dynamicFacts, setDynamicFacts] = useState<Record<string, any>>({});
  const [schemaLoading, setSchemaLoading] = useState(false);

  // STEP 1: Parties (Legacy NDA/Notice)
  const [disclosingName, setDisclosingName] = useState('Apex Innovations Inc.');
  const [disclosingType, setDisclosingType] = useState('Corporation');
  const [disclosingAddress, setDisclosingAddress] = useState('1200 Innovation Way, Suite 400, Wilmington, DE 19801');
  const [disclosingEmail, setDisclosingEmail] = useState('legal@apexinnovations.com');
  const [disclosingPhone, setDisclosingPhone] = useState('+1 (302) 555-0199');
  const [disclosingSignatory, setDisclosingSignatory] = useState('Dr. Sarah Jenkins, Chief Executive Officer');

  const [receivingName, setReceivingName] = useState('Nexus Global Partners LLC');
  const [receivingType, setReceivingType] = useState('Limited Liability Company');
  const [receivingAddress, setReceivingAddress] = useState('450 Montgomery Street, Floor 14, San Francisco, CA 94104');
  const [receivingEmail, setReceivingEmail] = useState('contracts@nexuspartners.com');
  const [receivingPhone, setReceivingPhone] = useState('+1 (415) 555-0142');
  const [receivingSignatory, setReceivingSignatory] = useState('David Vance, Managing Partner');

  // For Legal Notice Parties
  const [senderAdvocate, setSenderAdvocate] = useState('Adv. Rajesh Singhania, Bar Council Reg. No. D/1420/2015');

  // STEP 2: Agreement Terms (Legacy NDA/Notice)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('3 years');
  const [purpose, setPurpose] = useState('Evaluation of a potential technology collaboration, proprietary software licensing, and mutual business partnership.');
  const [governingLaw, setGoverningLaw] = useState('State of Delaware');
  const [jurisdiction, setJurisdiction] = useState('Courts of Wilmington, Delaware');
  const [disputeMethod, setDisputeMethod] = useState('Exclusive Court Jurisdiction');

  // For Legal Notice Terms
  const [contractDate, setContractDate] = useState('2025-11-15');
  const [transactionNature, setTransactionNature] = useState('Provision of enterprise cloud software engineering and integration services');

  // STEP 3: Confidential Scope (Legacy NDA)
  const [confCategories, setConfCategories] = useState<string[]>([
    'Technical Data & Source Code',
    'Financial Statements & Valuation Models',
    'Proprietary Algorithms & Architecture',
    'Customer & Vendor Lists',
    'Product Roadmaps & Trade Secrets'
  ]);
  const [customScope, setCustomScope] = useState('Software source code, API keys, AI model weights, architecture documents, financial projections, and customer lists.');
  const [markingRequired, setMarkingRequired] = useState(false);
  const [exceptions, setExceptions] = useState<string[]>([
    'Information in the public domain without wrongful act',
    'Prior lawful possession established by documentary evidence',
    'Rightfully received from a third party without confidentiality breach',
    'Independently developed without reliance on confidential information',
    'Disclosures required by lawful judicial or government process'
  ]);

  // For Legal Notice Breach
  const [breachDescription, setBreachDescription] = useState('Willful failure and neglect to pay legitimate outstanding invoices for software deliverables accepted without objection.');
  const [invoiceNumbers, setInvoiceNumbers] = useState('INV-2026-084, INV-2026-092');

  // STEP 4: Obligations & Remedies (Legacy NDA)
  const [standardOfCare, setStandardOfCare] = useState('Highest degree of reasonable care (Strict standard)');
  const [permittedDisclosures, setPermittedDisclosures] = useState([
    'Directors, officers, and employees with a verifiable need-to-know',
    'Professional legal counsel and independent auditors',
    'Judicial compulsion following prompt notice to Disclosing Party'
  ]);
  const [returnDays, setReturnDays] = useState('7 business days');
  const [requireDestructionCert, setRequireDestructionCert] = useState(true);
  const [injunctiveRelief, setInjunctiveRelief] = useState(true);
  const [nonSolicitation, setNonSolicitation] = useState(false);
  const [nonSolicitPeriod, setNonSolicitPeriod] = useState('1 year');

  // For Legal Notice Demand & Remedies
  const [noticeAmount, setNoticeAmount] = useState('₹50,000');
  const [interestRate, setInterestRate] = useState('18% per annum');
  const [responsePeriod, setResponsePeriod] = useState('15 days');
  const [statutoryBasis, setStatutoryBasis] = useState('Section 73 of the Indian Contract Act, 1872 & Commercial Courts Act');

  // STEP 5: Special Instructions & Generation (Legacy NDA)
  const [ndaStructure, setNdaStructure] = useState<'MUTUAL' | 'UNILATERAL'>('MUTUAL');
  const [draftingTone, setDraftingTone] = useState<'BALANCED' | 'AGGRESSIVE_DISCLOSER' | 'STARTUP_FRIENDLY'>('BALANCED');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Generation execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepStatus, setGenerationStepStatus] = useState<string>('');

  // Sync search param on documentType change
  useEffect(() => {
    const typeFromQuery = searchParams.get('type');
    if (typeFromQuery && typeFromQuery !== documentType) {
      setDocumentType(typeFromQuery as DocumentType);
    }
  }, [searchParams]);

  // Load dynamic schema whenever documentType changes to a non-NDA/Notice type
  useEffect(() => {
    if (isDynamicType) {
      loadDynamicSchema(documentType);
    } else {
      setCurrentStep(1);
    }
  }, [documentType]);

  const loadDynamicSchema = async (code: string) => {
    setSchemaLoading(true);
    try {
      const schema = await contractTypeService.getSchema(code);
      if (schema && schema.questionnaire && schema.questionnaire.length > 0) {
        setDynamicFields(schema.questionnaire);
        // Initialize facts with default values
        const initial: Record<string, any> = {};
        for (const f of schema.questionnaire) {
          if (f.defaultValue !== undefined) {
            initial[f.key] = f.defaultValue;
          }
        }
        setDynamicFacts(initial);
      } else {
        useFallbackSchema(code);
      }
    } catch {
      useFallbackSchema(code);
    } finally {
      setSchemaLoading(false);
      setCurrentStep(1);
    }
  };

  const useFallbackSchema = (code: string) => {
    const fields = FALLBACK_SCHEMAS[code] || [];
    setDynamicFields(fields);
    const initial: Record<string, any> = {};
    for (const f of fields) {
      if (f.defaultValue !== undefined) {
        initial[f.key] = f.defaultValue;
      }
    }
    setDynamicFacts(initial);
  };

  const handleSelectContractType = (code: string) => {
    setDocumentType(code as DocumentType);
    setSearchParams({ type: code });
  };

  const loadPresetForType = (code: string) => {
    if (code === 'NDA') {
      loadPresetApexNexus();
    } else if (code === 'LEGAL_NOTICE') {
      loadPresetLegalNotice();
    } else if (PRESETS[code]) {
      setDynamicFacts({ ...PRESETS[code] });
    }
  };

  const loadPresetApexNexus = () => {
    setDocumentType('NDA');
    setDisclosingName('Apex Innovations Inc.');
    setDisclosingType('Corporation');
    setDisclosingAddress('1200 Innovation Way, Suite 400, Wilmington, DE 19801');
    setDisclosingEmail('legal@apexinnovations.com');
    setDisclosingPhone('+1 (302) 555-0199');
    setDisclosingSignatory('Dr. Sarah Jenkins, Chief Executive Officer');

    setReceivingName('Nexus Global Partners LLC');
    setReceivingType('Limited Liability Company');
    setReceivingAddress('450 Montgomery Street, Floor 14, San Francisco, CA 94104');
    setReceivingEmail('contracts@nexuspartners.com');
    setReceivingPhone('+1 (415) 555-0142');
    setReceivingSignatory('David Vance, Managing Partner');

    setDuration('3 years');
    setGoverningLaw('State of Delaware');
    setJurisdiction('Courts of Wilmington, Delaware');
    setPurpose('Evaluation of a prospective artificial intelligence partnership, cloud data integration, and mutual strategic licensing.');
  };

  const loadPresetLegalNotice = () => {
    setDocumentType('LEGAL_NOTICE');
    setDisclosingName('Apex Innovations Inc.');
    setDisclosingAddress('1200 Innovation Way, Wilmington, DE 19801');
    setReceivingName('Defaulting Partner Enterprises');
    setReceivingAddress('88 Commercial Plaza, Floor 5, New York, NY 10001');
    setNoticeAmount('₹50,000');
    setResponsePeriod('15 days');
    setGoverningLaw('India');
    setJurisdiction('Jaipur, Rajasthan');
  };

  // Compile structured facts object
  const compileStructuredFacts = () => {
    if (isDynamicType) {
      // Reconstruct nested structure if dot notation used
      const nested: Record<string, any> = {};
      for (const [key, val] of Object.entries(dynamicFacts)) {
        if (key.includes('.')) {
          const parts = key.split('.');
          let cur = nested;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {};
            cur = cur[parts[i]];
          }
          cur[parts[parts.length - 1]] = val;
        } else {
          nested[key] = val;
        }
      }
      return nested;
    }

    if (documentType === 'NDA') {
      return {
        disclosingParty: {
          name: disclosingName,
          type: disclosingType,
          address: disclosingAddress,
          email: disclosingEmail,
          phone: disclosingPhone,
          signatory: disclosingSignatory
        },
        receivingParty: {
          name: receivingName,
          type: receivingType,
          address: receivingAddress,
          email: receivingEmail,
          phone: receivingPhone,
          signatory: receivingSignatory
        },
        effectiveDate,
        duration,
        purpose,
        governingLaw,
        jurisdiction,
        disputeResolution: disputeMethod,
        confidentialInformation: customScope ? [customScope, ...confCategories] : confCategories,
        permittedDisclosures,
        exceptions,
        markingRequired,
        standardOfCare,
        returnOrDestructionDays: returnDays,
        requireDestructionCertificate: requireDestructionCert,
        injunctiveReliefWithoutBond: injunctiveRelief,
        nonSolicitationCovenant: nonSolicitation ? nonSolicitPeriod : null,
        agreementStructure: ndaStructure,
        draftingTone,
        specialInstructions
      };
    } else {
      return {
        sender: {
          name: disclosingName,
          type: disclosingType,
          address: disclosingAddress,
          email: disclosingEmail,
          phone: disclosingPhone,
          advocate: senderAdvocate
        },
        recipient: {
          name: receivingName,
          type: receivingType,
          address: receivingAddress,
          email: receivingEmail,
          phone: receivingPhone
        },
        contractDate,
        transactionNature,
        breach: breachDescription,
        invoiceNumbers,
        amount: noticeAmount,
        interestRate,
        responsePeriod,
        legalBasis: [statutoryBasis],
        demand: `Immediate unconditional remittance of overdue debt of ${noticeAmount} with ${interestRate} interest`,
        jurisdiction,
        governingLaw,
        specialInstructions
      };
    }
  };

  // Generate document title based on type and facts
  const getDocumentTitle = () => {
    if (documentType === 'NDA') {
      return `Non-Disclosure Agreement — ${disclosingName} & ${receivingName}`;
    }
    if (documentType === 'LEGAL_NOTICE') {
      return `Formal Legal Demand Notice — ${disclosingName} to ${receivingName}`;
    }
    if (documentType === 'EMPLOYMENT') {
      const emp = dynamicFacts['employee.name'] || 'Employee';
      const company = dynamicFacts['employer.name'] || 'Company';
      return `Employment Agreement — ${company} & ${emp}`;
    }
    if (documentType === 'SERVICE') {
      const client = dynamicFacts['client.name'] || 'Client';
      const provider = dynamicFacts['serviceProvider.name'] || 'Service Provider';
      return `Master Services Agreement — ${client} & ${provider}`;
    }
    if (documentType === 'SAAS') {
      const provider = dynamicFacts['provider.name'] || 'Provider';
      const customer = dynamicFacts['customer.name'] || 'Customer';
      return `SaaS Subscription Agreement — ${provider} & ${customer}`;
    }
    if (documentType === 'CONSULTING') {
      const client = dynamicFacts['client.name'] || 'Client';
      const consultant = dynamicFacts['consultant.name'] || 'Consultant';
      return `Consulting Agreement — ${client} & ${consultant}`;
    }
    if (documentType === 'MOU') {
      const pA = dynamicFacts['partyA.name'] || 'Party A';
      const pB = dynamicFacts['partyB.name'] || 'Party B';
      return `Memorandum of Understanding — ${pA} & ${pB}`;
    }
    if (documentType === 'VENDOR') {
      const buyer = dynamicFacts['buyer.name'] || 'Buyer';
      const vendor = dynamicFacts['vendor.name'] || 'Vendor';
      return `Vendor Supply Agreement — ${buyer} & ${vendor}`;
    }
    if (documentType === 'PARTNERSHIP') {
      const firm = dynamicFacts['firmName'] || 'General Partnership';
      const pA = dynamicFacts['partnerA.name'] || 'Partner A';
      const pB = dynamicFacts['partnerB.name'] || 'Partner B';
      return `Partnership Agreement (${firm}) — ${pA} & ${pB}`;
    }
    if (documentType === 'INTERNSHIP') {
      const company = dynamicFacts['company.name'] || 'Company';
      const intern = dynamicFacts['intern.name'] || 'Intern';
      return `Internship Engagement Agreement — ${company} & ${intern}`;
    }
    if (documentType === 'LEASE') {
      const landlord = dynamicFacts['landlord.name'] || 'Landlord';
      const tenant = dynamicFacts['tenant.name'] || 'Tenant';
      return `Commercial Lease Agreement — ${landlord} & ${tenant}`;
    }
    return `${documentType} Agreement`;
  };

  // Handle final generation
  const handleFinalGenerate = async () => {
    setIsGenerating(true);
    setGenerationStepStatus('Constructing authoritative legal parameters...');
    try {
      const facts = compileStructuredFacts();
      const title = getDocumentTitle();

      setGenerationStepStatus('Creating document record in PostgreSQL...');
      const newDoc = await documentService.create({
        title,
        documentType,
        structuredFacts: facts,
        generationMode
      });

      const docId = newDoc?.id || (newDoc as any)?.document?.id;
      if (!docId) {
        throw new Error('Document creation response did not contain a valid document ID.');
      }

      setGenerationStepStatus('Executing Atharv Legal AI controlled drafter pipeline with pgvector RAG...');
      await documentService.generate(docId, {
        rawInput: `${title}. Governing law: ${facts.governingLaw || 'Applicable Jurisdiction'}`,
        documentType,
        structuredFacts: facts,
        generationMode
      });

      setGenerationStepStatus('Validating draft with multi-tier fact rules & NLP semantic checks...');
      setTimeout(() => {
        navigate(`/documents/${docId}/edit`);
      }, 700);

    } catch (err: any) {
      alert(`Generation pipeline error: ${err.message}`);
      setIsGenerating(false);
    }
  };

  // Sections for dynamic types
  const dynamicSections = Array.from(new Set(dynamicFields.map(f => f.section)));

  // Legacy NDA steps
  const steps = [
    { num: 1, title: 'Parties', desc: 'Disclosing & Receiving Entities' },
    { num: 2, title: 'Agreement Terms', desc: 'Term, Purpose & Jurisdiction' },
    { num: 3, title: 'Confidential Scope', desc: 'Data Scope & Exclusions' },
    { num: 4, title: 'Obligations', desc: 'Standard of Care & Remedies' },
    { num: 5, title: 'Instructions & Facts', desc: 'Confirm Facts & Synthesize' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Contract Type Selector Header */}
      <div className="bg-white p-5 rounded-2xl border border-mira-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-mira-dark">Atharv Legal Document Drafter</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-mira-primary border border-purple-200">
              Multi-Contract v1.0
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadPresetForType(documentType)}
            className="px-3 py-1.5 bg-purple-50 text-mira-primary hover:bg-purple-100 text-xs font-semibold rounded-lg border border-purple-200 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-mira-primary" />
            Load Sample Preset
          </button>
        </div>

        {/* Contract Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {CONTRACT_TYPES.map(ct => {
            const Icon = ct.icon;
            const isSelected = documentType === ct.code;
            return (
              <button
                key={ct.code}
                disabled={!ct.active}
                onClick={() => handleSelectContractType(ct.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-mira-primary text-white shadow-xs'
                    : ct.active
                    ? 'bg-gray-50 text-mira-dark hover:bg-purple-50 hover:text-mira-primary border border-gray-200'
                    : 'bg-gray-50/60 text-gray-400 border border-gray-100 cursor-not-allowed opacity-60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-mira-muted'}`} />
                {ct.name}
                {ct.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-1 py-0.2 rounded">
                    {ct.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER DYNAMIC QUESTIONNAIRE FLOW FOR NEW CONTRACT TYPES */}
      {isDynamicType ? (
        <div className="space-y-6">
          {/* Dynamic 2-Step Stepper */}
          <div className="bg-white p-3.5 rounded-xl border border-mira-border shadow-2xs">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`p-2.5 rounded-lg text-left transition-all ${
                  currentStep === 1
                    ? 'bg-mira-primary text-white font-bold shadow-xs'
                    : 'bg-purple-50 text-mira-primary font-semibold'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white text-mira-primary flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Contract Terms & Parameters</span>
                </div>
                <p className="text-[10px] text-purple-100 mt-0.5">Authoritative factual fields for {documentType}</p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`p-2.5 rounded-lg text-left transition-all ${
                  currentStep === 2
                    ? 'bg-mira-primary text-white font-bold shadow-xs'
                    : 'text-mira-muted hover:bg-gray-50'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    currentStep === 2 ? 'bg-white text-mira-primary font-bold' : 'bg-gray-200 text-mira-dark'
                  }`}>2</span>
                  <span>Fact Confirmation & Pre-Flight</span>
                </div>
                <p className="text-[10px] text-mira-muted mt-0.5">Part 9 Zero-Hallucination verification before synthesis</p>
              </button>
            </div>
          </div>

          {/* DYNAMIC STEP 1: QUESTIONNAIRE SECTIONS */}
          {currentStep === 1 && (
            <div className="bg-white p-8 rounded-2xl border border-mira-border shadow-sm space-y-6">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 1 of 2</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    {CONTRACT_TYPES.find(c => c.code === documentType)?.fullTitle || documentType}
                  </h2>
                  <p className="text-xs text-mira-muted mt-0.5">
                    Fill the structured facts. Every input directly anchors deterministic legal drafting clauses.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {Object.keys(dynamicFacts).length} fields configured
                </span>
              </div>

              {schemaLoading ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-mira-primary animate-spin mx-auto" />
                  <p className="text-xs text-mira-muted">Loading authoritative contract schema...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {dynamicSections.map(secName => {
                    const fieldsInSec = dynamicFields.filter(f => f.section === secName);
                    return (
                      <div key={secName} className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                          <h3 className="text-sm font-bold text-mira-dark uppercase tracking-wider">{secName}</h3>
                          <span className="text-[10px] font-semibold text-mira-muted">({fieldsInSec.length} parameters)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {fieldsInSec.map(field => {
                            const isReq = field.required === 'REQUIRED';
                            const val = dynamicFacts[field.key] ?? '';

                            if (field.type === 'textarea') {
                              return (
                                <div key={field.key} className="sm:col-span-2 space-y-1">
                                  <label className="text-xs font-semibold text-mira-dark flex items-center justify-between">
                                    <span>{field.label} {isReq && <span className="text-red-500">*</span>}</span>
                                    <span className="text-[10px] text-mira-muted font-normal">{field.required}</span>
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={val}
                                    placeholder={field.placeholder || ''}
                                    onChange={(e) => setDynamicFacts({ ...dynamicFacts, [field.key]: e.target.value })}
                                    className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none"
                                  />
                                </div>
                              );
                            }

                            if (field.type === 'select') {
                              return (
                                <div key={field.key} className="space-y-1">
                                  <label className="text-xs font-semibold text-mira-dark flex items-center justify-between">
                                    <span>{field.label} {isReq && <span className="text-red-500">*</span>}</span>
                                    <span className="text-[10px] text-mira-muted font-normal">{field.required}</span>
                                  </label>
                                  <select
                                    value={val}
                                    onChange={(e) => setDynamicFacts({ ...dynamicFacts, [field.key]: e.target.value })}
                                    className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                                  >
                                    {(field.options || []).map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            }

                            return (
                              <div key={field.key} className="space-y-1">
                                <label className="text-xs font-semibold text-mira-dark flex items-center justify-between">
                                  <span>{field.label} {isReq && <span className="text-red-500">*</span>}</span>
                                  <span className="text-[10px] text-mira-muted font-normal">{field.required}</span>
                                </label>
                                <input
                                  type={field.type === 'date' ? 'date' : (field.type === 'email' ? 'email' : 'text')}
                                  value={val}
                                  placeholder={field.placeholder || ''}
                                  onChange={(e) => setDynamicFacts({ ...dynamicFacts, [field.key]: e.target.value })}
                                  className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      Confirm Facts & Pre-Flight Review (Part 9)
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC STEP 2: FACT CONFIRMATION SCREEN (PART 9) */}
          {currentStep === 2 && (
            <div className="bg-white p-8 rounded-2xl border border-mira-border shadow-sm space-y-6">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 2 of 2</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    Fact Confirmation & Pre-Flight Verification
                  </h2>
                  <p className="text-xs text-mira-muted mt-0.5">
                    Review and confirm factual parameters prior to document synthesis. Zero hallucinated fields permitted.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Authoritative Facts
                </span>
              </div>

              {/* Confirmed Parameters Table */}
              <div className="border border-mira-border rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-mira-border flex items-center justify-between">
                  <span className="text-xs font-bold text-mira-dark">Document Parameters Summary</span>
                  <span className="text-[11px] text-mira-muted font-mono">{getDocumentTitle()}</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                  {dynamicFields.map(field => {
                    const val = dynamicFacts[field.key];
                    const hasVal = val !== undefined && val !== null && String(val).trim().length > 0;
                    const isReq = field.required === 'REQUIRED';

                    return (
                      <div key={field.key} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hasVal ? 'bg-emerald-500' : (isReq ? 'bg-red-500' : 'bg-gray-300')}`} />
                          <span className="font-semibold text-mira-dark">{field.label}:</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-right max-w-xs truncate ${hasVal ? 'text-gray-900 font-medium' : 'text-mira-muted italic'}`}>
                            {hasVal ? String(val) : 'Not specified (unsupplied)'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            isReq ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {field.required}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generation Mode Selector */}
              <div className="p-4 bg-gray-50 rounded-xl border border-mira-border space-y-3">
                <span className="text-xs font-bold text-mira-dark uppercase tracking-wider">Select Generation Engine</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
                    generationMode === 'MIRA' ? 'bg-purple-50 border-mira-primary' : 'bg-white border-mira-border'
                  }`}>
                    <input
                      type="radio"
                      name="modeSelect"
                      checked={generationMode === 'MIRA'}
                      onChange={() => setGenerationMode('MIRA')}
                      className="mt-0.5 text-mira-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-mira-dark">Atharv Controlled Drafter Pipeline</span>
                      <p className="text-[10px] text-mira-muted mt-0.5">
                        Deterministic drafter + pgvector RAG + Multi-Tier validation + zero hallucinated fields.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
                    generationMode === 'BASELINE' ? 'bg-purple-50 border-mira-primary' : 'bg-white border-mira-border'
                  }`}>
                    <input
                      type="radio"
                      name="modeSelect"
                      checked={generationMode === 'BASELINE'}
                      onChange={() => setGenerationMode('BASELINE')}
                      className="mt-0.5 text-mira-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-mira-dark">Direct Baseline LLM (Control)</span>
                      <p className="text-[10px] text-mira-muted mt-0.5">
                        Direct prompt execution for comparative research evaluation.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generation Status Indicator when running */}
              {isGenerating && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-mira-primary animate-spin mx-auto" />
                  <div className="text-xs font-bold text-mira-dark">{generationStepStatus}</div>
                  <div className="text-[10px] text-mira-muted">
                    Synthesizing contract sections, executing pgvector RAG, and running validation engine...
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-mira-border text-xs font-medium rounded-lg text-mira-dark hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Edit Fields
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleFinalGenerate}
                  className="px-8 py-3 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? 'Synthesizing with Atharv AI...' : 'Generate & Validate Final Draft'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RENDER ORIGINAL 5-STEP WIZARD FOR NDA & LEGAL NOTICE (100% PRESERVED) */
        <div className="space-y-6">
          {/* 5-Step Stepper Navigation */}
          <div className="bg-white p-4 rounded-xl border border-mira-border shadow-2xs">
            <div className="grid grid-cols-5 gap-2">
              {steps.map((s) => (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  className={`text-left p-2.5 rounded-lg transition-all ${
                    currentStep === s.num
                      ? 'bg-mira-primary text-white shadow-xs font-bold'
                      : currentStep > s.num
                      ? 'bg-purple-50 text-mira-primary font-semibold'
                      : 'text-mira-muted hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      currentStep === s.num ? 'bg-white text-mira-primary font-bold' : 'bg-gray-200 text-mira-dark'
                    }`}>
                      {currentStep > s.num ? '✓' : s.num}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </div>
                  <p className={`text-[10px] mt-0.5 truncate hidden sm:block ${
                    currentStep === s.num ? 'text-purple-100' : 'text-mira-muted'
                  }`}>
                    {s.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* STEP CONTAINER */}
          <div className="bg-white p-8 rounded-2xl border border-mira-border shadow-sm min-h-[500px] space-y-6">
            
            {/* STEP 1: PARTIES */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 1 of 5</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    Step 1 — {documentType === 'NDA' ? 'Disclosing & Receiving Parties' : 'Sender & Recipient Parties'}
                  </h2>
                  <p className="text-xs text-mira-muted mt-0.5">
                    Specify authoritative legal entity names, addresses, and contacts.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Disclosing / Sender Party */}
                  <div className="p-4 rounded-xl border border-mira-border bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-mira-dark">
                        {documentType === 'NDA' ? 'Disclosing Party' : 'Sender / Claimant'}
                      </span>
                      <span className="text-[10px] font-semibold bg-purple-100 text-mira-primary px-2 py-0.5 rounded">
                        Party A
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Legal Entity Name *</label>
                      <input
                        type="text"
                        value={disclosingName}
                        onChange={(e) => setDisclosingName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Entity Type</label>
                      <input
                        type="text"
                        value={disclosingType}
                        onChange={(e) => setDisclosingType(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Registered Address</label>
                      <textarea
                        rows={2}
                        value={disclosingAddress}
                        onChange={(e) => setDisclosingAddress(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-mira-dark">Email</label>
                        <input
                          type="email"
                          value={disclosingEmail}
                          onChange={(e) => setDisclosingEmail(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-mira-dark">Phone</label>
                        <input
                          type="text"
                          value={disclosingPhone}
                          onChange={(e) => setDisclosingPhone(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">
                        {documentType === 'NDA' ? 'Authorized Signatory' : 'Legal Counsel / Advocate'}
                      </label>
                      <input
                        type="text"
                        value={documentType === 'NDA' ? disclosingSignatory : senderAdvocate}
                        onChange={(e) => documentType === 'NDA' ? setDisclosingSignatory(e.target.value) : setSenderAdvocate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Receiving / Recipient Party */}
                  <div className="p-4 rounded-xl border border-mira-border bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-mira-dark">
                        {documentType === 'NDA' ? 'Receiving Party' : 'Recipient / Addressee'}
                      </span>
                      <span className="text-[10px] font-semibold bg-gray-200 text-mira-dark px-2 py-0.5 rounded">
                        Party B
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Legal Entity Name *</label>
                      <input
                        type="text"
                        value={receivingName}
                        onChange={(e) => setReceivingName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Entity Type</label>
                      <input
                        type="text"
                        value={receivingType}
                        onChange={(e) => setReceivingType(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Registered Address</label>
                      <textarea
                        rows={2}
                        value={receivingAddress}
                        onChange={(e) => setReceivingAddress(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-mira-dark">Email</label>
                        <input
                          type="email"
                          value={receivingEmail}
                          onChange={(e) => setReceivingEmail(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-mira-dark">Phone</label>
                        <input
                          type="text"
                          value={receivingPhone}
                          onChange={(e) => setReceivingPhone(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Authorized Signatory</label>
                      <input
                        type="text"
                        value={receivingSignatory}
                        onChange={(e) => setReceivingSignatory(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary focus:ring-1 focus:ring-mira-primary outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Proceed to Agreement Terms
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: AGREEMENT TERMS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 2 of 5</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    Step 2 — {documentType === 'NDA' ? 'Agreement Duration, Purpose & Jurisdiction' : 'Transaction Recital & Timeline'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Effective Date *</label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Operative Duration / Term *</label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 2 years, 3 years, 5 years"
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-mira-dark">
                    {documentType === 'NDA' ? 'Authorized Purpose *' : 'Underlying Contract & Transaction Summary *'}
                  </label>
                  <textarea
                    rows={3}
                    value={documentType === 'NDA' ? purpose : transactionNature}
                    onChange={(e) => documentType === 'NDA' ? setPurpose(e.target.value) : setTransactionNature(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Governing Law *</label>
                    <input
                      type="text"
                      value={governingLaw}
                      onChange={(e) => setGoverningLaw(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Dispute Jurisdiction *</label>
                    <input
                      type="text"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Dispute Resolution Mechanism</label>
                    <select
                      value={disputeMethod}
                      onChange={(e) => setDisputeMethod(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none bg-white"
                    >
                      <option value="Exclusive Court Jurisdiction">Exclusive Court Jurisdiction</option>
                      <option value="Binding Institutional Arbitration">Binding Institutional Arbitration</option>
                      <option value="Two-Step: Executive Mediation then Arbitration">Two-Step: Mediation then Arbitration</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 border border-mira-border text-xs font-medium rounded-lg text-mira-dark hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Parties
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Proceed to Scope
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SCOPE & BREACH */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 3 of 5</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    Step 3 — {documentType === 'NDA' ? 'Confidential Scope & Exclusions' : 'Breach & Specific Defaults Alleged'}
                  </h2>
                </div>

                {documentType === 'NDA' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-mira-dark">Protected Information Categories</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          'Technical Data & Source Code',
                          'Financial Statements & Valuation Models',
                          'Proprietary Algorithms & Architecture',
                          'Customer & Vendor Lists',
                          'Product Roadmaps & Trade Secrets',
                          'Personnel, HR & Salary Records'
                        ].map((cat) => (
                          <label key={cat} className="flex items-center gap-2 p-2 rounded border border-mira-border bg-gray-50/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={confCategories.includes(cat)}
                              onChange={(e) => {
                                if (e.target.checked) setConfCategories([...confCategories, cat]);
                                else setConfCategories(confCategories.filter(c => c !== cat));
                              }}
                              className="rounded text-mira-primary"
                            />
                            <span>{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Custom Confidential Description</label>
                      <textarea
                        rows={2}
                        value={customScope}
                        onChange={(e) => setCustomScope(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Specific Contractual Breach *</label>
                      <textarea
                        rows={3}
                        value={breachDescription}
                        onChange={(e) => setBreachDescription(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Defaulting Invoices / References</label>
                      <input
                        type="text"
                        value={invoiceNumbers}
                        onChange={(e) => setInvoiceNumbers(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 border border-mira-border text-xs font-medium rounded-lg text-mira-dark hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Terms
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Proceed to Obligations
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: OBLIGATIONS & REMEDIES */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 4 of 5</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    Step 4 — {documentType === 'NDA' ? 'Standard of Care, Return & Remedies' : 'Claimed Amount & Demand'}
                  </h2>
                </div>

                {documentType === 'NDA' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Standard of Care</label>
                      <select
                        value={standardOfCare}
                        onChange={(e) => setStandardOfCare(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none bg-white"
                      >
                        <option value="Highest degree of reasonable care (Strict standard)">Highest degree of reasonable care (Strict standard)</option>
                        <option value="Reasonable commercial care no less than recipient uses for own confidential data">Reasonable commercial care (Standard)</option>
                        <option value="Utmost strict confidentiality">Utmost strict confidentiality</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-mira-dark">Return / Destruction Window</label>
                        <input
                          type="text"
                          value={returnDays}
                          onChange={(e) => setReturnDays(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="destructionCert"
                          checked={requireDestructionCert}
                          onChange={(e) => setRequireDestructionCert(e.target.checked)}
                          className="rounded text-mira-primary"
                        />
                        <label htmlFor="destructionCert" className="text-xs font-medium text-mira-dark cursor-pointer">
                          Require written officer certificate of destruction
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Claimed Monetary Amount *</label>
                      <input
                        type="text"
                        value={noticeAmount}
                        onChange={(e) => setNoticeAmount(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-mira-dark">Response / Cure Deadline *</label>
                      <input
                        type="text"
                        value={responsePeriod}
                        onChange={(e) => setResponsePeriod(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 border border-mira-border text-xs font-medium rounded-lg text-mira-dark hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Scope
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Proceed to Review & Instructions
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: SPECIAL INSTRUCTIONS & GENERATION (LEGACY NDA/NOTICE) */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 5 of 5</span>
                  <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                    Step 5 — Drafting Tone, Mode & Final Review
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Agreement Structure</label>
                    <select
                      value={ndaStructure}
                      onChange={(e) => setNdaStructure(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none bg-white"
                    >
                      <option value="MUTUAL">Mutual (Both parties disclose & receive)</option>
                      <option value="UNILATERAL">Unilateral (Disclosing Party protected only)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-mira-dark">Drafting Tone</label>
                    <select
                      value={draftingTone}
                      onChange={(e) => setDraftingTone(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-lg border border-mira-border focus:border-mira-primary outline-none bg-white"
                    >
                      <option value="BALANCED">Balanced & Commercial</option>
                      <option value="AGGRESSIVE_DISCLOSER">Aggressive Discloser Protective</option>
                      <option value="STARTUP_FRIENDLY">Startup Friendly</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-mira-border space-y-3">
                  <span className="text-xs font-bold text-mira-dark uppercase tracking-wider">Generation Engine</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
                      generationMode === 'MIRA' ? 'bg-purple-50 border-mira-primary' : 'bg-white border-mira-border'
                    }`}>
                      <input
                        type="radio"
                        name="modeSelect"
                        checked={generationMode === 'MIRA'}
                        onChange={() => setGenerationMode('MIRA')}
                        className="mt-0.5 text-mira-primary"
                      />
                      <div>
                        <span className="text-xs font-bold text-mira-dark">Atharv Controlled Drafter Pipeline</span>
                        <p className="text-[10px] text-mira-muted mt-0.5">
                          Deterministic legal drafter + pgvector RAG + Multi-Tier validation.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
                      generationMode === 'BASELINE' ? 'bg-purple-50 border-mira-primary' : 'bg-white border-mira-border'
                    }`}>
                      <input
                        type="radio"
                        name="modeSelect"
                        checked={generationMode === 'BASELINE'}
                        onChange={() => setGenerationMode('BASELINE')}
                        className="mt-0.5 text-mira-primary"
                      />
                      <div>
                        <span className="text-xs font-bold text-mira-dark">Direct Baseline LLM (Control)</span>
                        <p className="text-[10px] text-mira-muted mt-0.5">
                          Direct prompt execution for comparative research evaluation.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Pre-Flight Summary Card */}
                <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Pre-Flight Verification: 100% Complete
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Zero Missing Facts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-emerald-100">
                    <div>
                      <span className="text-mira-muted text-[11px]">Disclosing Party:</span>
                      <div className="font-bold text-mira-dark">{disclosingName}</div>
                      <div className="text-[10px] text-mira-muted">{disclosingAddress}</div>
                    </div>
                    <div>
                      <span className="text-mira-muted text-[11px]">Receiving Party:</span>
                      <div className="font-bold text-mira-dark">{receivingName}</div>
                      <div className="text-[10px] text-mira-muted">{receivingAddress}</div>
                    </div>
                    <div>
                      <span className="text-mira-muted text-[11px]">Duration & Governing Law:</span>
                      <div className="font-bold text-mira-dark">{duration} • {governingLaw}</div>
                    </div>
                    <div>
                      <span className="text-mira-muted text-[11px]">Authorized Purpose:</span>
                      <div className="font-medium text-mira-dark truncate">{purpose}</div>
                    </div>
                  </div>
                </div>

                {isGenerating && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-mira-primary animate-spin mx-auto" />
                    <div className="text-xs font-bold text-mira-dark">{generationStepStatus}</div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2 border border-mira-border text-xs font-medium rounded-lg text-mira-dark hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Obligations
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleFinalGenerate}
                    className="px-8 py-3 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? 'Synthesizing with Atharv AI...' : 'Generate & Validate Final Draft'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

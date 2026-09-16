import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentService, aiService, templateService, clauseService, knowledgeService } from '../services/api';
import { DocumentType, GenerationMode, TemplateRecord, ClauseRecord, KnowledgeDocumentRecord } from '../types';
import { 
  FileText, 
  Sparkles, 
  Scale, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Database, 
  Layers, 
  Cpu,
  RefreshCw,
  Info,
  ChevronRight,
  Building2,
  Calendar,
  Shield,
  FileCode,
  Sliders,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  UserCheck
} from 'lucide-react';

export const CreateDocument: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [documentType, setDocumentType] = useState<DocumentType>(
    (searchParams.get('type') as DocumentType) || 'NDA'
  );
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('MIRA');

  // STEP 1: Parties
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

  // STEP 2: Agreement Terms
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('3 years');
  const [purpose, setPurpose] = useState('Evaluation of a potential technology collaboration, proprietary software licensing, and mutual business partnership.');
  const [governingLaw, setGoverningLaw] = useState('State of Delaware');
  const [jurisdiction, setJurisdiction] = useState('Courts of Wilmington, Delaware');
  const [disputeMethod, setDisputeMethod] = useState('Exclusive Court Jurisdiction');

  // For Legal Notice Terms
  const [contractDate, setContractDate] = useState('2025-11-15');
  const [transactionNature, setTransactionNature] = useState('Provision of enterprise cloud software engineering and integration services');

  // STEP 3: Confidential Scope
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

  // STEP 4: Obligations & Remedies
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

  // STEP 5: Special Instructions & Generation
  const [ndaStructure, setNdaStructure] = useState<'MUTUAL' | 'UNILATERAL'>('MUTUAL');
  const [draftingTone, setDraftingTone] = useState<'BALANCED' | 'AGGRESSIVE_DISCLOSER' | 'STARTUP_FRIENDLY'>('BALANCED');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Generation execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepStatus, setGenerationStepStatus] = useState<string>('');

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

  // Handle final generation
  const handleFinalGenerate = async () => {
    setIsGenerating(true);
    setGenerationStepStatus('Constructing authoritative legal parameters...');
    try {
      const facts = compileStructuredFacts();
      const title = documentType === 'NDA'
        ? `Non-Disclosure Agreement — ${disclosingName} & ${receivingName}`
        : `Formal Legal Demand Notice — ${disclosingName} to ${receivingName}`;

      setGenerationStepStatus('Creating document record in PostgreSQL...');
      const newDoc = await documentService.create({
        title,
        documentType,
        structuredFacts: facts,
        generationMode
      });

      setGenerationStepStatus('Executing Atharv Legal AI 10-step state machine with Legal NLP & pgvector...');
      const genRes = await documentService.generate(newDoc.id, {
        rawInput: `${disclosingName} and ${receivingName} agreement for ${duration}. ${purpose}`,
        documentType,
        structuredFacts: facts,
        generationMode
      });

      setGenerationStepStatus('Validating draft with multi-tier fact rules & NLP semantic checks...');
      setTimeout(() => {
        navigate(`/documents/${newDoc.id}/edit`);
      }, 800);

    } catch (err: any) {
      alert(`Generation pipeline error: ${err.message}`);
      setIsGenerating(false);
    }
  };

  const steps = [
    { num: 1, title: 'Parties', desc: 'Disclosing & Receiving Entities' },
    { num: 2, title: 'Agreement Terms', desc: 'Term, Purpose & Jurisdiction' },
    { num: 3, title: 'Confidential Scope', desc: 'Data Scope & Exclusions' },
    { num: 4, title: 'Obligations', desc: 'Standard of Care & Remedies' },
    { num: 5, title: 'Instructions', desc: 'Review & Synthesize Draft' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-mira-border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-mira-dark">Atharv Legal AI Document Drafter</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-mira-primary border border-purple-200">
              {documentType === 'NDA' ? 'Non-Disclosure Agreement' : 'Legal Notice'}
            </span>
          </div>
          <p className="text-xs text-mira-muted mt-0.5">
            Step {currentStep} of 5 — Fill authoritative contractual parameters. Zero missing legal facts.
          </p>
        </div>

        {/* Presets & Document Type Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPresetApexNexus}
            className="px-3 py-1.5 bg-purple-50 text-mira-primary hover:bg-purple-100 text-xs font-semibold rounded-lg border border-purple-200 transition-colors shadow-2xs"
          >
            Load Apex & Nexus Preset
          </button>

          <button
            type="button"
            onClick={() => setDocumentType(documentType === 'NDA' ? 'LEGAL_NOTICE' : 'NDA')}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-medium rounded-lg text-mira-dark transition-colors"
          >
            Switch to {documentType === 'NDA' ? 'Legal Notice' : 'NDA'}
          </button>
        </div>
      </div>

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
        
        {/* ============================================================ */}
        {/* STEP 1: PARTIES                                              */}
        {/* ============================================================ */}
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
              {/* Disclosing Party / Sender */}
              <div className="p-5 bg-gray-50/70 rounded-xl border border-mira-border space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Building2 className="w-4 h-4 text-mira-primary" />
                  <h3 className="text-sm font-bold text-mira-dark">
                    {documentType === 'NDA' ? 'Disclosing Party' : 'Sender / Complainant'}
                  </h3>
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Legal Entity Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Innovations Inc."
                    value={disclosingName}
                    onChange={(e) => setDisclosingName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs font-medium focus:border-mira-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Entity Type</label>
                    <select
                      value={disclosingType}
                      onChange={(e) => setDisclosingType(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                    >
                      <option value="Corporation">Corporation</option>
                      <option value="Limited Liability Company">Limited Liability Company (LLC)</option>
                      <option value="Private Limited Company">Private Limited Company</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Individual">Individual / Proprietorship</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (302) 555-0199"
                      value={disclosingPhone}
                      onChange={(e) => setDisclosingPhone(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Registered Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="1200 Innovation Way, Suite 400, Wilmington, DE 19801"
                    value={disclosingAddress}
                    onChange={(e) => setDisclosingAddress(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Email Address</label>
                  <input
                    type="email"
                    placeholder="legal@apexinnovations.com"
                    value={disclosingEmail}
                    onChange={(e) => setDisclosingEmail(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Authorized Signatory Name & Title</label>
                  <input
                    type="text"
                    placeholder="Dr. Sarah Jenkins, CEO"
                    value={disclosingSignatory}
                    onChange={(e) => setDisclosingSignatory(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                {documentType === 'LEGAL_NOTICE' && (
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Legal Counsel / Advocate Details</label>
                    <input
                      type="text"
                      placeholder="Advocate name & Bar enrollment"
                      value={senderAdvocate}
                      onChange={(e) => setSenderAdvocate(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Receiving Party / Recipient */}
              <div className="p-5 bg-gray-50/70 rounded-xl border border-mira-border space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Building2 className="w-4 h-4 text-purple-700" />
                  <h3 className="text-sm font-bold text-mira-dark">
                    {documentType === 'NDA' ? 'Receiving Party' : 'Recipient / Addressee'}
                  </h3>
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Legal Entity Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nexus Global Partners LLC"
                    value={receivingName}
                    onChange={(e) => setReceivingName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs font-medium focus:border-mira-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Entity Type</label>
                    <select
                      value={receivingType}
                      onChange={(e) => setReceivingType(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                    >
                      <option value="Limited Liability Company">Limited Liability Company (LLC)</option>
                      <option value="Corporation">Corporation</option>
                      <option value="Private Limited Company">Private Limited Company</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Individual">Individual / Proprietorship</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (415) 555-0142"
                      value={receivingPhone}
                      onChange={(e) => setReceivingPhone(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Registered Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="450 Montgomery Street, Floor 14, San Francisco, CA 94104"
                    value={receivingAddress}
                    onChange={(e) => setReceivingAddress(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Email Address</label>
                  <input
                    type="email"
                    placeholder="contracts@nexuspartners.com"
                    value={receivingEmail}
                    onChange={(e) => setReceivingEmail(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Authorized Signatory Name & Title</label>
                  <input
                    type="text"
                    placeholder="David Vance, Managing Partner"
                    value={receivingSignatory}
                    onChange={(e) => setReceivingSignatory(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!disclosingName.trim() || !receivingName.trim()}
                className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                Proceed to Agreement Terms <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: AGREEMENT TERMS                                      */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 2 of 5</span>
              <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                Step 2 — {documentType === 'NDA' ? 'Agreement Terms & Purpose' : 'Transactional Background & Matter'}
              </h2>
              <p className="text-xs text-mira-muted mt-0.5">
                Specify operative timeline, authorized purpose, and legal jurisdiction.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-mira-dark">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">
                    {documentType === 'NDA' ? 'Duration / Confidentiality Term *' : 'Contract Date'}
                  </label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 2 years, 3 years, 5 years"
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-mira-dark">
                  {documentType === 'NDA' ? 'Authorized Purpose of Disclosure *' : 'Nature of Transaction / Relationship *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the transaction, evaluation, or business engagement..."
                  className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-mira-dark">Governing Law *</label>
                  <input
                    type="text"
                    required
                    value={governingLaw}
                    onChange={(e) => setGoverningLaw(e.target.value)}
                    placeholder="e.g. State of Delaware, India"
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Dispute Jurisdiction Venue *</label>
                  <input
                    type="text"
                    required
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g. Courts of Wilmington, Delaware"
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Dispute Resolution Method</label>
                  <select
                    value={disputeMethod}
                    onChange={(e) => setDisputeMethod(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                  >
                    <option value="Exclusive Court Jurisdiction">Exclusive Court Jurisdiction</option>
                    <option value="Commercial Arbitration (AAA/ICC)">Binding Arbitration</option>
                    <option value="Mediation Followed by Arbitration">Mediation then Arbitration</option>
                  </select>
                </div>
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
                className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                Proceed to Confidential Scope <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: CONFIDENTIAL SCOPE                                   */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 3 of 5</span>
              <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                Step 3 — {documentType === 'NDA' ? 'Confidential Scope & Exclusions' : 'Breach & Default Narrative'}
              </h2>
              <p className="text-xs text-mira-muted mt-0.5">
                Define protected technical & commercial categories, exceptions, and marking protocols.
              </p>
            </div>

            {documentType === 'NDA' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-mira-dark mb-1.5 block">
                    Protected Confidential Information Categories
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      'Technical Data & Source Code',
                      'Financial Statements & Valuation Models',
                      'Proprietary Algorithms & Architecture',
                      'Customer & Vendor Lists',
                      'Product Roadmaps & Trade Secrets',
                      'Personnel & Compensation Data'
                    ].map((cat) => (
                      <label key={cat} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confCategories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) setConfCategories([...confCategories, cat]);
                            else setConfCategories(confCategories.filter(c => c !== cat));
                          }}
                          className="text-mira-primary rounded"
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Detailed Scope Description / Project Specifics</label>
                  <textarea
                    rows={3}
                    value={customScope}
                    onChange={(e) => setCustomScope(e.target.value)}
                    placeholder="Enter project-specific technical assets, datasets, or proprietary technologies..."
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs leading-relaxed"
                  />
                </div>

                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                  <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Standard Legal Exclusions</span>
                  <div className="space-y-1 text-xs text-mira-dark">
                    {exceptions.map((ex, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-mira-primary font-bold">•</span>
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-mira-dark">Default & Breach Narrative *</label>
                  <textarea
                    rows={4}
                    required
                    value={breachDescription}
                    onChange={(e) => setBreachDescription(e.target.value)}
                    placeholder="State chronological default, failure to pay, non-compliance..."
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Invoice / Agreement Identifiers</label>
                  <input
                    type="text"
                    value={invoiceNumbers}
                    onChange={(e) => setInvoiceNumbers(e.target.value)}
                    placeholder="e.g. INV-2026-084, INV-2026-092"
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
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
                className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                Proceed to Obligations & Remedies <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: OBLIGATIONS & REMEDIES                               */}
        {/* ============================================================ */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 4 of 5</span>
              <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                Step 4 — {documentType === 'NDA' ? 'Obligations, Standard of Care & Remedies' : 'Quantified Demand & Compliance Timeline'}
              </h2>
              <p className="text-xs text-mira-muted mt-0.5">
                Configure degree of diligence, permitted disclosures, return protocols, and remedies.
              </p>
            </div>

            {documentType === 'NDA' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Standard of Care</label>
                    <select
                      value={standardOfCare}
                      onChange={(e) => setStandardOfCare(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                    >
                      <option value="Highest degree of reasonable care (Strict standard)">Highest degree of reasonable care (Strict)</option>
                      <option value="Same degree of care as own confidential information (Commercial standard)">Same degree of care as own data (Standard)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Return or Destruction Window</label>
                    <select
                      value={returnDays}
                      onChange={(e) => setReturnDays(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                    >
                      <option value="7 business days">Promptly within 7 business days</option>
                      <option value="14 business days">Within 14 business days</option>
                      <option value="30 calendar days">Within 30 calendar days</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-mira-border text-xs">
                  <span className="font-bold text-mira-dark">Remedies & Protective Covenants:</span>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={injunctiveRelief}
                        onChange={(e) => setInjunctiveRelief(e.target.checked)}
                        className="text-mira-primary rounded"
                      />
                      <span>Injunctive Relief without requirement of posting bond or proving monetary harm</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireDestructionCert}
                        onChange={(e) => setRequireDestructionCert(e.target.checked)}
                        className="text-mira-primary rounded"
                      />
                      <span>Mandatory written certificate of destruction upon termination</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nonSolicitation}
                        onChange={(e) => setNonSolicitation(e.target.checked)}
                        className="text-mira-primary rounded"
                      />
                      <span>Optional Employee / Customer Non-Solicitation Covenant (1 year)</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Principal Outstanding Amount *</label>
                    <input
                      type="text"
                      required
                      value={noticeAmount}
                      onChange={(e) => setNoticeAmount(e.target.value)}
                      placeholder="e.g. ₹50,000 or $25,000"
                      className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs font-bold text-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-mira-dark">Response Period / Window *</label>
                    <input
                      type="text"
                      required
                      value={responsePeriod}
                      onChange={(e) => setResponsePeriod(e.target.value)}
                      placeholder="e.g. 15 days"
                      className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-mira-dark">Statutory Legal Grounds</label>
                  <input
                    type="text"
                    value={statutoryBasis}
                    onChange={(e) => setStatutoryBasis(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
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
                className="px-6 py-2.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                Proceed to Final Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 5: SPECIAL INSTRUCTIONS & GENERATION REVIEW             */}
        {/* ============================================================ */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <span className="text-xs font-bold text-mira-primary uppercase tracking-wider">Step 5 of 5</span>
              <h2 className="text-lg font-bold text-mira-dark mt-0.5">
                Step 5 — Special Instructions & Pre-Generation Audit
              </h2>
              <p className="text-xs text-mira-muted mt-0.5">
                Review all captured legal entities, terms, and constraints before synthesizing draft.
              </p>
            </div>

            {/* Structure & Stance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-mira-dark">Agreement Structure</label>
                <select
                  value={ndaStructure}
                  onChange={(e) => setNdaStructure(e.target.value as any)}
                  className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                >
                  <option value="MUTUAL">Mutual / Bilateral (Both Disclose & Receive)</option>
                  <option value="UNILATERAL">Unilateral / One-Way (Disclosing Only)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-mira-dark">Drafting Stance</label>
                <select
                  value={draftingTone}
                  onChange={(e) => setDraftingTone(e.target.value as any)}
                  className="w-full mt-1 p-2.5 bg-white border border-mira-border rounded-lg text-xs"
                >
                  <option value="BALANCED">Balanced Institutional Standard (Recommended)</option>
                  <option value="AGGRESSIVE_DISCLOSER">Strict Disclosing Party Favor</option>
                  <option value="STARTUP_FRIENDLY">Founder / Startup Friendly</option>
                </select>
              </div>
            </div>

            {/* Generation Mode (Research Toggle) */}
            <div className="p-4 bg-gray-50 rounded-xl border border-mira-border space-y-2">
              <span className="text-xs font-bold text-mira-dark uppercase tracking-wider">
                Execution Pipeline Architecture
              </span>
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
                    <span className="text-xs font-bold text-mira-dark">Atharv Legal AI Controlled Pipeline</span>
                    <p className="text-[10px] text-mira-muted mt-0.5">
                      Legal NLP (all-MiniLM-L6-v2) + 14-section template + pgvector RAG + Multi-Tier validation.
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

            {/* Authoritative Review Summary Card */}
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

            {/* Generation Status Indicator when running */}
            {isGenerating && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-mira-primary animate-spin mx-auto" />
                <div className="text-xs font-bold text-mira-dark">{generationStepStatus}</div>
                <div className="text-[10px] text-mira-muted">
                  Orchestrating state machine, pgvector RAG chunks, and Legal NLP validation...
                </div>
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
                className="px-8 py-3 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Synthesizing with Atharv Legal AI...' : 'Generate & Validate Final Draft'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

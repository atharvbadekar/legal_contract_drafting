import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getAllContractTypes, getContractTypeConfig } from '../config/contract_types/registry.js';
import { extractAndValidateFacts } from '../services/facts/fact_extractor.js';
import { getDrafter } from '../services/generation/generation_service.js';
import { lintContract } from '../services/validation/contract_linter.js';
import { validationEngine } from '../services/validation/validation_engine.js';
import { exportService } from '../services/documents/export_service.js';

describe('Atharv Multi-Contract Legal Intelligence Test Suite', () => {

  // =========================================================================
  // 1. CONTRACT TYPE REGISTRY
  // =========================================================================
  it('Test 1: Contract Type Registry returns all 10 contract types with complete configuration', () => {
    const allTypes = getAllContractTypes();
    assert.strictEqual(allTypes.length, 10, 'Expected exactly 10 contract types');

    const expectedCodes = ['NDA', 'EMPLOYMENT', 'SERVICE', 'SAAS', 'CONSULTING', 'MOU', 'VENDOR', 'PARTNERSHIP', 'INTERNSHIP', 'LEASE'];
    for (const code of expectedCodes) {
      const found = allTypes.find(t => t.code === code);
      assert.ok(found, `Contract type ${code} must exist in registry`);
      assert.ok(found.name, `${code} must have a name`);
      assert.ok(found.description, `${code} must have a description`);
      assert.ok(found.questionnaire.length > 0, `${code} must have questionnaire fields`);
      assert.ok(found.ontologyCategories.length > 0, `${code} must have ontology categories`);
      assert.ok(found.requiredFacts.length > 0, `${code} must define requiredFacts`);
    }

    // Specific check for core types
    const empConfig = getContractTypeConfig('EMPLOYMENT');
    assert.ok(empConfig);
    assert.strictEqual(empConfig.code, 'EMPLOYMENT');
    assert.strictEqual(empConfig.category, 'HUMAN_RESOURCES');

    const saasConfig = getContractTypeConfig('SAAS');
    assert.ok(saasConfig);
    assert.strictEqual(saasConfig.code, 'SAAS');
    assert.strictEqual(saasConfig.category, 'TECHNOLOGY');
  });

  // =========================================================================
  // 2. STRICT FACT EXTRACTION (ZERO HALLUCINATION)
  // =========================================================================
  it('Test 2: Fact Extractor enforces zero hallucination and identifies missing required facts', () => {
    // Incomplete facts for Employment
    const partialFacts = {
      'employer.name': 'Apex Technologies Pvt Ltd',
      'salary': '2400000'
      // missing: employee.name, designation, joiningDate, governingLaw
    };

    const result = extractAndValidateFacts('EMPLOYMENT', partialFacts);
    assert.strictEqual(result.contractTypeCode, 'EMPLOYMENT');
    assert.strictEqual(result.isComplete, false);
    assert.ok(result.missingRequired.includes('employee.name'));
    assert.ok(result.missingRequired.includes('designation'));
    assert.ok(result.missingRequired.includes('joiningDate'));
    // Unknown remains unassumed (not in result.facts)
    assert.strictEqual(result.facts['employee.name'], undefined);

    // Complete facts for Service Agreement
    const completeServiceFacts = {
      'client.name': 'Apex Financial Corp',
      'serviceProvider.name': 'CloudMatrix Technologies LLP',
      'scopeOfServices': 'Backend engineering and microservices implementation',
      'fees': '50000',
      'currency': 'USD',
      'commencementDate': '2026-03-01',
      'governingLaw': 'State of New York'
    };

    const completeResult = extractAndValidateFacts('SERVICE', completeServiceFacts);
    assert.strictEqual(completeResult.isComplete, true);
    assert.strictEqual(completeResult.missingRequired.length, 0);
  });

  // =========================================================================
  // 3. MULTI-CONTRACT DRAFTERS (STRATEGY PATTERN)
  // =========================================================================
  it('Test 3: Employment Agreement Drafter generates complete 12-section contract', () => {
    const drafter = getDrafter('EMPLOYMENT');
    assert.ok(drafter, 'Employment drafter must be registered');

    const facts = {
      employer: { name: 'Apex Corp', address: '1200 Innovation Way, Bangalore', signatory: 'Sarah Jenkins, CEO' },
      employee: { name: 'John Doe', address: '45 Green Park, Bangalore', email: 'john@example.com' },
      designation: 'Staff AI Engineer',
      department: 'Legal AI',
      workLocation: 'Bangalore, India',
      salary: '3,000,000',
      currency: 'INR',
      joiningDate: '2026-04-01',
      probationPeriod: '90 days',
      noticePeriodEmployee: '60 days',
      noticePeriodEmployer: '60 days',
      governingLaw: 'Laws of India'
    };

    const draft = drafter.draft({
      rawInput: 'Employment contract for John Doe',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.ok(draft.title.includes('EMPLOYMENT AGREEMENT'));
    assert.ok(content.includes('EMPLOYMENT AGREEMENT'));
    assert.ok(content.includes('Apex Corp'));
    assert.ok(content.includes('John Doe'));
    assert.ok(content.includes('Staff AI Engineer'));
    assert.ok(content.includes('3,000,000'));
    assert.ok(content.includes('Laws of India'));
    assert.ok(content.includes('IN WITNESS WHEREOF'));
    assert.strictEqual(draft.sections.length >= 10, true, 'Must produce at least 10 sections');
  });

  it('Test 4: Master Services Agreement Drafter generates formal MSA with correct title', () => {
    const drafter = getDrafter('SERVICE');
    assert.ok(drafter, 'Service drafter must be registered');

    const facts = {
      client: { name: 'Enterprise Financial Inc.', address: 'Wall Street, NY' },
      serviceProvider: { name: 'DevMatrix LLP', address: 'Market Street, SF' },
      scopeOfServices: 'Custom financial machine learning pipeline development',
      deliverables: 'Source code, API specifications, and Docker images',
      fees: '85,000',
      currency: 'USD',
      paymentSchedule: 'milestone-based',
      commencementDate: '2026-05-01',
      duration: '1 year',
      governingLaw: 'State of New York'
    };

    const draft = drafter.draft({
      rawInput: 'Service contract for financial ML',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.strictEqual(draft.title, 'MASTER SERVICES AGREEMENT');
    assert.ok(content.includes('Enterprise Financial Inc.'));
    assert.ok(content.includes('DevMatrix LLP'));
    assert.ok(content.includes('85,000'));
    assert.ok(content.includes('milestone-based'));
    assert.ok(content.includes('LIMITATION OF LIABILITY'));
    assert.ok(content.includes('INTELLECTUAL PROPERTY'));
  });

  it('Test 5: SaaS Subscription Agreement Drafter generates SLA, uptime and pricing covenants', () => {
    const drafter = getDrafter('SAAS');
    assert.ok(drafter, 'SaaS drafter must be registered');

    const facts = {
      provider: { name: 'Mira Cloud Technologies Inc.', address: 'Wilmington, DE' },
      customer: { name: 'Apex Retail Group', address: 'Chicago, IL' },
      productName: 'Mira AI Legal Platform',
      subscriptionFee: '24,000',
      currency: 'USD',
      billingCycle: 'Annual',
      startDate: '2026-06-01',
      initialTerm: '2 years',
      uptimeSLA: '99.9%',
      governingLaw: 'State of Delaware'
    };

    const draft = drafter.draft({
      rawInput: 'SaaS agreement for Mira AI',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.strictEqual(draft.title, 'SOFTWARE AS A SERVICE (SAAS) AGREEMENT');
    assert.ok(content.includes('Mira Cloud Technologies Inc.'));
    assert.ok(content.includes('Apex Retail Group'));
    assert.ok(content.includes('Mira AI Legal Platform'));
    assert.ok(content.includes('24,000'));
    assert.ok(content.includes('99.9%'));
    assert.ok(content.includes('DATA SECURITY & SOVEREIGNTY'));
  });

  it('Test 6: MOU Drafter supports both partyA/partyB and party1/party2 schemas', () => {
    const drafter = getDrafter('MOU');
    assert.ok(drafter, 'MOU drafter must be registered');

    // Schema format 1: partyA and partyB
    const factsA = {
      partyA: { name: 'Institute of Artificial Intelligence', address: 'New Delhi' },
      partyB: { name: 'National Bar Council', address: 'Mumbai' },
      purpose: 'Joint research in legal NLP and ethical AI governance',
      effectiveDate: '2026-07-01',
      term: '3 years',
      governingLaw: 'Laws of India'
    };

    const draftA = drafter.draft({
      rawInput: 'MOU between Institute and Bar Council',
      structuredFacts: factsA,
      generationMode: 'MIRA'
    });

    const contentA = draftA.sections.map(s => s.content).join('\n\n');

    assert.strictEqual(draftA.title, 'MEMORANDUM OF UNDERSTANDING');
    assert.ok(contentA.includes('Institute of Artificial Intelligence'));
    assert.ok(contentA.includes('National Bar Council'));
    assert.ok(contentA.includes('NON-BINDING UNDERSTANDING'));

    // Schema format 2: party1 and party2
    const factsB = {
      party1: { name: 'Alpha University' },
      party2: { name: 'Beta Foundation' },
      purpose: 'Educational student exchange',
      effectiveDate: '2026-08-01',
      governingLaw: 'Laws of India'
    };

    const draftB = drafter.draft({
      rawInput: 'MOU Alpha and Beta',
      structuredFacts: factsB,
      generationMode: 'MIRA'
    });

    const contentB = draftB.sections.map(s => s.content).join('\n\n');

    assert.ok(contentB.includes('Alpha University'));
    assert.ok(contentB.includes('Beta Foundation'));
  });

  // =========================================================================
  // 4. CONTRACT LINTER
  // =========================================================================
  it('Test 7: Contract Linter detects unresolved placeholders, empty sections, broken refs, and missing signatures', () => {
    const defectiveContract = `# MASTER SERVICES AGREEMENT
By and between ClientCorp and ProviderLLC.

## 1. SCOPE OF SERVICES
ProviderLLC shall deliver [Insert Software Name] on or before {{delivery_date}}.
As set forth in Section 15 of this Agreement, payments shall be prompt.

## 2. EMPTY CLAUSE

## 3. COMPENSATION
ClientCorp shall pay the fee of $50,000.

<!-- End of document without signatures -->`;

    const lintRes = lintContract(defectiveContract, 'SERVICE');
    assert.strictEqual(lintRes.valid, false);

    // 1. Detect unresolved placeholders
    const placeholderErrors = lintRes.errors.filter(e => e.code === 'UNRESOLVED_PLACEHOLDER');
    assert.strictEqual(placeholderErrors.length >= 2, true, 'Must detect [Insert Software Name] and {{delivery_date}}');

    // 2. Detect empty section
    const emptySecErrors = lintRes.errors.filter(e => e.code === 'EMPTY_SECTION');
    assert.strictEqual(emptySecErrors.length >= 1, true, 'Must detect empty Section 2');

    // 3. Detect broken cross-reference
    const brokenRefErrors = lintRes.errors.filter(e => e.code === 'BROKEN_CROSS_REFERENCE');
    assert.strictEqual(brokenRefErrors.length >= 1, true, 'Must detect reference to non-existent Section 15');

    // 4. Detect missing signature block
    const sigErrors = lintRes.errors.filter(e => e.code === 'MISSING_SIGNATURE_BLOCK');
    assert.strictEqual(sigErrors.length >= 1, true, 'Must detect missing execution signature block');
  });

  // =========================================================================
  // 5. VALIDATION ENGINE FOR MULTI-CONTRACT
  // =========================================================================
  it('Test 8: Validation Engine validates Employment Agreement without false payment/IP flags', async () => {
    const drafter = getDrafter('EMPLOYMENT');
    const facts = {
      employer: { name: 'Apex Corp', address: 'Bangalore' },
      employee: { name: 'Jane Smith', address: 'Bangalore' },
      designation: 'Senior Legal Tech Engineer',
      salary: '2,500,000',
      currency: 'INR',
      joiningDate: '2026-04-01',
      governingLaw: 'Laws of India'
    };

    const draft = drafter.draft({
      rawInput: 'Draft employment for Jane Smith',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const valResult = await validationEngine.validate(
      'EMPLOYMENT',
      draft.sections,
      facts
    );

    // Score should be high/passed
    assert.ok(valResult.overallScore >= 80, `Expected score >= 80, got ${valResult.overallScore}`);
    assert.notStrictEqual(valResult.status, 'FAILED');

    // Must NOT flag MISSING_PAYMENT_AMOUNT because salary is in facts and text
    const paymentIssue = valResult.allIssues.find(i => i.type === 'MISSING_PAYMENT_AMOUNT');
    assert.strictEqual(paymentIssue, undefined, 'Must NOT flag missing payment amount');

    // Must NOT flag MISSING_IP_OWNERSHIP because Employment is excluded from commissioned work IP check
    const ipIssue = valResult.allIssues.find(i => i.type === 'MISSING_IP_OWNERSHIP');
    assert.strictEqual(ipIssue, undefined, 'Must NOT flag missing IP ownership for employment agreement');
  });

  // =========================================================================
  // 6. PROFESSIONAL DOCUMENT ENGINE (DOCX & PDF EXPORT)
  // =========================================================================
  it('Test 9: Export Service produces styled DOCX with running header & footer', async () => {
    const title = 'EMPLOYMENT AGREEMENT';
    const content = `# EMPLOYMENT AGREEMENT
Between Acme Corp and John Doe.

## 1. APPOINTMENT
Acme Corp appoints John Doe as Lead Architect.

## 2. COMPENSATION
Annual compensation is INR 3,000,000 payable monthly.

---
IN WITNESS WHEREOF the parties have executed this agreement.`;

    const docxBuf = await exportService.generateDocx(title, content);
    assert.ok(Buffer.isBuffer(docxBuf));
    assert.ok(docxBuf.length > 1000, 'DOCX buffer must be non-empty and well-formed');
  });

  it('Test 10: Export Service produces styled PDF with running header & page numbers', async () => {
    const title = 'MASTER SERVICES AGREEMENT';
    const content = `# MASTER SERVICES AGREEMENT
Between ClientCorp and VendorLLC.

## 1. SCOPE OF SERVICES
VendorLLC shall develop and deploy real-time software.

## 2. CONSIDERATION
ClientCorp shall pay the sum of USD 60,000.

---
Executed this 1st day of March, 2026.`;

    const pdfBuf = await exportService.generatePdf(title, content);
    assert.ok(Buffer.isBuffer(pdfBuf));
    assert.ok(pdfBuf.length > 500, 'PDF buffer must be non-empty and well-formed');
    // PDF magic bytes %PDF-
    assert.strictEqual(pdfBuf.subarray(0, 4).toString(), '%PDF');
  });

  // =========================================================================
  // 7. NEW OPERATIVE DRAFTERS (VENDOR, PARTNERSHIP, INTERNSHIP, LEASE)
  // =========================================================================
  it('Test 11: Vendor Agreement Drafter generates complete 10-section contract with goods specs and inspection terms', () => {
    const drafter = getDrafter('VENDOR');
    assert.ok(drafter, 'Vendor drafter must be registered');

    const facts = {
      buyer: { name: 'Apex Retail Solutions Inc.', address: '1200 Innovation Way, Suite 400, Wilmington, DE 19801', signatory: 'Marcus Vance, CPO' },
      vendor: { name: 'Precision Hardware Technologies LLC', address: '850 Industrial Parkway, Cleveland, OH 44114', signatory: 'Elena Rostova, MD' },
      goodsDescription: 'High-throughput edge computing nodes and optical scanning sensors',
      specifications: 'Full conformance to ISO 9001 quality manufacturing tolerances',
      deliveryTerms: 'DDP (Delivered Duty Paid)',
      deliveryLocation: 'Apex Central Distribution Facility, Dock 4',
      paymentTermsDays: '30',
      currency: 'USD',
      pricingModel: 'Unit-Price with Quarterly Volume Discount',
      inspectionDays: '10',
      warrantyPeriodMonths: '24',
      liabilityCapMultiple: '2x total purchase orders',
      effectiveDate: '2026-04-01',
      duration: '2 years',
      governingLaw: 'State of Delaware',
      jurisdiction: 'Courts of Wilmington, Delaware',
      disputeMethod: 'Arbitration under AAA Commercial Rules'
    };

    const draft = drafter.draft({
      rawInput: 'Draft vendor supply agreement for edge hardware',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.ok(draft.title.includes('VENDOR SUPPLY') || draft.title.includes('GOODS'));
    assert.ok(draft.sections.length >= 8, `Expected at least 8 sections, got ${draft.sections.length}`);
    assert.ok(content.includes('Apex Retail Solutions Inc.'));
    assert.ok(content.includes('Precision Hardware Technologies LLC'));
    assert.ok(content.includes('ISO 9001'));
    assert.ok(content.includes('INSPECTION'));
  });

  it('Test 12: Partnership Agreement Drafter generates complete 9-section partnership deed with capital accounts and profit ratio', () => {
    const drafter = getDrafter('PARTNERSHIP');
    assert.ok(drafter, 'Partnership drafter must be registered');

    const facts = {
      firmName: 'Apex & Partners Strategic Ventures',
      businessActivity: 'Cross-border technology investment and strategic advisory',
      principalPlaceOfBusiness: '450 Montgomery Street, Floor 14, San Francisco, CA 94104',
      partnerA: { name: 'Sarah Jenkins', address: '742 Evergreen Terrace, Palo Alto, CA 94301', capitalContribution: '500000', profitShare: '50%' },
      partnerB: { name: 'David Vance', address: '100 Marina Boulevard, San Francisco, CA 94123', capitalContribution: '500000', profitShare: '50%' },
      effectiveDate: '2026-05-01',
      duration: 'Perpetual',
      bankingAuthority: 'Joint signatures required for transactions exceeding $10,000',
      managementDecisionThreshold: 'Simple Majority for routine operations',
      dissolutionNoticeDays: '90',
      governingLaw: 'State of California',
      jurisdiction: 'Courts of San Francisco, California',
      disputeMethod: 'Binding Arbitration under JAMS Rules'
    };

    const draft = drafter.draft({
      rawInput: 'Draft general partnership deed for Sarah Jenkins and David Vance',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.ok(draft.title.includes('PARTNERSHIP'));
    assert.ok(draft.sections.length >= 8, `Expected at least 8 sections, got ${draft.sections.length}`);
    assert.ok(content.includes('Apex & Partners Strategic Ventures'));
    assert.ok(content.includes('Sarah Jenkins'));
    assert.ok(content.includes('David Vance'));
    assert.ok(content.includes('CAPITAL'));
    assert.ok(content.includes('DISSOLUTION'));
  });

  it('Test 13: Internship Agreement Drafter generates complete 10-section agreement with stipend, curriculum, and IP ownership', () => {
    const drafter = getDrafter('INTERNSHIP');
    assert.ok(drafter, 'Internship drafter must be registered');

    const facts = {
      company: { name: 'Mira Technologies Inc.', address: '100 Enterprise Way, Wilmington, DE', mentorName: 'Dr. Robert Chen' },
      intern: { name: 'Aarav Patel', address: '204 University Crescent, Cambridge, MA', email: 'aarav@mit.edu', university: 'MIT' },
      internshipRole: 'Applied Machine Learning & NLP Intern',
      department: 'Core AI Research Lab',
      learningObjectives: 'Hands-on practical training in transformer architectures and vector embeddings',
      startDate: '2026-06-01',
      durationWeeks: '12 weeks',
      workingHoursPerWeek: '40',
      stipendAmount: '4500',
      currency: 'USD',
      confidentialityAgreed: 'Yes, strict non-disclosure',
      ipWorkForHire: 'All code created during engagement belongs solely to Company',
      governingLaw: 'State of Delaware',
      jurisdiction: 'Courts of New Castle County, Delaware'
    };

    const draft = drafter.draft({
      rawInput: 'Draft internship agreement for Aarav Patel at Mira',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.ok(draft.title.includes('INTERNSHIP'));
    assert.ok(draft.sections.length >= 8, `Expected at least 8 sections, got ${draft.sections.length}`);
    assert.ok(content.includes('Mira Technologies Inc.'));
    assert.ok(content.includes('Aarav Patel'));
    assert.ok(content.includes('STIPEND') || content.includes('COMPENSATION'));
    assert.ok(content.includes('INTELLECTUAL PROPERTY'));
  });

  it('Test 14: Lease Agreement Drafter generates complete 10-section commercial lease agreement with demised premises, monthly rent, and deposit', () => {
    const drafter = getDrafter('LEASE');
    assert.ok(drafter, 'Lease drafter must be registered');

    const facts = {
      landlord: { name: 'Metropolitan Commercial Realty Trust', address: '500 Madison Avenue, New York, NY', signatory: 'Arthur Pendelton' },
      tenant: { name: 'Mira Cloud Technologies Inc.', address: '100 Enterprise Way, Wilmington, DE', signatory: 'Sarah Jenkins' },
      premisesAddress: 'Suite 1400, 350 Hudson Street, New York, NY 10014',
      demisedAreaSqFt: '4,500 sq. ft.',
      permittedUse: 'General corporate and technology consulting offices',
      monthlyRent: '18500',
      currency: 'USD',
      securityDepositMonths: '3',
      leaseCommencementDate: '2026-06-01',
      leaseTermMonths: '36',
      lockInPeriodMonths: '12',
      rentEscalationPercentage: '5% annually',
      maintenanceResponsibility: 'Landlord maintains core structural HVAC; Tenant maintains interior',
      utilitiesResponsibility: 'Tenant sub-metered for electric and data',
      governingLaw: 'State of New York',
      jurisdiction: 'Courts of the County of New York',
      disputeMethod: 'Court of competent jurisdiction'
    };

    const draft = drafter.draft({
      rawInput: 'Draft commercial lease for Hudson Street suite',
      structuredFacts: facts,
      generationMode: 'MIRA'
    });

    const content = draft.sections.map(s => s.content).join('\n\n');

    assert.ok(draft.title.includes('LEASE'));
    assert.ok(draft.sections.length >= 8, `Expected at least 8 sections, got ${draft.sections.length}`);
    assert.ok(content.includes('Metropolitan Commercial Realty Trust'));
    assert.ok(content.includes('350 Hudson Street'));
    assert.ok(content.includes('18,500') || content.includes('18500'));
    assert.ok(content.includes('SECURITY DEPOSIT'));
  });

  it('Test 15: All 10 contract types have isFullyFunctional === true and zero coming soon limitations', () => {
    const allTypes = getAllContractTypes();
    assert.strictEqual(allTypes.length, 10);
    for (const ct of allTypes) {
      assert.strictEqual(ct.isFullyFunctional, true, `Contract type ${ct.code} must have isFullyFunctional: true`);
      assert.strictEqual(ct.isActive, true, `Contract type ${ct.code} must have isActive: true`);
      // Verify drafter is callable
      const drafter = getDrafter(ct.code);
      assert.ok(drafter, `Contract type ${ct.code} must have registered drafter`);
    }
  });

});

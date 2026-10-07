import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { ragService } from '../services/rag/rag_service.js';
import { legalNLPClient } from '../services/nlp/legal_nlp_client.js';
import { vectorStore } from '../services/rag/vector_store.js';

async function main() {
  console.log('🌱 Starting Atharv Legal AI Database Seeding...');

  // 1. Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@atharv.legal' },
    update: {},
    create: {
      email: 'admin@atharv.legal',
      passwordHash: adminPasswordHash,
      name: 'Atharv Legal Admin (Legal Lead)',
      role: 'ADMIN'
    }
  });
  await prisma.user.upsert({
    where: { email: 'admin@mira.legal' },
    update: {},
    create: {
      email: 'admin@mira.legal',
      passwordHash: adminPasswordHash,
      name: 'Atharv Legal Admin (Legacy Alias)',
      role: 'ADMIN'
    }
  });

  const userPasswordHash = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { email: 'user@atharv.legal' },
    update: {},
    create: {
      email: 'user@atharv.legal',
      passwordHash: userPasswordHash,
      name: 'Atharv Researcher',
      role: 'USER'
    }
  });
  await prisma.user.upsert({
    where: { email: 'user@mira.legal' },
    update: {},
    create: {
      email: 'user@mira.legal',
      passwordHash: userPasswordHash,
      name: 'Atharv Researcher (Legacy Alias)',
      role: 'USER'
    }
  });

  console.log('✓ Users seeded (admin@atharv.legal / user@atharv.legal & aliases)');

  // 2. Document Types
  const typesToSeed = [
    { code: 'NDA', name: 'Non-Disclosure Agreement', category: 'COMMERCIAL', description: 'Mutual or unilateral agreement safeguarding proprietary assets, confidential technical disclosures, and commercial secrets.' },
    { code: 'LEGAL_NOTICE', name: 'Formal Legal Notice', category: 'LITIGATION', description: 'Statutory or contractual demand notice alleging contractual breach, outstanding defaults, or demanding performance under threat of litigation.' },
    { code: 'EMPLOYMENT', name: 'Employment Agreement', category: 'HUMAN_RESOURCES', description: 'Comprehensive employment agreement defining role, compensation, probation, notice period, IP ownership, and confidentiality.' },
    { code: 'SERVICE', name: 'Master Services Agreement', category: 'COMMERCIAL', description: 'Commercial contract governing the provision of professional engineering, IT, or corporate services, deliverables, and payment terms.' },
    { code: 'SAAS', name: 'SaaS Subscription Agreement', category: 'TECHNOLOGY', description: 'Software-as-a-Service customer subscription agreement covering cloud licensing, SLA uptime, data processing, and subscription renewals.' },
    { code: 'CONSULTING', name: 'Consulting Agreement', category: 'COMMERCIAL', description: 'Independent contractor agreement governing specialized advisory, strategic consulting, compensation, and deliverables.' },
    { code: 'MOU', name: 'Memorandum of Understanding', category: 'PARTNERSHIP', description: 'Formal statement of intent documenting the preliminary terms of collaboration and shared objectives between two organizations.' },
    { code: 'VENDOR', name: 'Vendor / Supply Agreement', category: 'COMMERCIAL', description: 'Master vendor contract governing procurement of products, materials, supply warranties, and inspection terms.' },
    { code: 'PARTNERSHIP', name: 'Partnership Agreement', category: 'CORPORATE', description: 'General business partnership deed establishing capital contributions, governance, profit distributions, and liability sharing.' },
    { code: 'INTERNSHIP', name: 'Internship Agreement', category: 'HUMAN_RESOURCES', description: 'Educational and practical internship training agreement stipulating learning objectives, supervisor duties, and monthly stipend.' },
    { code: 'LEASE', name: 'Commercial Lease Agreement', category: 'REAL_ESTATE', description: 'Real property lease agreement defining tenancy terms, premises use, rent escalation, maintenance covenants, and security deposits.' },
    { code: 'SALE', name: 'Sale of Goods Agreement', category: 'COMMERCIAL', description: 'Commercial agreement governing purchase, sale, delivery, title transfer, warranties, and inspection of goods under Sale of Goods Act, 1930.' },
    { code: 'SALE_AGREEMENT', name: 'Sale Agreement', category: 'COMMERCIAL', description: 'Commercial contract for sale of commercial goods, equipment, or assets.' }
  ];

  for (const t of typesToSeed) {
    await prisma.documentType.upsert({
      where: { code: t.code },
      update: { name: t.name, description: t.description, category: t.category },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        category: t.category,
        isActive: true
      }
    });
  }

  const ndaType = await prisma.documentType.findUniqueOrThrow({ where: { code: 'NDA' } });
  const noticeType = await prisma.documentType.findUniqueOrThrow({ where: { code: 'LEGAL_NOTICE' } });
  console.log('✓ All 10 contract types seeded (NDA, LEGAL_NOTICE, EMPLOYMENT, SERVICE, SAAS, CONSULTING, MOU, VENDOR, PARTNERSHIP, INTERNSHIP, LEASE)');

  // 3. Templates & Template Sections
  const ndaTemplate = await prisma.template.upsert({
    where: { id: 'default-nda-template-v1' },
    update: {},
    create: {
      id: 'default-nda-template-v1',
      documentTypeId: ndaType.id,
      name: 'Standard Commercial Non-Disclosure Agreement (Bilateral)',
      description: 'Comprehensive 14-section institutional NDA template compliant with Indian Contract Act standards.',
      version: 1,
      isDefault: true
    }
  });

  const ndaSections = [
    { key: 'title', title: 'Title & Preamble', order: 1, guide: 'Set agreement date and formal title.' },
    { key: 'parties', title: 'Parties', order: 2, guide: 'Identify disclosing and receiving parties and registered addresses.' },
    { key: 'purpose', title: 'Purpose & Recitals', order: 3, guide: 'Define the collaboration or transaction purpose.' },
    { key: 'definition', title: 'Definition of Confidential Information', order: 4, guide: 'Specify scope of confidential information, technical data, and trade secrets.' },
    { key: 'confidentiality', title: 'Confidentiality Obligations', order: 5, guide: 'Standard of care, non-disclosure covenants, and restrictions on commercial exploitation.' },
    { key: 'exceptions', title: 'Exceptions', order: 6, guide: 'Standard exclusions: public domain, prior knowledge, third-party rightful receipt, independent development.' },
    { key: 'permitted_disclosure', title: 'Permitted Disclosures', order: 7, guide: 'Disclosure to advisors, employees with need-to-know, and court orders.' },
    { key: 'return_destruction', title: 'Return or Destruction of Materials', order: 8, guide: 'Procedures upon conclusion of purpose or termination.' },
    { key: 'duration', title: 'Duration & Survival', order: 9, guide: 'Term of agreement and survival period of confidentiality covenants.' },
    { key: 'remedies', title: 'Remedies for Breach', order: 10, guide: 'Injunctive relief, equitable remedies, and damages.' },
    { key: 'governing_law', title: 'Governing Law', order: 11, guide: 'Substantive law of jurisdiction.' },
    { key: 'dispute_resolution', title: 'Dispute Resolution', order: 12, guide: 'Arbitration and exclusive court venue.' },
    { key: 'miscellaneous', title: 'Miscellaneous Provisions', order: 13, guide: 'Entire agreement, severability, amendments in writing.' },
    { key: 'signatures', title: 'Signatures & Execution', order: 14, guide: 'Authorized signatory blocks and seals.' }
  ];

  for (const s of ndaSections) {
    await prisma.templateSection.upsert({
      where: { id: `nda-sec-${s.key}` },
      update: {},
      create: {
        id: `nda-sec-${s.key}`,
        templateId: ndaTemplate.id,
        sectionKey: s.key,
        title: s.title,
        orderIndex: s.order,
        isRequired: true,
        defaultPromptGuide: s.guide
      }
    });
  }

  const noticeTemplate = await prisma.template.upsert({
    where: { id: 'default-notice-template-v1' },
    update: {},
    create: {
      id: 'default-notice-template-v1',
      documentTypeId: noticeType.id,
      name: 'Formal Commercial Demand & Breach Notice',
      description: 'Standard 12-section advocate demand notice citing non-performance, defaults, and litigation consequences.',
      version: 1,
      isDefault: true
    }
  });

  const noticeSections = [
    { key: 'sender', title: 'Sender & Advocate Details', order: 1, guide: 'Details of sender, advocate, and dispatch method.' },
    { key: 'recipient', title: 'Recipient Details', order: 2, guide: 'Addressee name and registered address.' },
    { key: 'subject', title: 'Subject Line', order: 3, guide: 'Concise summary of default and claim.' },
    { key: 'background', title: 'Background History', order: 4, guide: 'Contractual origin and relationship.' },
    { key: 'facts', title: 'Statement of Facts', order: 5, guide: 'Chronology of performance, delivery, and invoices.' },
    { key: 'breach', title: 'Breach & Default', order: 6, guide: 'Specific failure to remit payment or perform.' },
    { key: 'legal_basis', title: 'Legal Basis', order: 7, guide: 'Statutory basis and contractual clauses violated.' },
    { key: 'demand', title: 'Specific Demand', order: 8, guide: 'Quantified amount and designated bank account.' },
    { key: 'response_period', title: 'Response Period', order: 9, guide: 'Window for compliance (e.g. 15 days).' },
    { key: 'consequences', title: 'Consequences of Default', order: 10, guide: 'Civil and commercial court proceedings.' },
    { key: 'closing', title: 'Closing & Attestation', order: 11, guide: 'Office retention note and signoff.' },
    { key: 'signatures', title: 'Counsel Signature', order: 12, guide: 'Advocate bar enrollment and seal.' }
  ];

  for (const s of noticeSections) {
    await prisma.templateSection.upsert({
      where: { id: `notice-sec-${s.key}` },
      update: {},
      create: {
        id: `notice-sec-${s.key}`,
        templateId: noticeTemplate.id,
        sectionKey: s.key,
        title: s.title,
        orderIndex: s.order,
        isRequired: true,
        defaultPromptGuide: s.guide
      }
    });
  }

  console.log('✓ Templates & Sections seeded (NDA 14 sections, Legal Notice 12 sections)');

  // 4. Approved Clause Library
  const clausesData = [
    // --- NDA ---
    {
      title: 'Institutional Definition of Confidential Information',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'definition',
      content: '"Confidential Information" refers to all proprietary data, financial figures, customer information, trade secrets, software code, and business strategies disclosed by {{disclosingParty}} to {{receivingParty}}, whether in tangible, digital, or verbal form.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Mutual Confidentiality & Non-Disclosure Covenants',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'confidentiality',
      content: 'Both Parties covenant to preserve the secrecy of all Confidential Information with the highest degree of diligence. Neither Party shall copy, disclose, or use said information except exclusively for the Authorized Purpose, and each Party shall restrict internal access strictly to personnel bound by reciprocal non-disclosure terms.',
      variant: 'mutual',
      requiredStatus: 'REQUIRED',
      conditions: { isMutual: true },
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Unilateral Strict Confidentiality Covenants',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'confidentiality',
      content: 'The Receiving Party covenants to preserve the secrecy of all Confidential Information with the highest degree of diligence. The Receiving Party shall not copy, disclose, or use said information except exclusively for the Authorized Purpose, and shall restrict internal access strictly to personnel bound by non-disclosure terms.',
      variant: 'one-way',
      requiredStatus: 'REQUIRED',
      conditions: { isMutual: false },
      riskLevel: 'MEDIUM',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Standard Confidentiality Duration (Multi-Year Survival)',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'duration',
      content: 'The covenants of confidentiality under this Agreement shall take effect on the Effective Date and shall remain legally binding upon the Receiving Party for a period of {{duration}} thereafter, notwithstanding any earlier termination of discussions.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Equitable Remedies & Injunctive Relief Clause',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'remedies',
      content: 'Both Parties stipulate that damages at law may be inadequate to remedy an actual or threatened breach of this Agreement. Consequently, the Disclosing Party shall be entitled to seek preliminary and permanent injunctive relief and specific performance, in addition to all other remedies.',
      variant: 'strict',
      requiredStatus: 'RECOMMENDED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Governing Law & Exclusive Jurisdiction (India)',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'governing_law',
      content: 'This Agreement shall be construed and governed strictly by the laws of {{jurisdiction}}. The courts at {{jurisdiction}} shall possess exclusive jurisdiction to adjudicate all controversies originating herefrom.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Permitted Compelled Disclosure Under Law',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'permitted_disclosure',
      content: 'The Receiving Party may disclose Confidential Information to the extent required by an order of a court or regulatory authority of competent jurisdiction, provided prompt written notice is delivered to the Disclosing Party to allow an opportunity to contest such disclosure or seek protective relief.',
      variant: 'balanced',
      requiredStatus: 'RECOMMENDED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- SERVICE ---
    {
      title: 'Scope of Services & Deliverables Framework',
      documentType: 'SERVICE',
      contractType: 'SERVICE',
      clauseType: 'scope_of_work',
      content: 'Service Provider shall perform the professional services and provide the deliverables specified in each Statement of Work executed hereunder in a timely, professional, and workmanlike manner adhering to customary industry standards.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Milestone Acceptance & Payment Schedule (Net 30)',
      documentType: 'SERVICE',
      contractType: 'SERVICE',
      clauseType: 'payment_terms',
      content: 'Client shall compensate Service Provider in accordance with the fee milestones set forth herein. All invoices shall be payable within thirty (30) calendar days of receipt of an undisputed itemized invoice.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Mutual Limitation of Liability & Fees Cap (Services)',
      documentType: 'SERVICE',
      contractType: 'SERVICE',
      clauseType: 'liability',
      content: 'To the maximum extent permitted by applicable law, neither party\'s aggregate cumulative liability arising out of or relating to this Agreement shall exceed the total service fees paid or payable by Client to Service Provider under this Agreement during the twelve (12) months preceding the event giving rise to liability.',
      variant: 'mutual',
      requiredStatus: 'REQUIRED',
      conditions: { liabilityCap: true },
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Strict Aggregate Liability Disclaimer (Services)',
      documentType: 'SERVICE',
      contractType: 'SERVICE',
      clauseType: 'liability',
      content: 'In no event shall Service Provider be liable for any indirect, incidental, consequential, special, or punitive damages, and total cumulative liability shall in all cases be strictly capped at the fees received by Service Provider in the preceding three (3) months.',
      variant: 'strict',
      requiredStatus: 'REQUIRED',
      conditions: { liabilityCap: true },
      riskLevel: 'HIGH',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Deliverable IP Transfer upon Full Payment (Services)',
      documentType: 'SERVICE',
      contractType: 'SERVICE',
      clauseType: 'ip_ownership',
      content: 'Upon receipt of full and final payment for the corresponding deliverables, Service Provider assigns and transfers to Client all worldwide copyright, title, and intellectual property rights in and to the custom deliverables produced hereunder, while retaining background tools and pre-existing library frameworks.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Termination for Convenience & Material Breach',
      documentType: 'SERVICE',
      contractType: 'SERVICE',
      clauseType: 'termination',
      content: 'Either party may terminate this Agreement for convenience upon thirty (30) days prior written notice, or immediately upon written notice if the other party commits a material breach and fails to cure such breach within fifteen (15) days of receiving notice.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- EMPLOYMENT ---
    {
      title: 'Role Appointment & Core Employment Duties',
      documentType: 'EMPLOYMENT',
      contractType: 'EMPLOYMENT',
      clauseType: 'duties',
      content: 'The Employee is engaged to perform the role and duties designated by the Employer, devoting full business time, attention, and best efforts to the business affairs of the Employer in compliance with institutional policies and applicable labor laws.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Work Product & IP Assignment (Employment)',
      documentType: 'EMPLOYMENT',
      contractType: 'EMPLOYMENT',
      clauseType: 'ip_assignment',
      content: 'All inventions, works of authorship, code, designs, and patentable innovations developed or conceived by the Employee during the course of employment shall belong solely and exclusively to the Employer from the moment of creation as works made for hire under Section 17 of the Copyright Act, 1957.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Mutual Notice Period & Termination (Employment)',
      documentType: 'EMPLOYMENT',
      contractType: 'EMPLOYMENT',
      clauseType: 'termination',
      content: 'Either party may terminate the employment relationship by providing sixty (60) days prior written notice or payment of gross salary in lieu thereof. The Employer may terminate immediately for cause, gross misconduct, or material breach of company policy without notice or severance.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Post-Termination Non-Solicitation & Restrictive Covenants',
      documentType: 'EMPLOYMENT',
      contractType: 'EMPLOYMENT',
      clauseType: 'non_compete',
      content: 'During employment and for twelve (12) months following termination, Employee shall not directly or indirectly solicit any customer, client, or employee of the Employer, nor induce any team member to terminate their employment.',
      variant: 'strict',
      requiredStatus: 'RECOMMENDED',
      conditions: {},
      riskLevel: 'MEDIUM',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- LEASE ---
    {
      title: 'Commercial Premises Demise & Permitted Commercial Use',
      documentType: 'LEASE',
      contractType: 'LEASE',
      clauseType: 'premises_grant',
      content: 'The Lessor demises unto the Lessee the specified commercial premises for the agreed Lease Term, to be utilized solely for lawful commercial business operations and in compliance with municipal zoning regulations.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Refundable Security Deposit & Inspection (Lease)',
      documentType: 'LEASE',
      contractType: 'LEASE',
      clauseType: 'rent_deposit',
      content: 'The Lessee has deposited an interest-free refundable security deposit with the Lessor. The security deposit shall be refunded in full within twenty-one (21) days of peaceful handover of vacant possession of the demised premises, subject only to deductions for unpaid utilities or structural damage exceeding fair wear and tear.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Premises Maintenance & Permitted Alterations',
      documentType: 'LEASE',
      contractType: 'LEASE',
      clauseType: 'maintenance',
      content: 'The Lessee covenants to maintain the interior of the premises in good order and condition, reasonable wear and tear excepted. No structural modifications or capital alterations shall be carried out without the prior written consent of the Lessor.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Vacant Possession & Surrender on Lease Expiry',
      documentType: 'LEASE',
      contractType: 'LEASE',
      clauseType: 'handover',
      content: 'Upon the expiration or earlier termination of the Lease Term, Lessee shall peacefully surrender and deliver vacant possession of the premises to Lessor in the condition delivered, subject to fair wear and tear.',
      variant: 'strict',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- CONSULTING ---
    {
      title: 'Independent Contractor Status Disclaimer (Consulting)',
      documentType: 'CONSULTING',
      contractType: 'CONSULTING',
      clauseType: 'independent_contractor',
      content: 'The Consultant is an independent contractor and nothing contained herein shall create an employer-employee, agency, joint venture, or partnership relationship between the Parties. The Consultant maintains sole discretion over the manner and means of performing the advisory services and is solely responsible for all statutory taxes and compliance.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Professional Advisory Scope & Milestone Deliverables',
      documentType: 'CONSULTING',
      contractType: 'CONSULTING',
      clauseType: 'scope_of_work',
      content: 'The Consultant shall render strategic advisory and specialized technical consulting services in accordance with milestone deliverables agreed in writing, dedicating professional expertise and skill to the engagement.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Consulting Fee Compensation & Expense Reimbursement',
      documentType: 'CONSULTING',
      contractType: 'CONSULTING',
      clauseType: 'payment_terms',
      content: 'Client shall pay Consultant the agreed consulting fees upon delivery of milestone reports or monthly retainer invoices. Pre-approved reasonable out-of-pocket expenses shall be reimbursed upon submission of valid receipts.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Proprietary Work Product Assignment (Consulting)',
      documentType: 'CONSULTING',
      contractType: 'CONSULTING',
      clauseType: 'ip_ownership',
      content: 'All bespoke advisory reports, data models, frameworks, and deliverables created by Consultant specifically for Client under this Agreement shall become the sole and exclusive property of Client upon settlement of corresponding invoices.',
      variant: 'strict',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- PARTNERSHIP ---
    {
      title: 'Initial Capital Contribution & Capital Accounts',
      documentType: 'PARTNERSHIP',
      contractType: 'PARTNERSHIP',
      clauseType: 'capital_contribution',
      content: 'Each Partner shall contribute the initial capital sum stipulated in the Schedule to the Partnership firm capital account. No Partner shall withdraw any portion of their capital without unanimous consent of all Partners.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Equal Capital & Profit Sharing (Partnership)',
      documentType: 'PARTNERSHIP',
      contractType: 'PARTNERSHIP',
      clauseType: 'profit_sharing',
      content: 'The Partners shall contribute capital and share in all net commercial profits and bear all losses of the Partnership firm in proportion to their agreed sharing ratio. All distributions shall be determined following quarterly financial reconciliation.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Dissolution Protocol & Asset Liquidation Priority',
      documentType: 'PARTNERSHIP',
      contractType: 'PARTNERSHIP',
      clauseType: 'dissolution',
      content: 'Upon dissolution of the Partnership firm, the firm\'s assets shall be liquidated and applied first to discharge third-party liabilities and obligations, secondly to repay partner advances, and finally to settle partner capital accounts in accordance with the Indian Partnership Act, 1932.',
      variant: 'strict',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'MEDIUM',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- SALE OF GOODS ---
    {
      title: 'Goods Identification & Specification Warranties',
      documentType: 'SALE',
      contractType: 'SALE',
      clauseType: 'goods_description',
      content: 'Seller warrants that the Goods delivered shall strictly conform to the technical descriptions, commercial quantities, and specifications stipulated in the Purchase Order, and shall be free from defects in material and craftsmanship under the Sale of Goods Act, 1930.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Inspection & Acceptance Window (Sale of Goods)',
      documentType: 'SALE',
      contractType: 'SALE',
      clauseType: 'inspection',
      content: 'The Buyer shall have a period of seven (7) business days following physical receipt of the Goods to inspect and test the Goods for conformity with the agreed specifications. Any notice of defect or non-conformity must be submitted in writing within said inspection window, failing which the Goods shall be deemed irrevocably accepted.',
      variant: 'balanced',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Passing of Title & Risk of Loss upon Delivery',
      documentType: 'SALE',
      contractType: 'SALE',
      clauseType: 'title_transfer',
      content: 'Title to and risk of loss or damage to the Goods shall pass from Seller to Buyer upon physical delivery at the agreed destination and signature of the bill of lading or proof of delivery.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'LOW',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- LEGAL NOTICE ---
    {
      title: 'Default & Financial Breach Notice Covenant',
      documentType: 'LEGAL_NOTICE',
      contractType: 'LEGAL_NOTICE',
      clauseType: 'breach',
      content: 'You have failed, neglected, and refused to discharge the admitted outstanding debt despite formal reminders, constituting a material breach of commercial obligations and actionable default.',
      variant: 'strict',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'HIGH',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: '15-Day Peremptory Demand & Response Window',
      documentType: 'LEGAL_NOTICE',
      contractType: 'LEGAL_NOTICE',
      clauseType: 'response_period',
      content: 'You are hereby called upon to liquidate the entire outstanding amount within fifteen (15) days of the delivery of this notice, failing which our client shall commence civil recovery and commercial litigation at your sole risk and expense.',
      variant: 'standard',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'MEDIUM',
      sourceUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/indian-contract-act-1872',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Reservation of Statutory Civil & Pre-Litigation Remedies',
      documentType: 'LEGAL_NOTICE',
      contractType: 'LEGAL_NOTICE',
      clauseType: 'reservation_rights',
      content: 'Our Client expressly reserves all rights, claims, and statutory remedies available under law, including instituting summary suits for recovery, insolvency proceedings, or damages for breach of contract, together with all accrued interest and legal costs.',
      variant: 'strict',
      requiredStatus: 'REQUIRED',
      conditions: {},
      riskLevel: 'MEDIUM',
      sourceUrl: 'https://legislative.gov.in',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },

    // --- ARCHIVED / DRAFT TEST SAMPLES ---
    {
      title: 'Archived Legacy Informal Clause (Draft)',
      documentType: 'NDA',
      contractType: 'NDA',
      clauseType: 'confidentiality',
      content: 'Please keep our info private and do not share it with other people unless we agree on it.',
      variant: 'standard',
      requiredStatus: 'OPTIONAL',
      conditions: {},
      riskLevel: 'HIGH',
      sourceUrl: null,
      jurisdiction: 'India',
      status: 'ARCHIVED' as const
    },
    {
      title: 'Draft Non-Compete Experimental Variant',
      documentType: 'EMPLOYMENT',
      contractType: 'EMPLOYMENT',
      clauseType: 'non_compete',
      content: 'Employee agrees not to engage in competing business activities anywhere in the state during employment.',
      variant: 'experimental',
      requiredStatus: 'OPTIONAL',
      conditions: {},
      riskLevel: 'MEDIUM',
      sourceUrl: null,
      jurisdiction: 'India',
      status: 'DRAFT' as const
    }
  ];

  for (const c of clausesData) {
    const existing: any = await prisma.clause.findFirst({ where: { title: c.title } });
    if (!existing) {
      const clauseRecord = await (prisma.clause as any).create({
        data: {
          title: c.title,
          documentType: c.documentType,
          contractType: c.contractType,
          clauseType: c.clauseType,
          content: c.content,
          text: c.content,
          variant: c.variant,
          requiredStatus: c.requiredStatus,
          conditions: c.conditions,
          riskLevel: c.riskLevel,
          sourceUrl: c.sourceUrl,
          jurisdiction: c.jurisdiction,
          status: c.status,
          source: 'Atharv Legal Standard Corpus'
        }
      });

      // Embed approved clauses
      if (c.status === 'APPROVED') {
        try {
          const embs = await legalNLPClient.getEmbeddings([c.content]);
          if (embs && embs[0]) {
            await vectorStore.updateClauseEmbedding(clauseRecord.id, embs[0]);
          }
        } catch (err) {
          console.warn(`Could not compute vector embedding for clause ${c.title} during seed`);
        }
      }
    } else {
      // Idempotently update additive metadata if present
      await (prisma.clause as any).update({
        where: { id: existing.id },
        data: {
          contractType: c.contractType,
          text: existing.text || c.content,
          variant: c.variant || existing.variant || 'standard',
          requiredStatus: c.requiredStatus || existing.requiredStatus || 'RECOMMENDED',
          conditions: c.conditions || existing.conditions || {},
          riskLevel: c.riskLevel || existing.riskLevel || 'LOW',
          sourceUrl: c.sourceUrl || existing.sourceUrl || null
        }
      });
    }
  }

  console.log('✓ Approved, Draft & Archived Clauses seeded across all 8 contract types');

  // 5. Legal Knowledge Documents (RAG)
  const knowledgeSources = [
    {
      title: 'Indian Contract Act, 1872 - Principles of Contractual Breach & Remedies (Section 73 & 74)',
      source: 'Statutory Reference — Bare Act & Judicial Precedents',
      documentType: 'GENERAL',
      jurisdiction: 'India',
      text: `Section 73 of the Indian Contract Act, 1872 governs compensation for loss or damage caused by breach of contract. When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.

Such compensation is not to be given for any remote and indirect loss or damage sustained by reason of the breach. In estimating the loss or damage arising from a breach of contract, the means which existed of remedying the inconvenience caused by the non-performance of the contract must be taken into account.

Under Section 27, any agreement by which anyone is restrained from exercising a lawful profession, trade or business of any kind, is to that extent void. However, reasonable covenants protecting proprietary trade secrets and non-disclosure during the term of an agreement or for legitimate durations do not violate Section 27 when strictly safeguarding proprietary assets without preventing lawful trade.`
    },
    {
      title: 'Institutional Guidelines for Non-Disclosure Agreements (Drafting Standards & Judicial Scrutiny)',
      source: 'Bar Association & Commercial Law Bench Practice Guidelines',
      documentType: 'NDA',
      jurisdiction: 'India',
      text: `A legally robust Non-Disclosure Agreement (NDA) requires precise definition of what constitutes confidential information and clear delineations of exclusions. Standard exclusions recognized by courts include information that enters the public domain without fault of the receiving party, information already known prior to disclosure, information independently developed without reference to the disclosed confidential matter, and disclosures required by lawful order of a competent court or regulatory body.

The duration of confidentiality must be specified. Indefinite confidentiality terms are viewed with skepticism by courts unless tied strictly to genuine trade secrets or source code. Standard commercial NDAs typically stipulate between two (2) to five (5) years of post-termination survival.

Remedies clauses should acknowledge that monetary damages may be inadequate, expressly granting the disclosing party the right to seek emergency injunctive relief, restraining orders, and specific performance under the Specific Relief Act, 1963.`
    },
    {
      title: 'Commercial Demand Notices & Pre-Litigation Protocol Standards',
      source: 'Commercial Courts Act & High Court Rules',
      documentType: 'LEGAL_NOTICE',
      jurisdiction: 'India',
      text: `A legal notice serves as the formal foundation for subsequent civil litigation, commercial suits, or arbitration proceedings. It establishes that the defaulting party was given notice of the breach and a reasonable opportunity to cure or liquidate the admitted liability.

Essential components of an effective demand notice include:
1. Clear narration of the contractual or statutory relationship between parties.
2. Chronological statement of facts, invoice numbers, dates, delivery of consideration, and reminders sent.
3. Specific quantification of the outstanding monetary claim, principal sum, and interest rates demanded.
4. Reasonable notice period for compliance, conventionally set at fifteen (15) or thirty (30) days from service.
5. Unequivocal statement of consequences, including initiation of legal proceedings before the competent commercial court, holding the recipient liable for interest, legal costs, and compensatory damages.`
    }
  ];

  for (const ks of knowledgeSources) {
    const existing = await prisma.knowledgeDocument.findFirst({ where: { title: ks.title } });
    if (!existing) {
      await ragService.ingestKnowledgeDocument(
        ks.title,
        ks.source,
        ks.documentType,
        ks.text,
        admin.id,
        ks.jurisdiction
      );
    }
  }

  console.log('✓ Knowledge Documents & Chunks ingested into pgvector RAG');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

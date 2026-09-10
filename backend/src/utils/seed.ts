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
  const ndaType = await prisma.documentType.upsert({
    where: { code: 'NDA' },
    update: {},
    create: {
      code: 'NDA',
      name: 'Non-Disclosure Agreement',
      description: 'Mutual or unilateral agreement safeguarding proprietary assets, confidential technical disclosures, and commercial secrets.'
    }
  });

  const noticeType = await prisma.documentType.upsert({
    where: { code: 'LEGAL_NOTICE' },
    update: {},
    create: {
      code: 'LEGAL_NOTICE',
      name: 'Formal Legal Notice',
      description: 'Statutory or contractual demand notice alleging contractual breach, outstanding defaults, or demanding performance under threat of litigation.'
    }
  });

  console.log('✓ Document types seeded (NDA, LEGAL_NOTICE)');

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
    {
      title: 'Institutional Definition of Confidential Information',
      documentType: 'NDA',
      clauseType: 'definition',
      content: '"Confidential Information" refers to all proprietary data, financial figures, customer information, trade secrets, software code, and business strategies disclosed by {{disclosingParty}} to {{receivingParty}}, whether in tangible, digital, or verbal form.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Standard Strict Confidentiality Covenants',
      documentType: 'NDA',
      clauseType: 'confidentiality',
      content: 'The Receiving Party covenants to preserve the secrecy of all Confidential Information with the highest degree of diligence. The Receiving Party shall not copy, disclose, or use said information except exclusively for the Authorized Purpose, and shall restrict internal access strictly to personnel bound by non-disclosure terms.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Standard Confidentiality Duration (Multi-Year Survival)',
      documentType: 'NDA',
      clauseType: 'duration',
      content: 'The covenants of confidentiality under this Agreement shall take effect on the Effective Date and shall remain legally binding upon the Receiving Party for a period of {{duration}} thereafter, notwithstanding any earlier termination of discussions.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Equitable Remedies & Injunctive Relief Clause',
      documentType: 'NDA',
      clauseType: 'remedies',
      content: 'Both Parties stipulate that damages at law may be inadequate to remedy an actual or threatened breach of this Agreement. Consequently, the Disclosing Party shall be entitled to seek preliminary and permanent injunctive relief and specific performance, in addition to all other remedies.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Governing Law & Exclusive Jurisdiction (India)',
      documentType: 'NDA',
      clauseType: 'governing_law',
      content: 'This Agreement shall be construed and governed strictly by the laws of {{jurisdiction}}. The courts at {{jurisdiction}} shall possess exclusive jurisdiction to adjudicate all controversies originating herefrom.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Default & Financial Breach Notice Covenant',
      documentType: 'LEGAL_NOTICE',
      clauseType: 'breach',
      content: 'You have failed, neglected, and refused to discharge the admitted outstanding debt despite formal reminders, constituting a material breach of commercial obligations and actionable default.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: '15-Day Peremptory Demand & Response Window',
      documentType: 'LEGAL_NOTICE',
      clauseType: 'response_period',
      content: 'You are hereby called upon to liquidate the entire outstanding amount within fifteen (15) days of the delivery of this notice, failing which our client shall commence civil recovery and commercial litigation at your sole risk and expense.',
      jurisdiction: 'India',
      status: 'APPROVED' as const
    },
    {
      title: 'Archived Legacy Informal Clause (Draft)',
      documentType: 'NDA',
      clauseType: 'confidentiality',
      content: 'Please keep our info private and do not share it with other people unless we agree on it.',
      jurisdiction: 'India',
      status: 'ARCHIVED' as const
    }
  ];

  for (const c of clausesData) {
    const existing = await prisma.clause.findFirst({ where: { title: c.title } });
    if (!existing) {
      const clauseRecord = await prisma.clause.create({
        data: {
          title: c.title,
          documentType: c.documentType,
          clauseType: c.clauseType,
          content: c.content,
          jurisdiction: c.jurisdiction,
          status: c.status,
          source: 'Atharv Legal Standard Corpus'
        }
      });

      // Embed approved clauses
      try {
        const embs = await legalNLPClient.getEmbeddings([c.content]);
        if (embs && embs[0]) {
          await vectorStore.updateClauseEmbedding(clauseRecord.id, embs[0]);
        }
      } catch (err) {
        console.warn(`Could not compute vector embedding for clause ${c.title} during seed`);
      }
    }
  }

  console.log('✓ Approved & Archived Clauses seeded');

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

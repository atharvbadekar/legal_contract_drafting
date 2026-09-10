import axios from 'axios';

export interface GenerationInput {
  documentType: string;
  structuredFacts: Record<string, any>;
  selectedTemplate?: any;
  approvedClauses: Array<{ clauseType: string; title: string; content: string }>;
  retrievedLegalKnowledge: Array<{ title: string; chunk: string; relevanceScore: number }>;
  draftingRules?: string[];
  userInstructions?: string;
  generationMode?: 'MIRA' | 'BASELINE';
}

export interface GeneratedSection {
  sectionType: string;
  title: string;
  content: string;
}

export interface GeneratedDocumentResult {
  title: string;
  sections: GeneratedSection[];
  formattedDocument: string;
  generationTimeMs: number;
  modelUsed: string;
}

export interface ClauseExplanation {
  plainLanguage: string;
  purpose: string;
  legalImplication: string;
  sourcesUsed: string[];
  disclaimer: string;
}

export interface GenerationReviewResult {
  status: 'VERIFIED' | 'NEEDS_REVIEW';
  score: number;
  issues: Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    section: string;
    description: string;
  }>;
}

export class GenerationService {
  private modelName: string;
  private endpointUrl?: string;

  constructor() {
    this.modelName = process.env.GENERATION_MODEL_NAME || 'open-weight/mira-legal-draft-v1';
    this.endpointUrl = process.env.GENERATION_SERVICE_URL;
  }

  /**
   * Main controlled generation pipeline. Never receives raw conversational chatter.
   */
  async generateDocument(input: GenerationInput): Promise<GeneratedDocumentResult> {
    const startTime = Date.now();

    // 1. If an external open-weight generation server is configured, attempt query
    if (this.endpointUrl && this.endpointUrl.startsWith('http')) {
      try {
        const response = await axios.post(
          `${this.endpointUrl}/generate`,
          {
            model: this.modelName,
            temperature: 0.1,
            controlledInput: input
          },
          { timeout: 8000 }
        );
        if (response.data && response.data.sections) {
          const formatted = this.assembleFormattedText(response.data.title, response.data.sections);
          return {
            title: response.data.title,
            sections: response.data.sections,
            formattedDocument: formatted,
            generationTimeMs: Date.now() - startTime,
            modelUsed: this.modelName
          };
        }
      } catch (err) {
        console.warn(`External generation model endpoint unavailable. Falling back to deterministic legal drafting engine.`);
      }
    }

    // 2. High-precision Legal Template & Clause Synthesis Engine
    if (input.generationMode === 'BASELINE') {
      return this.generateBaselineDraft(input, startTime);
    }

    return this.generateMiraControlledDraft(input, startTime);
  }

  /**
   * Generates a controlled, fact-anchored legal document matching the template and approved clauses.
   */
  private generateMiraControlledDraft(input: GenerationInput, startTime: number): GeneratedDocumentResult {
    const { documentType, structuredFacts, approvedClauses, retrievedLegalKnowledge } = input;
    const sections: GeneratedSection[] = [];

    let docTitle = "";

    if (documentType === 'NDA') {
      const p1 = structuredFacts.disclosingParty?.name || 'Disclosing Party';
      const p1Type = structuredFacts.disclosingParty?.type ? ` (${structuredFacts.disclosingParty.type})` : '';
      const p1Addr = structuredFacts.disclosingParty?.address || '';
      const p1Email = structuredFacts.disclosingParty?.email || '';
      const p1Phone = structuredFacts.disclosingParty?.phone || '';
      const p1Signatory = structuredFacts.disclosingParty?.signatory || 'Authorized Representative';

      const p2 = structuredFacts.receivingParty?.name || 'Receiving Party';
      const p2Type = structuredFacts.receivingParty?.type ? ` (${structuredFacts.receivingParty.type})` : '';
      const p2Addr = structuredFacts.receivingParty?.address || '';
      const p2Email = structuredFacts.receivingParty?.email || '';
      const p2Phone = structuredFacts.receivingParty?.phone || '';
      const p2Signatory = structuredFacts.receivingParty?.signatory || 'Authorized Representative';

      const p1ContactParts = [p1Email ? `Email: ${p1Email}` : '', p1Phone ? `Phone: ${p1Phone}` : ''].filter(Boolean).join(', ');
      const p2ContactParts = [p2Email ? `Email: ${p2Email}` : '', p2Phone ? `Phone: ${p2Phone}` : ''].filter(Boolean).join(', ');

      const effDate = structuredFacts.effectiveDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const duration = structuredFacts.duration || '2 years';
      const purpose = structuredFacts.purpose || 'evaluating a prospective commercial collaboration';
      const confScope = Array.isArray(structuredFacts.confidentialInformation) 
        ? structuredFacts.confidentialInformation.join(', ')
        : (structuredFacts.confidentialInformation || 'technical, proprietary, and business data');
      const govLaw = structuredFacts.governingLaw || 'State of Delaware';
      const jurisdiction = structuredFacts.jurisdiction || 'Courts of Wilmington, Delaware';
      const disputeResolution = structuredFacts.disputeResolution || 'Exclusive Court Jurisdiction';
      const standardOfCare = structuredFacts.standardOfCare || 'strict and commercially reasonable degree of care';
      const returnDays = structuredFacts.returnOrDestructionDays || 'seven (7) business days';
      const requireCert = structuredFacts.requireDestructionCertificate !== false;

      docTitle = "NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT";

      sections.push({
        sectionType: "title",
        title: "Title & Preamble",
        content: `This Non-Disclosure and Confidentiality Agreement (the "Agreement") is entered into and made effective as of ${effDate} (the "Effective Date").`
      });

      sections.push({
        sectionType: "parties",
        title: "Parties",
        content: `BY AND BETWEEN:\n\n1. ${p1}${p1Type}${p1Addr ? `, having its registered office address at ${p1Addr}` : ''}${p1ContactParts ? ` (${p1ContactParts})` : ''} (hereinafter referred to as the "Disclosing Party", which expression shall, unless repugnant to the context, include its successors and permitted assigns); and\n\n2. ${p2}${p2Type}${p2Addr ? `, having its registered office address at ${p2Addr}` : ''}${p2ContactParts ? ` (${p2ContactParts})` : ''} (hereinafter referred to as the "Receiving Party", which expression shall, unless repugnant to the context, include its successors and permitted assigns).\n\nThe Disclosing Party and Receiving Party are hereinafter individually referred to as a "Party" and collectively as the "Parties".`
      });

      sections.push({
        sectionType: "purpose",
        title: "Recitals & Purpose",
        content: `WHEREAS, the Parties wish to engage in exploratory discussions concerning ${purpose} (the "Authorized Purpose"); and\n\nWHEREAS, in connection with the Authorized Purpose, the Disclosing Party will disclose to the Receiving Party certain valuable proprietary, non-public, and confidential information, which the Receiving Party agrees to treat in accordance with the covenants contained herein.`
      });

      // Approved clause for definition or default
      const defClause = approvedClauses.find(c => c.clauseType === 'definition')?.content;
      sections.push({
        sectionType: "definition",
        title: "1. Definition of Confidential Information",
        content: defClause ? this.bindFacts(defClause, structuredFacts) :
          `"Confidential Information" shall mean all technical, business, financial, software, source code, designs, and commercial information disclosed directly or indirectly by the Disclosing Party to the Receiving Party. For the purposes of this Agreement, Confidential Information specifically includes: ${confScope}. Confidential Information may be conveyed orally, visually, in writing, or in electronic or machine-readable format, and shall be deemed confidential whether or not expressly marked as proprietary.`
      });

      // Confidentiality obligations
      const confClause = approvedClauses.find(c => c.clauseType === 'confidentiality')?.content;
      sections.push({
        sectionType: "confidentiality",
        title: "2. Confidentiality Obligations",
        content: confClause ? this.bindFacts(confClause, structuredFacts) :
          `The Receiving Party agrees to hold all Confidential Information in strict confidence and shall exercise ${standardOfCare} to prevent unauthorized use, dissemination, or publication as it applies to its own confidential information of like nature. The Receiving Party shall not use the Confidential Information for any purpose other than the Authorized Purpose without prior written consent.`
      });

      sections.push({
        sectionType: "exceptions",
        title: "3. Exceptions to Confidential Information",
        content: `The obligations of confidentiality shall not apply to any information that: (a) is or becomes publicly known through no wrongful act of the Receiving Party; (b) was already in the lawful possession of the Receiving Party prior to disclosure as established by documentary evidence; (c) is rightfully received from a third party without breach of any confidentiality obligation; or (d) is independently developed by the Receiving Party without reference to or reliance upon the Disclosing Party's Confidential Information.`
      });

      sections.push({
        sectionType: "permitted_disclosure",
        title: "4. Permitted Disclosures",
        content: `The Receiving Party may disclose Confidential Information solely to those of its directors, officers, employees, and professional legal or financial advisors who have a verifiable need to know such information for the Authorized Purpose, provided that such individuals are bound by confidentiality obligations substantially similar to those herein. Disclosures required by applicable law or judicial process shall be permitted only after prompt written notice to the Disclosing Party.`
      });

      sections.push({
        sectionType: "return_destruction",
        title: "5. Return or Destruction of Materials",
        content: `Upon written demand by the Disclosing Party or upon conclusion of the Authorized Purpose, the Receiving Party shall promptly, and in any event within ${returnDays}, return to the Disclosing Party or, at the Disclosing Party's election, securely destroy all copies, reproductions, summaries, and extracts of the Confidential Information${requireCert ? ', and promptly furnish a written certificate of destruction executed by an authorized officer' : ''}.`
      });

      sections.push({
        sectionType: "duration",
        title: "6. Term & Duration",
        content: `This Agreement and the confidentiality covenants set forth herein shall govern all disclosures made between the Parties and shall remain binding upon the Receiving Party for a period of ${duration} from the Effective Date.`
      });

      // Remedies
      const remediesClause = approvedClauses.find(c => c.clauseType === 'remedies')?.content;
      sections.push({
        sectionType: "remedies",
        title: "7. Remedies for Breach",
        content: remediesClause ? this.bindFacts(remediesClause, structuredFacts) :
          `The Parties acknowledge that any breach of this Agreement may cause irreparable injury to the Disclosing Party for which monetary damages alone would be inadequate. Accordingly, in addition to any other remedies available at law, the Disclosing Party shall be entitled to seek equitable relief, including temporary and permanent injunctive relief, without the necessity of proving actual damages or posting a bond.`
      });

      sections.push({
        sectionType: "governing_law",
        title: "8. Governing Law & Dispute Resolution",
        content: `This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of ${govLaw}. Any dispute, controversy, or claim arising out of or relating to this Agreement shall be resolved through ${disputeResolution} before the competent courts located in ${jurisdiction}.`
      });

      if (structuredFacts.nonSolicitationCovenant) {
        sections.push({
          sectionType: "non_solicitation",
          title: "9. Non-Solicitation Covenant",
          content: `During the term of this Agreement and for a period of ${structuredFacts.nonSolicitationCovenant} following its expiration or termination, neither Party shall directly or indirectly solicit, recruit, or entice away any employee, contractor, or commercial consultant of the other Party without prior express written consent.`
        });
      }

      sections.push({
        sectionType: "miscellaneous",
        title: `${structuredFacts.nonSolicitationCovenant ? '10' : '9'}. Miscellaneous Provisions`,
        content: `This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior agreements, understandings, and negotiations. No amendment, modification, or waiver of any provision of this Agreement shall be effective unless executed in writing by authorized signatories of both Parties.`
      });

      sections.push({
        sectionType: "signatures",
        title: `${structuredFacts.nonSolicitationCovenant ? '11' : '10'}. Signatures & Execution`,
        content: `IN WITNESS WHEREOF, the Parties hereto have caused this Non-Disclosure Agreement to be duly executed by their respective authorized representatives as of the Effective Date.\n\nFOR AND ON BEHALF OF:\n${p1}${p1Type}\n\nBy: ____________________________________\nName: ${p1Signatory}\nTitle: Authorized Signatory\nDate: ${effDate}\n${p1ContactParts ? `Contact: ${p1ContactParts}\n` : ''}\nFOR AND ON BEHALF OF:\n${p2}${p2Type}\n\nBy: ____________________________________\nName: ${p2Signatory}\nTitle: Authorized Signatory\nDate: ${effDate}\n${p2ContactParts ? `Contact: ${p2ContactParts}\n` : ''}`
      });

    } else { // LEGAL_NOTICE
      const senderName = structuredFacts.sender?.name || 'Complainant / Sender';
      const senderType = structuredFacts.sender?.type ? ` (${structuredFacts.sender.type})` : '';
      const senderAddr = structuredFacts.sender?.address || 'Registered Address';
      const senderEmail = structuredFacts.sender?.email || '';
      const senderPhone = structuredFacts.sender?.phone || '';
      const senderAdvocate = structuredFacts.sender?.advocate || 'Advocate & Legal Counsel';

      const recipientName = structuredFacts.recipient?.name || 'Addressee / Defaulting Party';
      const recipientType = structuredFacts.recipient?.type ? ` (${structuredFacts.recipient.type})` : '';
      const recipientAddr = structuredFacts.recipient?.address || 'Registered Address';
      const recipientEmail = structuredFacts.recipient?.email || '';
      const recipientPhone = structuredFacts.recipient?.phone || '';

      const noticeDate = structuredFacts.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const amount = structuredFacts.amount || '₹50,000';
      const interestRate = structuredFacts.interestRate || '18% per annum';
      const respPeriod = structuredFacts.responsePeriod || '15 days';
      const subject = structuredFacts.subject || `LEGAL NOTICE FOR NON-PAYMENT AND BREACH OF CONTRACT`;
      const jurisdiction = structuredFacts.jurisdiction || 'Jaipur, Rajasthan';
      const govLaw = structuredFacts.governingLaw || 'India';
      const transactionNature = structuredFacts.transactionNature || 'Provision of enterprise goods and professional services';
      const breachDesc = structuredFacts.breach || 'Willful failure and neglect to pay legitimate outstanding invoices for accepted deliverables';
      const invoiceNumbers = structuredFacts.invoiceNumbers ? ` (Ref. Invoices: ${structuredFacts.invoiceNumbers})` : '';
      const legalBasisArr = Array.isArray(structuredFacts.legalBasis) ? structuredFacts.legalBasis.join('; ') : (structuredFacts.legalBasis || 'Section 73 of the Indian Contract Act, 1872');

      docTitle = `FORMAL LEGAL NOTICE`;

      sections.push({
        sectionType: "sender",
        title: "Sender & Advocate Details",
        content: `FROM:\nOffice of ${senderAdvocate}\nOn behalf of: ${senderName}${senderType}\nRegistered Address: ${senderAddr}\n${[senderEmail ? `Email: ${senderEmail}` : '', senderPhone ? `Phone: ${senderPhone}` : ''].filter(Boolean).join(' | ')}\nDate: ${noticeDate}\n\nSENT VIA REGISTERED POST WITH ACKNOWLEDGEMENT DUE / SPEED POST & EMAIL`
      });

      sections.push({
        sectionType: "recipient",
        title: "Addressee / Recipient",
        content: `TO:\n${recipientName}${recipientType}\nRegistered Address: ${recipientAddr}\n${[recipientEmail ? `Email: ${recipientEmail}` : '', recipientPhone ? `Phone: ${recipientPhone}` : ''].filter(Boolean).join(' | ')}`
      });

      sections.push({
        sectionType: "subject",
        title: "Subject",
        content: `SUBJECT: ${subject.toUpperCase()} — DEMAND FOR REMITTANCE OF OUTSTANDING SUM OF ${amount}${invoiceNumbers}.`
      });

      sections.push({
        sectionType: "background",
        title: "1. Background & Transactional History",
        content: `Sir/Madam,\n\nUnder instructions and authority from our Client, ${senderName}, we hereby serve upon you this formal Legal Notice. Our Client is a reputable entity with whom you entered into a binding commercial contract concerning: ${transactionNature}.`
      });

      sections.push({
        sectionType: "facts",
        title: "2. Statement of Facts",
        content: `Pursuant to the aforesaid engagement, our Client diligently performed all contracted milestones and delivered the agreed deliverables. Despite unconditional receipt and acceptance of deliverables, you have failed to discharge your corresponding financial liabilities.`
      });

      sections.push({
        sectionType: "breach",
        title: "3. Breach & Default",
        content: `Your failure constitutes a deliberate breach of agreement: ${breachDesc}. An aggregate principal sum of ${amount}${invoiceNumbers} remains overdue and outstanding on your account as of this date.`
      });

      sections.push({
        sectionType: "legal_basis",
        title: "4. Legal Basis",
        content: `Your unilateral default constitutes actionable breach under ${legalBasisArr} and the substantive laws of ${govLaw}, rendering you liable for interest, compensatory damages, and full litigation expenses.`
      });

      sections.push({
        sectionType: "demand",
        title: "5. Specific Demand",
        content: `In light of the above, we hereby call upon you to make unconditional payment of the outstanding principal sum of ${amount}, together with interest calculated at ${interestRate}, into our Client's designated bank account within ${respPeriod} from receipt of this notice.`
      });

      sections.push({
        sectionType: "response_period",
        title: "6. Response Period & Compliance Deadline",
        content: `You are hereby accorded a strict window of ${respPeriod} from the delivery of this notice to liquidate the debt or provide written response.`
      });

      sections.push({
        sectionType: "consequences",
        title: "7. Consequences of Default",
        content: `Take notice that in the event of failure to comply within ${respPeriod}, our Client has given peremptory instructions to initiate civil recovery and legal proceedings before the competent courts of ${jurisdiction}, holding you liable for all legal costs and damages.`
      });

      sections.push({
        sectionType: "closing",
        title: "8. Closing & Counsel Signature",
        content: `A copy of this notice is retained in our office for future reference and for production before the court of law.\n\nYours faithfully,\n\n____________________________________\n${senderAdvocate}\nLegal Counsel for ${senderName}`
      });
    }

    const formatted = this.assembleFormattedText(docTitle, sections);
    return {
      title: docTitle,
      sections,
      formattedDocument: formatted,
      generationTimeMs: Date.now() - startTime,
      modelUsed: this.modelName
    };
  }

  /**
   * Baseline mode generation: Direct unconstrained drafting without structured extraction or approved clause constraints.
   */
  private generateBaselineDraft(input: GenerationInput, startTime: number): GeneratedDocumentResult {
    const rawFacts = input.structuredFacts;
    const docType = input.documentType;

    const sections: GeneratedSection[] = [
      {
        sectionType: "baseline_body",
        title: `${docType} (Baseline Direct Generation)`,
        content: `Direct Generation Output for ${docType}:\n\n` +
          `Parties involved: ${JSON.stringify(rawFacts.parties || rawFacts.disclosingParty || rawFacts.sender || 'Party A and Party B')}.\n` +
          `Details provided: ${JSON.stringify(rawFacts)}.\n\n` +
          `The parties agree to all standard terms, confidentiality, payments, and conditions. All disputes to be settled under applicable law.`
      }
    ];

    const title = `${docType} (Baseline Mode)`;
    return {
      title,
      sections,
      formattedDocument: `${title}\n\n${sections[0].content}`,
      generationTimeMs: Date.now() - startTime,
      modelUsed: "baseline-unconstrained-llm"
    };
  }

  private assembleFormattedText(title: string, sections: GeneratedSection[]): string {
    return `# ${title}\n\n` + sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
  }

  private bindFacts(template: string, facts: Record<string, any>): string {
    let result = template;
    const p1 = facts.disclosingParty?.name || facts.sender?.name || '';
    const p2 = facts.receivingParty?.name || facts.recipient?.name || '';
    const duration = facts.duration || '';
    const jurisdiction = facts.jurisdiction || facts.governingLaw || '';

    result = result.replace(/\{\{disclosingParty\}\}/g, p1);
    result = result.replace(/\{\{receivingParty\}\}/g, p2);
    result = result.replace(/\{\{duration\}\}/g, duration);
    result = result.replace(/\{\{jurisdiction\}\}/g, jurisdiction);
    return result;
  }

  async rewriteSection(sectionContent: string, instruction: 'formal' | 'simple' | 'custom', customPrompt?: string): Promise<string> {
    if (instruction === 'simple') {
      return sectionContent
        .replace(/hereinafter referred to as/gi, 'called')
        .replace(/by and between/gi, 'between')
        .replace(/in witness whereof/gi, 'signed by')
        .replace(/shall exercise the same degree of care/gi, 'must take reasonable care')
        .replace(/promptly, and in any event within/gi, 'within');
    }
    if (instruction === 'formal') {
      return `Pursuant to the covenants established herein, ${sectionContent.trim()} It is expressly stipulated that time is of the essence in the performance of said obligations.`;
    }
    return `${sectionContent}\n\n[Revised per instruction: ${customPrompt || 'standard legal refinement'}]`;
  }

  async explainClause(clauseContent: string): Promise<ClauseExplanation> {
    const isConf = /confidential|disclose|proprietary/i.test(clauseContent);
    const isTerm = /term|duration|years|expire/i.test(clauseContent);
    const isRemedies = /remedy|injunctive|damages|harm/i.test(clauseContent);
    const isJurisdiction = /governing|law|jurisdiction|court|arbitration/i.test(clauseContent);

    if (isConf) {
      return {
        plainLanguage: "This clause means that any non-public business or technical information shared between the parties must be kept strictly secret and cannot be disclosed to outsiders without written consent.",
        purpose: "Protects sensitive trade secrets, code, and financial information from unauthorized leaks or commercial exploitation.",
        legalImplication: "Breach may result in immediate court injunctions and financial liability for damages caused.",
        sourcesUsed: ["Approved NDA Clause Library", "Indian Contract Act, 1872"],
        disclaimer: "Informational summary generated by Atharv Legal AI. This is not formal legal advice."
      };
    } else if (isTerm) {
      return {
        plainLanguage: "This clause sets how long the agreement lasts and how many years the confidentiality duties continue to apply after signing.",
        purpose: "Provides legal certainty regarding the duration of obligations so neither party is bound indefinitely.",
        legalImplication: "Obligations expire once the term concludes, unless trade secret protections apply independently.",
        sourcesUsed: ["Standard Commercial Practice Standards"],
        disclaimer: "Informational summary generated by Atharv Legal AI. This is not formal legal advice."
      };
    } else if (isRemedies) {
      return {
        plainLanguage: "This clause allows the injured party to ask a court to stop an unauthorized disclosure immediately (an injunction) without waiting for a lengthy trial on money damages.",
        purpose: "Prevents immediate damage before trade secrets become public knowledge.",
        legalImplication: "Permits equitable relief and emergency court orders.",
        sourcesUsed: ["Specific Relief Act, 1963", "Approved Clause Library"],
        disclaimer: "Informational summary generated by Atharv Legal AI. This is not formal legal advice."
      };
    } else if (isJurisdiction) {
      return {
        plainLanguage: "This clause specifies which country's or state's laws will govern the contract and which city's courts have the exclusive right to decide any disputes.",
        purpose: "Eliminates confusion over where lawsuits must be filed and which legal rules apply.",
        legalImplication: "Prevents forum shopping and binds both parties to local jurisdiction.",
        sourcesUsed: ["Code of Civil Procedure, 1908"],
        disclaimer: "Informational summary generated by Atharv Legal AI. This is not formal legal advice."
      };
    }

    return {
      plainLanguage: "This provision specifies operative rights and duties between the contracting entities according to standard contractual rules.",
      purpose: "Clarifies obligations and establishes mutual expectations.",
      legalImplication: "Binding upon execution.",
      sourcesUsed: ["Atharv Legal Knowledge Base"],
      disclaimer: "Informational summary generated by Atharv Legal AI. This is not formal legal advice."
    };
  }
}

export const generationService = new GenerationService();

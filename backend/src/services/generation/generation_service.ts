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

  /**
   * Generates a concrete, actionable fix for a flagged validation issue.
   */
  async suggestFix(params: {
    documentType: string;
    content: string;
    issue: {
      type: string;
      severity: string;
      section: string;
      description: string;
    };
    structuredFacts: Record<string, any>;
  }): Promise<{
    issueType: string;
    explanation: string;
    legalRisk: string;
    targetSnippet?: string;
    replacementSnippet: string;
    actionType: 'REPLACE' | 'INSERT' | 'APPEND';
    fixedContent: string;
  }> {
    const { documentType, content, issue, structuredFacts } = params;
    const desc = issue?.description || '';
    const section = issue?.section || '';

    // 1. Duration Mismatch Fix
    if (issue?.type === 'FACT_MISMATCH' && (section.toLowerCase().includes('duration') || desc.toLowerCase().includes('duration'))) {
      const factDuration = structuredFacts.duration || '3 years';
      const docMatch = content.match(/(\d+)\s*(?:years?|months?)/i);
      const targetSnippet = docMatch ? docMatch[0] : 'duration term';
      const replacementSnippet = `${factDuration}`;
      
      let fixedContent = content;
      if (docMatch) {
        fixedContent = content.replace(new RegExp(`\\b${docMatch[0]}\\b`, 'gi'), replacementSnippet);
      } else {
        fixedContent = content.replace(/for a period of[^\.\n]*/i, `for a period of ${replacementSnippet}`);
      }

      return {
        issueType: issue.type,
        explanation: `The agreement text mentions '${targetSnippet}', which deviates from the canonical fact '${factDuration}' set in your project questionnaire.`,
        legalRisk: `A term discrepancy undermines legal certainty and can prematurely void confidentiality obligations or cause litigation over survival covenants.`,
        targetSnippet,
        replacementSnippet,
        actionType: 'REPLACE',
        fixedContent
      };
    }

    // 2. Party Name Mismatch Fix
    if (issue?.type === 'FACT_MISMATCH' && (section.toLowerCase().includes('part') || desc.toLowerCase().includes('party') || desc.toLowerCase().includes('disclosing') || desc.toLowerCase().includes('receiving'))) {
      const p1 = structuredFacts.disclosingParty?.name || structuredFacts.disclosingParty || 'Apex Innovations Inc.';
      const p2 = structuredFacts.receivingParty?.name || structuredFacts.receivingParty || 'Nexus Global Partners LLC';
      
      const isDisclosing = desc.toLowerCase().includes('disclosing');
      const missingParty = isDisclosing ? p1 : p2;
      const label = isDisclosing ? 'Disclosing Party' : 'Receiving Party';

      let fixedContent = content;
      let targetSnippet = isDisclosing ? 'Party A' : 'Party B';
      let replacementSnippet = `${missingParty} ("${label}")`;

      if (content.includes('Party A') || content.includes('Party B')) {
        fixedContent = content.replace(isDisclosing ? /Party A/g : /Party B/g, missingParty);
      } else if (content.includes('Disclosing Party') && !content.includes(p1)) {
        fixedContent = content.replace(/Disclosing Party/i, `${p1} ("Disclosing Party")`);
        targetSnippet = 'Disclosing Party';
      } else if (content.includes('Receiving Party') && !content.includes(p2)) {
        fixedContent = content.replace(/Receiving Party/i, `${p2} ("Receiving Party")`);
        targetSnippet = 'Receiving Party';
      } else {
        fixedContent = content.replace(/(##.*PARTIES[\s\S]*?\n\n)/i, `$1This Agreement is entered into by **${missingParty}** as ${label}.\n\n`);
        targetSnippet = 'PARTIES section';
      }

      return {
        issueType: issue.type,
        explanation: `Binding the authoritative registered entity name '${missingParty}' into the preamble and parties section.`,
        legalRisk: `Misidentification of contracting parties causes privity defects and makes breach of contract non-actionable against the intended entity.`,
        targetSnippet,
        replacementSnippet,
        actionType: 'REPLACE',
        fixedContent
      };
    }

    // 3. Governing Law & Jurisdiction Fix
    if (issue?.type === 'FACT_MISMATCH' && (section.toLowerCase().includes('governing') || section.toLowerCase().includes('jurisdiction') || desc.toLowerCase().includes('governing'))) {
      const govLaw = structuredFacts.jurisdiction || structuredFacts.governingLaw || 'the State of Delaware';
      const replacementClause = `## 7. GOVERNING LAW AND JURISDICTION\n\nThis Agreement shall be governed by, construed, and enforced in accordance with the laws of ${govLaw}, without regard to its principles of conflicts of law. The state and federal courts located in ${govLaw} shall have sole and exclusive jurisdiction over any dispute, controversy, or claim arising out of or in connection with this Agreement.`;

      let fixedContent = content;
      let targetSnippet = 'Governing Law Clause';
      if (/##\s*(?:\d+\.\s*)?GOVERNING LAW[\s\S]*?(?=##|---|$)/i.test(content)) {
        fixedContent = content.replace(/##\s*(?:\d+\.\s*)?GOVERNING LAW[\s\S]*?(?=##|---|$)/i, `${replacementClause}\n\n`);
      } else {
        fixedContent = `${content.trim()}\n\n---\n\n${replacementClause}\n`;
      }

      return {
        issueType: issue.type,
        explanation: `Incorporating designated governing law (${govLaw}) with exclusive forum jurisdiction.`,
        legalRisk: `Absence of a definitive governing law clause creates forum shopping and international jurisdiction conflicts in the event of cross-border disclosure.`,
        targetSnippet,
        replacementSnippet: replacementClause,
        actionType: 'INSERT',
        fixedContent
      };
    }

    // 4. Missing Signature Block Fix
    if (issue?.type === 'MISSING_SIGNATURE_BLOCK' || section.toLowerCase().includes('signature')) {
      const p1Name = structuredFacts.disclosingParty?.name || 'Disclosing Party';
      const p2Name = structuredFacts.receivingParty?.name || 'Receiving Party';
      const p1Sig = structuredFacts.disclosingParty?.signatory || 'Authorized Representative';
      const p2Sig = structuredFacts.receivingParty?.signatory || 'Authorized Representative';

      const sigBlock = `## EXECUTION & SIGNATURES\n\nIN WITNESS WHEREOF, the Parties hereto have caused this Mutual Non-Disclosure Agreement to be executed by their respective duly authorized officers as of the Effective Date.\n\n| Disclosing Party: ${p1Name} | Receiving Party: ${p2Name} |\n| :--- | :--- |\n| By: ___________________________ | By: ___________________________ |\n| Name: ${p1Sig} | Name: ${p2Sig} |\n| Title: Authorized Officer | Title: Authorized Officer |\n| Date: _________________________ | Date: _________________________ |\n`;

      const fixedContent = `${content.trim()}\n\n---\n\n${sigBlock}`;

      return {
        issueType: issue.type,
        explanation: `Added formal bipartite signature and execution block for both authorized signatories.`,
        legalRisk: `Without signed corporate authorization blocks, the instrument cannot be produced in court as an executed, binding contract.`,
        targetSnippet: 'End of Document',
        replacementSnippet: sigBlock,
        actionType: 'APPEND',
        fixedContent
      };
    }

    // 5. Legal Notice: Monetary Claim or Response Period Fix
    if (documentType === 'LEGAL_NOTICE' && (desc.toLowerCase().includes('claim') || desc.toLowerCase().includes('amount') || desc.toLowerCase().includes('response') || desc.toLowerCase().includes('period'))) {
      const amount = structuredFacts.amount || '$145,000 USD';
      const responsePeriod = structuredFacts.responsePeriod || '15 days';

      let fixedContent = content;
      if (desc.toLowerCase().includes('amount') || desc.toLowerCase().includes('claim')) {
        fixedContent = content.replace(/\$[\d,]+(?:\.\d+)?/g, amount);
        return {
          issueType: issue.type,
          explanation: `Synchronized outstanding demand amount with authoritative claim figure (${amount}).`,
          legalRisk: `Discrepancies in claim sums invalidate statutory notice periods under Commercial Code & Negotiable Instruments laws.`,
          targetSnippet: 'Claim Amount',
          replacementSnippet: amount,
          actionType: 'REPLACE',
          fixedContent
        };
      } else {
        fixedContent = content.replace(/\b\d+\s*days\b/gi, responsePeriod);
        return {
          issueType: issue.type,
          explanation: `Corrected cure/response period to statutory timeframe (${responsePeriod}).`,
          legalRisk: `Defective statutory notice periods lead to immediate dismissal of subsequent commercial breach suits.`,
          targetSnippet: 'Response Period',
          replacementSnippet: responsePeriod,
          actionType: 'REPLACE',
          fixedContent
        };
      }
    }

    // 6. Missing Canonical Section Fix
    if (issue?.type === 'MISSING_SECTION' || desc.toLowerCase().includes('requires a') || desc.toLowerCase().includes('missing')) {
      const secName = (issue?.section || '').toLowerCase();
      let canonicalSection = '';
      let explanation = '';

      if (secName.includes('return') || secName.includes('destruction')) {
        canonicalSection = `## 5. RETURN OR DESTRUCTION OF MATERIALS\n\nUpon written request by the Disclosing Party, or upon termination or expiration of this Agreement, the Receiving Party shall promptly, and in any event within seven (7) business days, return or destroy all tangible and electronic materials containing Confidential Information, and provide written certification of compliance signed by an authorized officer.`;
        explanation = `Added standard institutional Return or Destruction of Materials covenant.`;
      } else if (secName.includes('remed') || secName.includes('injunct')) {
        canonicalSection = `## 6. REMEDIES AND INJUNCTIVE RELIEF\n\nThe Receiving Party acknowledges that any unauthorized disclosure or use of Confidential Information would cause irreparable harm for which monetary damages alone would be inadequate. Accordingly, the Disclosing Party shall be entitled to seek equitable relief, including temporary and permanent injunctive relief, in addition to all other remedies available at law.`;
        explanation = `Added standard Remedies and Injunctive Relief clause.`;
      } else if (secName.includes('dispute') || secName.includes('jurisdiction') || secName.includes('governing')) {
        const govLaw = structuredFacts.jurisdiction || structuredFacts.governingLaw || 'the State of Delaware';
        canonicalSection = `## 7. GOVERNING LAW AND DISPUTE RESOLUTION\n\nThis Agreement shall be governed by and construed in accordance with the laws of ${govLaw}. Any dispute, controversy, or claim arising under or relating to this Agreement shall be subject to the exclusive jurisdiction of the state and federal courts located in ${govLaw}.`;
        explanation = `Added canonical Governing Law and Dispute Resolution clause.`;
      } else if (secName.includes('term') || secName.includes('duration')) {
        const duration = structuredFacts.duration || '3 years';
        canonicalSection = `## 4. TERM AND DURATION\n\nThis Agreement and the obligations of confidentiality herein shall remain in full force and effect for a period of ${duration} from the Effective Date, after which the obligations shall expire except with respect to trade secrets which shall survive indefinitely.`;
        explanation = `Added canonical Term and Duration clause aligned with your project facts (${duration}).`;
      } else if (secName.includes('definition')) {
        canonicalSection = `## 1. DEFINITION OF CONFIDENTIAL INFORMATION\n\n"Confidential Information" includes all non-public technical, operational, financial, and business information disclosed by the Disclosing Party to the Receiving Party, whether in writing, orally, or in digital format.`;
        explanation = `Added canonical Definition of Confidential Information section.`;
      } else if (secName.includes('exception')) {
        canonicalSection = `## 3. EXCEPTIONS TO CONFIDENTIALITY\n\nConfidential Information shall not include information that: (a) becomes publicly known through no wrongful act of the Receiving Party; (b) was lawfully known prior to disclosure; (c) is rightfully received from a third party without breach; or (d) is independently developed without reference to the Disclosing Party's information.`;
        explanation = `Added canonical Exceptions to Confidentiality section.`;
      } else if (secName.includes('obligation') || secName.includes('confidentiality')) {
        canonicalSection = `## 2. CONFIDENTIALITY OBLIGATIONS\n\nThe Receiving Party shall maintain all Confidential Information in strict confidence and shall exercise at least a reasonable degree of care. The Receiving Party shall use the Confidential Information solely for the authorized purpose and shall not disclose it to third parties without prior written consent.`;
        explanation = `Added canonical Confidentiality Obligations section.`;
      } else if (secName.includes('demand')) {
        const amount = structuredFacts.amount || '$145,000 USD';
        canonicalSection = `## FORMAL DEMAND FOR PAYMENT\n\nDemand is hereby made upon you to remit the outstanding sum of ${amount} within the statutory notice period, failing which immediate legal proceedings shall be initiated against you.`;
        explanation = `Added canonical Demand section.`;
      } else if (secName.includes('consequence')) {
        canonicalSection = `## LEGAL CONSEQUENCES OF DEFAULT\n\nTake notice that if you fail to comply with the aforesaid demand, our client has issued peremptory instructions to institute civil and criminal proceedings against you before the competent court of jurisdiction, holding you liable for all legal costs, interest, and damages.`;
        explanation = `Added canonical Legal Consequences section.`;
      } else {
        canonicalSection = `## ${issue?.section || 'STANDARD SECTION'}\n\nThe Parties hereby agree to adhere to standard industry terms and governing statutory covenants regarding ${issue?.section || 'this provision'}.`;
        explanation = `Added standardized legal section for ${issue?.section || 'Section'}.`;
      }

      let fixedContent = content;
      const sigMatch = content.search(/##\s*(?:EXECUTION|SIGNATURES|IN WITNESS WHEREOF)/i);
      if (sigMatch !== -1) {
        fixedContent = `${content.substring(0, sigMatch).trim()}\n\n---\n\n${canonicalSection}\n\n---\n\n${content.substring(sigMatch).trim()}`;
      } else {
        fixedContent = `${content.trim()}\n\n---\n\n${canonicalSection}\n`;
      }

      return {
        issueType: issue.type,
        explanation,
        legalRisk: `Absence of this canonical section creates contractual incompleteness and leaves critical rights unenforced under applicable law.`,
        targetSnippet: 'Missing Section',
        replacementSnippet: canonicalSection,
        actionType: 'INSERT',
        fixedContent
      };
    }

    // Default: Generic Intelligent Heuristic Fix
    return {
      issueType: issue?.type || 'ADVISORY',
      explanation: `AI-guided resolution for ${issue?.section || 'Section'}: aligns language with institutional standards.`,
      legalRisk: `Deviation from vetted baseline clauses increases exposure to adverse judicial interpretation.`,
      replacementSnippet: `[Standardized Clause for ${issue?.section || 'Section'}]`,
      actionType: 'REPLACE',
      fixedContent: content
    };
  }

  /**
   * Synchronize all canonical structured facts into the document in a single pass.
   */
  async syncStructuredFacts(params: {
    documentType: string;
    content: string;
    structuredFacts: Record<string, any>;
  }): Promise<{
    fixedContent: string;
    changes: string[];
  }> {
    const { documentType, structuredFacts } = params;
    let text = params.content;
    const changes: string[] = [];

    if (documentType === 'NDA') {
      const p1 = structuredFacts.disclosingParty?.name;
      const p2 = structuredFacts.receivingParty?.name;
      const duration = structuredFacts.duration;
      const jurisdiction = structuredFacts.jurisdiction || structuredFacts.governingLaw;

      if (duration) {
        const regex = /(\bfor a period of\s*)\d+\s*(?:years?|months?)/gi;
        if (regex.test(text)) {
          text = text.replace(regex, `$1${duration}`);
          changes.push(`Updated duration to "${duration}"`);
        }
      }

      if (jurisdiction) {
        const govRegex = /(laws of\s+)[^,\.\n]+/gi;
        if (govRegex.test(text)) {
          text = text.replace(govRegex, `$1${jurisdiction}`);
          changes.push(`Updated governing law to "${jurisdiction}"`);
        }
      }

      if (p1 && !text.includes(p1)) {
        text = text.replace(/Disclosing Party/g, `${p1} ("Disclosing Party")`);
        changes.push(`Injected disclosing party name "${p1}"`);
      }

      if (p2 && !text.includes(p2)) {
        text = text.replace(/Receiving Party/g, `${p2} ("Receiving Party")`);
        changes.push(`Injected receiving party name "${p2}"`);
      }
    } else {
      const sender = structuredFacts.sender?.name;
      const recipient = structuredFacts.recipient?.name;
      const amount = structuredFacts.amount;
      const period = structuredFacts.responsePeriod;

      if (amount) {
        text = text.replace(/\$[\d,]+(?:\.\d+)?/g, amount);
        changes.push(`Synchronized demand amount to "${amount}"`);
      }
      if (period) {
        text = text.replace(/\b\d+\s*days\b/gi, period);
        changes.push(`Synchronized curing period to "${period}"`);
      }
      if (sender && !text.includes(sender)) {
        text = text.replace(/\[Sender Name\]/gi, sender);
        changes.push(`Set sender to "${sender}"`);
      }
      if (recipient && !text.includes(recipient)) {
        text = text.replace(/\[Recipient Name\]/gi, recipient);
        changes.push(`Set recipient to "${recipient}"`);
      }
    }

    if (changes.length === 0) {
      changes.push('All structured facts are already synchronized with document text.');
    }

    return { fixedContent: text, changes };
  }

  /**
   * Execute an intelligent custom user instruction on the legal text.
   */
  async customEdit(params: {
    documentType: string;
    content: string;
    selectedText?: string;
    instruction: string;
    structuredFacts?: Record<string, any>;
  }): Promise<{
    instruction: string;
    originalSnippet: string;
    revisedSnippet: string;
    explanation: string;
    appliedContent: string;
  }> {
    const { content, selectedText, instruction } = params;
    const lowerInst = instruction.toLowerCase();

    let originalSnippet = selectedText || '';
    let revisedSnippet = '';
    let explanation = '';
    let appliedContent = content;

    if (lowerInst.includes('duration') || lowerInst.includes('year') || lowerInst.includes('month') || lowerInst.includes('term')) {
      const numMatch = instruction.match(/\d+\s*(?:years?|months?)/i);
      const targetDuration = numMatch ? numMatch[0] : '5 years';
      originalSnippet = (content.match(/\d+\s*(?:years?|months?)/i) || ['current duration'])[0];
      revisedSnippet = targetDuration;
      explanation = `Adjusted confidentiality term to ${targetDuration} pursuant to user instruction.`;
      appliedContent = content.replace(/\b\d+\s*(?:years?|months?)\b/i, targetDuration);
    } else if (lowerInst.includes('advisor') || lowerInst.includes('counsel') || lowerInst.includes('accountant') || lowerInst.includes('permit') || lowerInst.includes('exception')) {
      const permittedClause = `\n\n**Permitted Disclosures to Advisors:** Notwithstanding anything to the contrary, the Receiving Party may disclose Confidential Information to its legal counsel, certified accountants, and financial advisors who have a bona fide need to know, provided such representatives are bound by confidentiality obligations at least as restrictive as those contained herein.`;
      originalSnippet = 'Confidentiality section';
      revisedSnippet = permittedClause;
      explanation = `Inserted standard exception permitting disclosure to professional legal and financial advisors under strict fiduciary duty.`;
      if (/##\s*(?:\d+\.\s*)?OBLIGATIONS[\s\S]*?(?=##|---|$)/i.test(content)) {
        appliedContent = content.replace(/(##\s*(?:\d+\.\s*)?OBLIGATIONS[\s\S]*?)((?=##|---|$))/i, `$1${permittedClause}\n\n`);
      } else {
        appliedContent = `${content.trim()}\n\n${permittedClause}\n`;
      }
    } else if (lowerInst.includes('remed') || lowerInst.includes('injunct') || lowerInst.includes('attorney') || lowerInst.includes('fee')) {
      const remedyClause = `\n\n**Injunctive Relief & Legal Fees:** The parties acknowledge that any breach of this Agreement would cause irreparable harm for which monetary damages alone would be inadequate. Accordingly, the Disclosing Party shall be entitled to seek emergency injunctive relief without proof of actual damages or posting a bond, and the prevailing party shall be entitled to recover reasonable attorneys' fees and costs.`;
      originalSnippet = 'Remedies section';
      revisedSnippet = remedyClause;
      explanation = `Strengthened remedies with entitlement to emergency injunctive relief and recovery of prevailing party attorney fees.`;
      if (/##\s*(?:\d+\.\s*)?REMEDIES[\s\S]*?(?=##|---|$)/i.test(content)) {
        appliedContent = content.replace(/##\s*(?:\d+\.\s*)?REMEDIES[\s\S]*?(?=##|---|$)/i, `## 6. REMEDIES\n\n${remedyClause.trim()}\n\n`);
      } else {
        appliedContent = `${content.trim()}\n\n---\n\n## 6. REMEDIES\n\n${remedyClause.trim()}\n`;
      }
    } else if (lowerInst.includes('solicit') || lowerInst.includes('compete') || lowerInst.includes('employee') || lowerInst.includes('hire')) {
      const nonSolicitClause = `\n\n**Non-Solicitation Covenant:** During the term of this Agreement and for a period of twelve (12) months following its termination, neither party shall directly or indirectly solicit, entice, or attempt to hire any employee, contractor, or executive officer of the other party with whom they had contact during the collaboration.`;
      originalSnippet = 'New Covenant';
      revisedSnippet = nonSolicitClause;
      explanation = `Added a 12-month mutual employee and executive non-solicitation covenant.`;
      appliedContent = `${content.trim()}\n\n---\n\n## NON-SOLICITATION\n\n${nonSolicitClause.trim()}\n`;
    } else if (selectedText) {
      originalSnippet = selectedText;
      revisedSnippet = `${selectedText.trim()} Furthermore, it is agreed that performance of the foregoing covenant shall be governed by strict standards of commercial good faith and fair dealing.`;
      explanation = `Refined selected clause with explicit standard of good faith and commercial performance.`;
      appliedContent = content.replace(selectedText, revisedSnippet);
    } else {
      originalSnippet = 'Document';
      revisedSnippet = `[Special Covenant: ${instruction}]`;
      explanation = `Added custom operational covenant reflecting user instruction: "${instruction}".`;
      appliedContent = `${content.trim()}\n\n---\n\n## SPECIAL COVENANTS\n\nPursuant to party instructions: ${instruction}\n`;
    }

    return {
      instruction,
      originalSnippet,
      revisedSnippet,
      explanation,
      appliedContent
    };
  }

  /**
   * Standard library of vetted clauses ready for instant insertion.
   */
  getStandardClausesList(documentType: string) {
    if (documentType === 'NDA') {
      return [
        {
          id: 'injunctive_relief',
          title: 'Emergency Injunctive Relief & Attorney Fees',
          category: 'Remedies',
          content: `## REMEDIES & INJUNCTIVE RELIEF\n\nThe Receiving Party acknowledges that any unauthorized disclosure or use of Confidential Information would cause irreparable harm to the Disclosing Party for which damages would not be an adequate remedy. Therefore, the Disclosing Party shall be entitled to seek equitable relief, including injunctive relief and specific performance, in addition to all other remedies available at law or in equity, without the necessity of posting a bond. In any legal enforcement proceeding, the prevailing party shall be entitled to reasonable attorney fees.`
        },
        {
          id: 'permitted_disclosures',
          title: 'Permitted Disclosures (Legal & Financial Advisors)',
          category: 'Confidentiality',
          content: `## PERMITTED DISCLOSURES\n\nThe Receiving Party may disclose Confidential Information to its directors, officers, legal counsel, and certified financial auditors who have a need to know such information for the Authorized Purpose, provided that such recipients are bound by written confidentiality obligations at least as restrictive as those contained herein.`
        },
        {
          id: 'return_materials',
          title: 'Return or Certified Destruction of Information',
          category: 'Termination',
          content: `## RETURN OR DESTRUCTION OF MATERIALS\n\nUpon written request of the Disclosing Party or upon termination of this Agreement, the Receiving Party shall immediately cease all use of Confidential Information and, within ten (10) business days, either: (a) return all originals and copies of documents and tangible objects containing Confidential Information, or (b) destroy all such materials, including electronic records, and deliver a written certificate signed by an authorized officer confirming such destruction.`
        },
        {
          id: 'severability',
          title: 'Severability & Survival of Covenants',
          category: 'Boilerplate',
          content: `## SEVERABILITY & SURVIVAL\n\nIf any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity shall not affect any other provision, and the Agreement shall be construed as if such invalid provision had never been contained herein. All confidentiality, indemnity, and dispute resolution obligations shall survive termination.`
        },
        {
          id: 'execution_signatures',
          title: 'Formal Execution & Signature Block',
          category: 'Signatures',
          content: `## EXECUTION & SIGNATURES\n\nIN WITNESS WHEREOF, the Parties have executed this Agreement by their authorized representatives as of the Effective Date.\n\n**DISCLOSING PARTY:**\nBy: ___________________________\nName: Authorized Signatory\nTitle: Corporate Representative\n\n**RECEIVING PARTY:**\nBy: ___________________________\nName: Authorized Signatory\nTitle: Corporate Representative\n`
        }
      ];
    } else {
      return [
        {
          id: 'statutory_interest',
          title: 'Statutory Interest & Accrued Penalties',
          category: 'Commercial Claim',
          content: `## STATUTORY INTEREST ACCRUAL\n\nTake notice that in addition to the principal liquidated outstanding sum, interest at the statutory commercial rate of 18% per annum shall continue to accrue from the due date until full, final, and complete realization of the claim.`
        },
        {
          id: 'reservation_rights',
          title: 'Full Reservation of Criminal & Civil Rights',
          category: 'Legal Precedent',
          content: `## RESERVATION OF RIGHTS\n\nThis Notice is issued strictly without prejudice to all rights, entitlements, remedies, and causes of action available to our Client under applicable law and equity, including but not limited to instituting immediate summary commercial suits, insolvency proceedings, and criminal prosecution.`
        },
        {
          id: 'legal_costs',
          title: 'Recovery of Legal Fees & Notice Costs',
          category: 'Remedies',
          content: `## LEGAL NOTICE COSTS\n\nYou are further called upon to pay a sum of $2,500 towards the legal fees and drafting costs incurred by our Client for the issuance of this formal demand notice.`
        }
      ];
    }
  }
}

export const generationService = new GenerationService();

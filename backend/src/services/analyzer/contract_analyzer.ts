import zlib from 'zlib';
import mammoth from 'mammoth';
import { parseDocumentStructure } from '../documents/document_structure.js';
import { legalNLPClient } from '../nlp/legal_nlp_client.js';

export type ContractClauseStatus = 'PRESENT' | 'MISSING' | 'INCOMPLETE' | 'AMBIGUOUS';
export type ContractRiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ContractPartyInfo {
  name: string;
  role: string;
  address?: string;
  signatory?: string;
}

export interface ContractClauseMapItem {
  id: string;
  name: string;
  category: string;
  status: ContractClauseStatus;
  isRequired: boolean;
  detectedSnippet?: string;
  explanation: string;
  location?: { start: number; end: number };
}

export interface ContractRiskArea {
  id: string;
  severity: ContractRiskSeverity;
  category: string;
  clause: string;
  title: string;
  description: string;
  evidence: string;
  location?: { line?: number; textRange?: { start: number; end: number } };
  legalRationale: string;
  suggestedResolution: string;
}

export interface ContractConsistencyCheck {
  partiesMatch: boolean;
  dateChronologyValid: boolean;
  definedTermsConsistent: boolean;
  findings: string[];
}

export interface ContractOverview {
  title: string;
  contractType: string;
  parties: ContractPartyInfo[];
  effectiveDate?: string;
  duration?: string;
  monetaryTerms: string;
  governingLaw?: string;
  jurisdiction?: string;
  wordCount: number;
  paragraphCount: number;
}

export interface ContractAnalysisResult {
  overview: ContractOverview;
  clauseMap: ContractClauseMapItem[];
  riskAreas: ContractRiskArea[];
  consistency: ContractConsistencyCheck;
  health: {
    score: number;
    status: 'STRONG' | 'MODERATE' | 'NEEDS_REVISION' | 'CRITICAL_ATTENTION';
    categoryScores: {
      completeness: number;
      riskAndCompliance: number;
      consistency: number;
      clarity: number;
    };
    scoreBreakdown: string[];
    disclaimer: string;
  };
  extractedText: string;
}

export class ContractAnalyzer {
  /**
   * Extracts raw plain text from PDF, DOCX, or TXT buffer.
   */
  async extractTextFromBuffer(buffer: Buffer, mimeType?: string, filename?: string): Promise<string> {
    const fn = (filename || '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    // 1. PDF
    if (fn.endsWith('.pdf') || mime.includes('pdf')) {
      try {
        const pdfModule: any = await import('pdf-parse');
        const pdfFunc = pdfModule.default || pdfModule;
        const data = await pdfFunc(buffer);
        if (data && data.text && data.text.trim().length > 0) {
          return data.text.trim();
        }
      } catch (pdfErr) {
        // Fall back gracefully to internal PDF stream extractor
      }
      return this.fallbackPdfExtract(buffer);
    }

    // 2. DOCX
    if (fn.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('docx')) {
      try {
        const res = await mammoth.extractRawText({ buffer });
        if (res && res.value && res.value.trim().length > 0) {
          return res.value.trim();
        }
      } catch (docxErr) {
        console.warn('mammoth failed, falling back to zip/xml extractor:', docxErr);
      }
      return this.fallbackDocxExtract(buffer);
    }

    // 3. Plain Text / Markdown / UTF-8
    return buffer.toString('utf-8').trim();
  }

  /**
   * Zero-dependency fallback DOCX text extractor (ZIP -> word/document.xml)
   */
  fallbackDocxExtract(buffer: Buffer): string {
    let offset = 0;
    while (offset < buffer.length - 4) {
      if (buffer.readUInt32LE(offset) === 0x04034b50) { // PK\x03\x04
        const compMethod = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const fnLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const filename = buffer.toString('utf8', offset + 30, offset + 30 + fnLen);
        const dataOffset = offset + 30 + fnLen + extraLen;

        if (filename === 'word/document.xml') {
          const compData = buffer.subarray(dataOffset, dataOffset + compSize);
          let xmlStr = '';
          if (compMethod === 8) {
            xmlStr = zlib.inflateRawSync(compData).toString('utf8');
          } else {
            xmlStr = compData.toString('utf8');
          }

          return xmlStr
            .replace(/<\/w:p>/gi, '\n\n')
            .replace(/<w:br[^>]*\/>/gi, '\n')
            .replace(/<w:tab[^>]*\/>/gi, '\t')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();
        }
        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }
    return buffer.toString('utf8');
  }

  /**
   * Zero-dependency fallback PDF text stream extractor
   */
  fallbackPdfExtract(buffer: Buffer): string {
    const content = buffer.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    const textChunks: string[] = [];

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed: Buffer | null = null;
      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch {
          decompressed = rawStream;
        }
      }

      if (decompressed) {
        const streamText = decompressed.toString('latin1');
        const btRegex = /BT[\s\S]*?ET/g;
        let btMatch;
        while ((btMatch = btRegex.exec(streamText)) !== null) {
          const block = btMatch[0];
          const strRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
          let strMatch;
          while ((strMatch = strRegex.exec(block)) !== null) {
            textChunks.push(strMatch[1]);
          }

          const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
          let arrMatch;
          while ((arrMatch = arrayRegex.exec(block)) !== null) {
            const inner = arrMatch[1];
            const innerStrRegex = /\(([^)]*)\)/g;
            let inMatch;
            while ((inMatch = innerStrRegex.exec(inner)) !== null) {
              textChunks.push(inMatch[1]);
            }
          }
        }
      }
    }

    if (textChunks.length === 0) {
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    }

    return textChunks
      .map(t => t.replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Complete Structured Contract Analysis Pipeline
   */
  async analyzeContract(rawText: string, filename?: string): Promise<ContractAnalysisResult> {
    const text = rawText.trim();
    if (!text) {
      throw new Error('Contract text is empty or could not be extracted.');
    }

    // 1. Contract Overview & Type
    const overview = await this.extractOverview(text, filename);

    // 2. Clause Completeness Map
    const clauseMap = this.evaluateClauseMap(text, overview.contractType);

    // 3. Risk & Attention Areas
    const riskAreas = this.evaluateRiskAreas(text, overview.contractType, overview);

    // 4. Consistency Verification
    const consistency = this.checkConsistency(text, overview);

    // 5. Explainable Health Score
    const health = this.calculateHealthScore(clauseMap, riskAreas, consistency);

    return {
      overview,
      clauseMap,
      riskAreas,
      consistency,
      health,
      extractedText: text
    };
  }

  /**
   * Extracts Contract Overview: Type, Parties, Dates, Amounts, Duration, Law
   */
  private async extractOverview(text: string, filename?: string): Promise<ContractOverview> {
    const lower = text.toLowerCase();

    // Determine Contract Type
    let contractType = 'GENERAL_CONTRACT';
    if (lower.includes('non-disclosure') || lower.includes('confidentiality agreement') || lower.includes('nda')) {
      contractType = 'NDA';
    } else if (lower.includes('employment agreement') || lower.includes('appointment letter') || lower.includes('offer of employment')) {
      contractType = 'EMPLOYMENT_AGREEMENT';
    } else if (lower.includes('services agreement') || lower.includes('master services') || lower.includes('statement of work') || lower.includes('consulting agreement')) {
      contractType = 'SERVICE_AGREEMENT';
    } else if (lower.includes('legal notice') || lower.includes('demand notice') || lower.includes('statutory notice') || lower.includes('dishonour of cheque')) {
      contractType = 'LEGAL_NOTICE';
    } else if (lower.includes('lease agreement') || lower.includes('tenancy agreement') || lower.includes('rental agreement')) {
      contractType = 'LEASE_AGREEMENT';
    } else if (lower.includes('commercial agreement') || lower.includes('supply agreement') || lower.includes('vendor agreement')) {
      contractType = 'COMMERCIAL_CONTRACT';
    }

    // Extract Title
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let title = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].replace(/^#+\s*/, '').trim();
      if (line.length > 5 && line.length < 90 && !line.toLowerCase().startsWith('dated') && !line.toLowerCase().startsWith('by and')) {
        title = line;
        break;
      }
    }
    if (!title) title = `${contractType.replace(/_/g, ' ')} Document`;

    // Extract Parties
    const parties: ContractPartyInfo[] = [];
    const partyRegex = /\b([A-Z][A-Za-z0-9&.,'\s]{2,45}\s+(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|LLC|Inc\.?|LLP|Corporation|Corp\.?|Company|Technologies|Solutions|Enterprises))\b/g;
    const foundNames: string[] = [];
    let pMatch;
    while ((pMatch = partyRegex.exec(text)) !== null) {
      const pName = pMatch[1].trim();
      if (!foundNames.includes(pName) && !pName.toLowerCase().includes('court') && !pName.toLowerCase().includes('state of')) {
        foundNames.push(pName);
      }
    }

    if (foundNames.length >= 2) {
      parties.push({
        name: foundNames[0],
        role: contractType === 'NDA' ? 'Disclosing Party' : contractType === 'SERVICE_AGREEMENT' ? 'Client / Principal' : 'First Party'
      });
      parties.push({
        name: foundNames[1],
        role: contractType === 'NDA' ? 'Receiving Party' : contractType === 'SERVICE_AGREEMENT' ? 'Service Provider / Contractor' : 'Second Party'
      });
    } else if (foundNames.length === 1) {
      parties.push({ name: foundNames[0], role: 'Primary Party' });
    }

    // Fallback party detection from "between X and Y"
    if (parties.length < 2) {
      const betweenMatch = text.match(/(?:between|by\s+and\s+between)\s+([A-Z][A-Za-z0-9&.,\s]{3,50}?)\s+(?:and|with)\s+([A-Z][A-Za-z0-9&.,\s]{3,50}?)(?=[,.]|\s+dated|\s+effective|\s+having)/i);
      if (betweenMatch) {
        if (!parties.some(p => p.name === betweenMatch[1].trim())) {
          parties.push({ name: betweenMatch[1].trim(), role: 'First Party' });
        }
        if (!parties.some(p => p.name === betweenMatch[2].trim())) {
          parties.push({ name: betweenMatch[2].trim(), role: 'Second Party' });
        }
      }
    }

    // Extract Effective Date
    let effectiveDate: string | undefined;
    const dateMatch = text.match(/\b(?:effective\s+as\s+of|dated|entered\s+into\s+on|effective\s+date:?)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i);
    if (dateMatch) {
      effectiveDate = dateMatch[1];
    }

    // Extract Duration / Term
    let duration: string | undefined;
    const durMatch = text.match(/\b(\d+\s*(?:years?|months?|days?|weeks?))\s*(?:from\s+the\s+effective\s+date|term|period|thereafter)?\b/i);
    if (durMatch) {
      duration = durMatch[0];
    } else if (lower.includes('perpetual') || lower.includes('in perpetuity')) {
      duration = 'Perpetual';
    } else if (lower.includes('at-will') || lower.includes('at will')) {
      duration = 'At-will';
    }

    // Extract Monetary Terms
    let monetaryTerms = 'No monetary consideration specified';
    const moneyMatch = text.match(/(?:₹|\$|€|£|INR|USD|EUR)\s*[\d,]+(?:\.\d{2})?(?:\s*(?:per\s+month|per\s+annum|\/-\s*only|only|monthly|annually))?/i)
      || text.match(/(?:sum\s+of|consideration\s+of|amount\s+of|fee\s+of)\s*([A-Za-z0-9$,.₹\s]+?)(?=\.|\,|$)/i);
    if (moneyMatch) {
      monetaryTerms = moneyMatch[0].trim();
    }

    // Extract Governing Law
    let governingLaw: string | undefined;
    const lawMatch = text.match(/(?:governed\s+by|laws\s+of|accordance\s+with\s+the\s+laws\s+of)\s+([A-Za-z\s]+?)(?=\.|\,|\sand\s+subject|\s+without\s+regard|$)/i);
    if (lawMatch) {
      governingLaw = lawMatch[1].trim();
    }

    // Extract Jurisdiction
    let jurisdiction: string | undefined;
    const jurMatch = text.match(/(?:exclusive\s+jurisdiction\s+of\s+the\s+courts\s+of|courts\s+(?:in|at|of))\s+([A-Za-z\s]+?)(?=\.|\,|$)/i);
    if (jurMatch) {
      jurisdiction = jurMatch[1].trim();
    }

    // Word & Paragraph count
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    return {
      title,
      contractType,
      parties,
      effectiveDate,
      duration,
      monetaryTerms,
      governingLaw,
      jurisdiction,
      wordCount,
      paragraphCount
    };
  }

  /**
   * Generates Clause Completeness Map for the contract type
   */
  private evaluateClauseMap(text: string, contractType: string): ContractClauseMapItem[] {
    const lower = text.toLowerCase();

    // Standard institutional clauses checklist
    const standardClauses: Array<{
      id: string;
      name: string;
      category: string;
      isRequired: boolean;
      keywords: string[];
      minWords: number;
    }> = [
      {
        id: 'parties_preamble',
        name: 'Parties & Recitals',
        category: 'Preamble',
        isRequired: true,
        keywords: ['by and between', 'entered into', 'parties', 'whereas', 'recitals', 'disclosing party', 'receiving party', 'employer', 'employee'],
        minWords: 15
      },
      {
        id: 'definitions',
        name: 'Definitions & Interpretation',
        category: 'Interpretation',
        isRequired: contractType === 'NDA' || contractType === 'SERVICE_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT',
        keywords: ['definition', 'defined terms', 'shall mean', 'confidential information includes', 'for the purposes of this'],
        minWords: 20
      },
      {
        id: 'core_obligations',
        name: contractType === 'NDA' ? 'Non-Disclosure Obligations' : contractType === 'SERVICE_AGREEMENT' ? 'Scope of Services & Deliverables' : 'Core Obligations & Duties',
        category: 'Operative',
        isRequired: true,
        keywords: ['shall not disclose', 'maintain in confidence', 'duty of care', 'scope of work', 'services to be performed', 'obligations of', 'shall perform', 'covenants'],
        minWords: 25
      },
      {
        id: 'exceptions_exclusions',
        name: 'Exceptions & Carve-Outs',
        category: 'Operative',
        isRequired: contractType === 'NDA',
        keywords: ['exceptions', 'exclusions', 'shall not apply', 'public domain', 'prior lawful possession', 'independently developed'],
        minWords: 20
      },
      {
        id: 'consideration_payment',
        name: 'Consideration & Payment Terms',
        category: 'Commercial',
        isRequired: contractType === 'SERVICE_AGREEMENT' || contractType === 'EMPLOYMENT_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT' || contractType === 'LEASE_AGREEMENT',
        keywords: ['consideration', 'payment', 'invoicing', 'compensation', 'salary', 'fees', 'remuneration', 'hourly rate', 'invoice'],
        minWords: 15
      },
      {
        id: 'term_termination',
        name: 'Term, Duration & Termination',
        category: 'Term',
        isRequired: true,
        keywords: ['term', 'duration', 'termination', 'terminate', 'effective period', 'notice period', 'survival'],
        minWords: 20
      },
      {
        id: 'intellectual_property',
        name: 'Intellectual Property Rights',
        category: 'IP & Ownership',
        isRequired: contractType === 'SERVICE_AGREEMENT' || contractType === 'EMPLOYMENT_AGREEMENT',
        keywords: ['intellectual property', 'work for hire', 'work made for hire', 'ip rights', 'proprietary rights', 'assignment of inventions', 'ownership of deliverables'],
        minWords: 20
      },
      {
        id: 'remedies_injunction',
        name: 'Remedies & Injunctive Relief',
        category: 'Enforcement',
        isRequired: contractType === 'NDA',
        keywords: ['remedies', 'injunctive relief', 'irreparable harm', 'damages alone', 'specific performance', 'restraining order'],
        minWords: 15
      },
      {
        id: 'liability_indemnity',
        name: 'Limitation of Liability & Indemnification',
        category: 'Risk Allocation',
        isRequired: contractType === 'SERVICE_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT',
        keywords: ['limitation of liability', 'indemnif', 'hold harmless', 'consequential damages', 'liability cap', 'aggregate liability'],
        minWords: 20
      },
      {
        id: 'governing_law_dispute',
        name: 'Governing Law & Dispute Resolution',
        category: 'Legal',
        isRequired: true,
        keywords: ['governing law', 'jurisdiction', 'laws of', 'arbitration', 'courts of', 'dispute resolution'],
        minWords: 15
      },
      {
        id: 'miscellaneous_boilerplate',
        name: 'Severability & Entire Agreement',
        category: 'Boilerplate',
        isRequired: false,
        keywords: ['severability', 'entire agreement', 'counterparts', 'amendment in writing', 'waiver', 'notices'],
        minWords: 15
      },
      {
        id: 'execution_signatures',
        name: 'Execution & Signature Blocks',
        category: 'Formalities',
        isRequired: true,
        keywords: ['in witness whereof', 'authorized signatory', 'signature:', 'signed by', 'by: ______', 'for and on behalf of'],
        minWords: 10
      }
    ];

    const result: ContractClauseMapItem[] = [];

    for (const sc of standardClauses) {
      let matched = false;
      let matchedSnippet = '';
      let isAmbiguous = false;
      let isIncomplete = false;

      // Search keyword occurrences
      for (const kw of sc.keywords) {
        const idx = lower.indexOf(kw);
        if (idx !== -1) {
          matched = true;
          // Capture surrounding snippet (approx 180 chars)
          const start = Math.max(0, idx - 20);
          const end = Math.min(text.length, idx + 160);
          matchedSnippet = text.substring(start, end).replace(/\n+/g, ' ').trim();

          // Check if truncated or ambiguous
          const surrounding = text.substring(idx, Math.min(text.length, idx + 400));
          const wordCount = surrounding.split(/\s+/).length;
          if (wordCount < sc.minWords) {
            isIncomplete = true;
          }
          if (surrounding.includes('...') || surrounding.includes('TBD') || surrounding.includes('[') || surrounding.includes('to be agreed')) {
            isAmbiguous = true;
          }
          break;
        }
      }

      let status: ContractClauseStatus = 'MISSING';
      let explanation = '';

      if (matched) {
        if (isAmbiguous) {
          status = 'AMBIGUOUS';
          explanation = `Clause detected but contains conditional, unresolved, or vague language.`;
        } else if (isIncomplete) {
          status = 'INCOMPLETE';
          explanation = `Clause detected but appears brief or truncated (${matchedSnippet.split(/\s+/).length} words).`;
        } else {
          status = 'PRESENT';
          explanation = `Standard provisions are explicitly stated.`;
        }
      } else {
        status = 'MISSING';
        explanation = sc.isRequired
          ? `Essential clause for standard ${contractType.replace(/_/g, ' ')} is absent.`
          : `Recommended institutional clause is not present in document.`;
      }

      result.push({
        id: sc.id,
        name: sc.name,
        category: sc.category,
        status,
        isRequired: sc.isRequired,
        detectedSnippet: matchedSnippet || undefined,
        explanation
      });
    }

    return result;
  }

  /**
   * Evaluates Risk & Attention Areas
   */
  private evaluateRiskAreas(text: string, contractType: string, overview: ContractOverview): ContractRiskArea[] {
    const risks: ContractRiskArea[] = [];
    const lower = text.toLowerCase();

    // Helper to find location
    const findLocation = (target: string) => {
      const idx = text.indexOf(target);
      if (idx === -1) return undefined;
      const linesBefore = text.substring(0, idx).split('\n').length;
      return { line: linesBefore, textRange: { start: idx, end: idx + target.length } };
    };

    // 1. Unresolved Placeholders / Template Artifacts
    const placeholderRegex = /(\[[A-Z\s_-]{3,35}\]|TBD|<insert[^>]*>|__________|Specify\s+the\s+exact)/gi;
    let phMatch;
    const detectedPhs: string[] = [];
    while ((phMatch = placeholderRegex.exec(text)) !== null) {
      if (!detectedPhs.includes(phMatch[0])) {
        detectedPhs.push(phMatch[0]);
      }
    }
    if (detectedPhs.length > 0) {
      const samplePh = detectedPhs[0];
      risks.push({
        id: 'unresolved_placeholders',
        severity: 'HIGH',
        category: 'Clarity & Completeness',
        clause: 'Drafting Placeholders',
        title: 'Unresolved Template Placeholders',
        description: `Contract contains ${detectedPhs.length} unresolved placeholder(s) or drafting prompts that have not been replaced with concrete terms.`,
        evidence: detectedPhs.slice(0, 3).join(', '),
        location: findLocation(samplePh),
        legalRationale: 'Drafting placeholders render contractual commitments ambiguous or unenforceable.',
        suggestedResolution: 'Replace all brackets, underscores, and TBD prompts with verified names, dates, and terms.'
      });
    }

    // 2. Uncapped Liability Exposure
    if (contractType === 'SERVICE_AGREEMENT' || contractType === 'COMMERCIAL_CONTRACT') {
      const hasLiability = lower.includes('liability') || lower.includes('indemnif');
      const hasCap = lower.includes('aggregate liability') || lower.includes('shall not exceed') || lower.includes('cap on liability') || lower.includes('limited to the total fees');
      if (hasLiability && !hasCap) {
        risks.push({
          id: 'uncapped_liability',
          severity: 'HIGH',
          category: 'Liability & Indemnity',
          clause: 'Limitation of Liability',
          title: 'Uncapped Liability Exposure',
          description: 'Contract imposes indemnification or breach obligations without an express monetary cap or exclusion of consequential damages.',
          evidence: 'No aggregate liability cap detected in document text.',
          legalRationale: 'Uncapped liability exposes contracting parties to disproportionate financial damages.',
          suggestedResolution: 'Add a standard liability limitation clause capping aggregate damages to total fees paid during the preceding 12 months.'
        });
      }
    }

    // 3. Unilateral Termination Without Cause or Notice
    if (lower.includes('terminate immediately') || lower.includes('without notice')) {
      const immMatch = text.match(/[^\n.]{0,80}(?:terminate\s+immediately|without\s+notice)[^\n.]{0,80}/i);
      if (immMatch && !lower.includes('material breach') && !lower.includes('insolvency')) {
        risks.push({
          id: 'unilateral_immediate_termination',
          severity: 'MEDIUM',
          category: 'Termination',
          clause: 'Termination',
          title: 'Immediate Termination Without Cause or Cure Period',
          description: 'Contract permits unilateral termination immediately without providing an opportunity to cure default.',
          evidence: immMatch[0].trim(),
          location: findLocation(immMatch[0]),
          legalRationale: 'Immediate termination without a standard 15 to 30 day cure period creates operational and business continuity risk.',
          suggestedResolution: 'Insert a standard 30-day written notice and cure period prior to contract termination for default.'
        });
      }
    }

    // 4. Missing IP Assignment in Services Agreement
    if (contractType === 'SERVICE_AGREEMENT') {
      const hasCustomWork = lower.includes('deliverables') || lower.includes('custom software') || lower.includes('develop') || lower.includes('create');
      const hasIpAssignment = lower.includes('work for hire') || lower.includes('work made for hire') || lower.includes('assigns all right, title and interest') || lower.includes('exclusive property of client');
      if (hasCustomWork && !hasIpAssignment) {
        risks.push({
          id: 'missing_ip_assignment',
          severity: 'HIGH',
          category: 'IP & Ownership',
          clause: 'Intellectual Property',
          title: 'Ambiguous Deliverables IP Ownership',
          description: 'Custom deliverables are commissioned, but the contract lacks an express assignment of intellectual property rights to the Client.',
          evidence: 'Custom deliverables mentioned without express IP assignment clauses.',
          legalRationale: 'Under IP statutes, creator retains copyright unless explicitly assigned in writing under work-for-hire provisions.',
          suggestedResolution: 'Include an express IP assignment clause stipulating that all deliverables shall be deemed works made for hire owned exclusively by the Client.'
        });
      }
    }

    // 5. Payment Obligation Without Definite Amount (Only if payment obligation exists!)
    if (contractType !== 'NDA') {
      const hasPaymentCovenant = lower.includes('shall pay') || lower.includes('agrees to pay') || lower.includes('in consideration of the services, client shall pay');
      const hasAmount = /(?:₹|\$|€|£|INR|USD|EUR)\s*[\d,]+/i.test(text) || /\b\d+\s*(?:dollars|rupees|euros)\b/i.test(text);
      if (hasPaymentCovenant && !hasAmount) {
        const covenantSnippet = text.match(/[^\n.]{0,80}(?:shall\s+pay|agrees\s+to\s+pay)[^\n.]{0,80}/i);
        risks.push({
          id: 'missing_payment_amount',
          severity: 'HIGH',
          category: 'Financial Terms',
          clause: 'Consideration',
          title: 'Payment Covenant Without Specified Consideration',
          description: 'Contract imposes an affirmative payment obligation but fails to specify the numerical monetary amount, fee schedule, or payment formula.',
          evidence: covenantSnippet ? covenantSnippet[0].trim() : 'Payment obligation without monetary amount.',
          location: covenantSnippet ? findLocation(covenantSnippet[0]) : undefined,
          legalRationale: 'Contracts lacking agreed consideration or calculation mechanisms may fail for indefiniteness.',
          suggestedResolution: 'Specify the exact monetary amount, currency, tax terms, and payment due dates.'
        });
      }
    }

    // 6. Indefinite Duration / Missing Term
    if (!overview.duration && contractType !== 'LEGAL_NOTICE') {
      risks.push({
        id: 'missing_contract_term',
        severity: 'MEDIUM',
        category: 'Term',
        clause: 'Term & Termination',
        title: 'Undefined Agreement Duration',
        description: 'No explicit duration, expiry date, or term of validity was detected.',
        evidence: 'Absence of term duration clause.',
        legalRationale: 'Agreements without a defined term may be terminable at will by either party upon reasonable notice.',
        suggestedResolution: 'State an explicit term (e.g. "for a period of 2 years from the Effective Date").'
      });
    }

    // 7. Broken Cross-References
    const secRefRegex = /\b(?:Section|Clause|Article)\s+(\d+(?:\.\d+)?)\b/gi;
    let secMatch;
    const referencedSections: string[] = [];
    while ((secMatch = secRefRegex.exec(text)) !== null) {
      if (!referencedSections.includes(secMatch[1])) {
        referencedSections.push(secMatch[1]);
      }
    }
    for (const ref of referencedSections) {
      // Check if this section header exists in document
      const headerPattern = new RegExp(`(?:#+\\s*(?:Section\\s+)?${ref}\\b|^\\s*${ref}\\.?\\s+[A-Z])`, 'm');
      if (!headerPattern.test(text) && ref !== '1' && ref !== '2') {
        risks.push({
          id: `broken_ref_${ref}`,
          severity: 'LOW',
          category: 'Clarity & Completeness',
          clause: 'Cross-References',
          title: `Broken Internal Cross-Reference (Section ${ref})`,
          description: `Contract refers to "Section ${ref}", but no corresponding section heading was found in the text.`,
          evidence: `Reference to Section ${ref}`,
          legalRationale: 'Internal cross-reference errors create ambiguities during dispute interpretation.',
          suggestedResolution: `Verify numbering and update reference to point to the correct operative clause.`
        });
        break; // Limit to 1 finding to avoid clutter
      }
    }

    // 8. Missing Signature Blocks
    const hasSignatureBlock = lower.includes('in witness whereof') || lower.includes('authorized signatory') || lower.includes('signature:');
    if (!hasSignatureBlock && contractType !== 'LEGAL_NOTICE') {
      risks.push({
        id: 'missing_signatures',
        severity: 'HIGH',
        category: 'Formalities',
        clause: 'Signatures',
        title: 'Missing Execution / Signature Block',
        description: 'Contract lacks formal signature execution lines for the designated parties.',
        evidence: 'No signature block detected at end of document.',
        legalRationale: 'Unexecuted contracts without authorized signatures lack evidentiary proof of mutual consent.',
        suggestedResolution: 'Add standard signature blocks with party names, authorized signatory titles, and execution dates.'
      });
    }

    return risks;
  }

  /**
   * Verifies Internal Factual Consistency
   */
  private checkConsistency(text: string, overview: ContractOverview): ContractConsistencyCheck {
    const findings: string[] = [];
    const lower = text.toLowerCase();

    // 1. Party Name Consistency
    let partiesMatch = true;
    if (overview.parties.length >= 2) {
      const p1 = overview.parties[0].name.toLowerCase();
      const p2 = overview.parties[1].name.toLowerCase();

      // Check if party names appear in both preamble and signature area
      const lastQuarter = lower.substring(Math.floor(lower.length * 0.75));
      const p1InEnd = lastQuarter.includes(p1.slice(0, 8));
      const p2InEnd = lastQuarter.includes(p2.slice(0, 8));

      if (!p1InEnd && !p2InEnd && lastQuarter.includes('signature')) {
        partiesMatch = false;
        findings.push(`Party names "${overview.parties[0].name}" or "${overview.parties[1].name}" do not clearly recur in the signature execution block.`);
      }
    }

    // 2. Date Chronology
    let dateChronologyValid = true;
    const allDates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    if (allDates.length >= 2 && allDates[0] && allDates[1]) {
      const d1 = new Date(allDates[0]);
      const d2 = new Date(allDates[1]);
      if (d1 > d2 && !isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        dateChronologyValid = false;
        findings.push(`Chronological discrepancy detected: Date ${allDates[0]} appears before earlier reference date ${allDates[1]}.`);
      }
    }

    // 3. Defined Terms
    let definedTermsConsistent = true;
    const definedTermsMatches = text.match(/"([A-Z][A-Za-z\s]{2,30})"\s*(?:means|shall mean|refers to)/g) || [];
    if (definedTermsMatches.length > 0) {
      for (const dt of definedTermsMatches) {
        const term = dt.replace(/"/g, '').split(/\s*(?:means|shall mean|refers to)/)[0].trim();
        const count = (text.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
        if (count <= 1) {
          findings.push(`Defined term "${term}" is formally defined but never subsequently invoked in the agreement.`);
        }
      }
    }

    if (findings.length === 0) {
      findings.push('No internal factual contradictions, party naming conflicts, or chronological anomalies detected.');
    }

    return {
      partiesMatch,
      dateChronologyValid,
      definedTermsConsistent,
      findings
    };
  }

  /**
   * Computes Explainable Contract Health Score
   */
  private calculateHealthScore(
    clauseMap: ContractClauseMapItem[],
    risks: ContractRiskArea[],
    consistency: ContractConsistencyCheck
  ) {
    let score = 100;
    const scoreBreakdown: string[] = [];

    // Clause Completeness calculation (25% weight)
    const requiredClauses = clauseMap.filter(c => c.isRequired);
    const presentCount = requiredClauses.filter(c => c.status === 'PRESENT').length;
    const incompleteCount = requiredClauses.filter(c => c.status === 'INCOMPLETE').length;
    const ambiguousCount = requiredClauses.filter(c => c.status === 'AMBIGUOUS').length;
    const missingCount = requiredClauses.filter(c => c.status === 'MISSING').length;

    const completenessRatio = requiredClauses.length > 0
      ? (presentCount * 1.0 + incompleteCount * 0.5 + ambiguousCount * 0.6) / requiredClauses.length
      : 1.0;
    const completenessScore = Math.round(completenessRatio * 100);

    // Deduct for missing required clauses
    if (missingCount > 0) {
      const deduction = missingCount * 12;
      score -= deduction;
      scoreBreakdown.push(`-${deduction} pts: ${missingCount} required legal clause(s) missing from draft`);
    }

    // Risk Deductions
    const critRisks = risks.filter(r => r.severity === 'CRITICAL').length;
    const highRisks = risks.filter(r => r.severity === 'HIGH').length;
    const medRisks = risks.filter(r => r.severity === 'MEDIUM').length;
    const lowRisks = risks.filter(r => r.severity === 'LOW').length;

    if (critRisks > 0) {
      const deduction = critRisks * 25;
      score -= deduction;
      scoreBreakdown.push(`-${deduction} pts: ${critRisks} critical contractual defect(s) detected`);
    }
    if (highRisks > 0) {
      const deduction = highRisks * 12;
      score -= deduction;
      scoreBreakdown.push(`-${deduction} pts: ${highRisks} high-severity risk(s) flagged`);
    }
    if (medRisks > 0) {
      const deduction = medRisks * 6;
      score -= deduction;
      scoreBreakdown.push(`-${deduction} pts: ${medRisks} medium-severity risk(s) flagged`);
    }
    if (lowRisks > 0) {
      const deduction = lowRisks * 2;
      score -= deduction;
      scoreBreakdown.push(`-${deduction} pts: ${lowRisks} minor / stylistic item(s)`);
    }

    // Consistency deductions
    if (!consistency.partiesMatch) {
      score -= 8;
      scoreBreakdown.push(`-8 pts: Inconsistent party names across document`);
    }
    if (!consistency.dateChronologyValid) {
      score -= 6;
      scoreBreakdown.push(`-6 pts: Contradictory chronological date sequence`);
    }

    // HARD SCORING CAPS
    if (missingCount >= 2 || critRisks > 0) {
      score = Math.min(score, 50);
      scoreBreakdown.push(`[Hard Cap] Capped at 50% due to multiple missing core clauses or critical defects`);
    } else if (highRisks >= 2) {
      score = Math.min(score, 65);
      scoreBreakdown.push(`[Hard Cap] Capped at 65% due to 2+ high-severity legal risks`);
    }

    // Bound final score between 10 and 98 (never claim 100% automated perfection)
    score = Math.max(15, Math.min(98, score));

    // Determine status
    let status: 'STRONG' | 'MODERATE' | 'NEEDS_REVISION' | 'CRITICAL_ATTENTION' = 'STRONG';
    if (score < 50) status = 'CRITICAL_ATTENTION';
    else if (score < 70) status = 'NEEDS_REVISION';
    else if (score < 85) status = 'MODERATE';

    // Sub-category scores
    const riskAndCompliance = Math.max(20, Math.min(100, 100 - (critRisks * 30 + highRisks * 15 + medRisks * 8)));
    const consistencyScore = consistency.partiesMatch && consistency.dateChronologyValid ? 95 : 65;
    const clarityScore = risks.some(r => r.id === 'unresolved_placeholders') ? 45 : 90;

    return {
      score,
      status,
      categoryScores: {
        completeness: completenessScore,
        riskAndCompliance,
        consistency: consistencyScore,
        clarity: clarityScore
      },
      scoreBreakdown,
      disclaimer: 'Potential issue requiring human review. ATHARV AI provides analysis for research and educational purposes and does not constitute formal legal counsel.'
    };
  }
}

export const contractAnalyzer = new ContractAnalyzer();

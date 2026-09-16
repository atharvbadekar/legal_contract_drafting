/**
 * ATHARV Legal AI - Required & Recommended Fields Validator
 * Enforces strict presence and validity of required contract fields (Parties, Dates,
 * Jurisdiction, Term, Considerations), detects unresolved fill-in placeholders,
 * and eliminates false 100% validation scores for incomplete documents.
 */

import {
  locateTextInDocument,
  DocumentLocation,
  DocumentPatch
} from '../documents/document_structure.js';
import { ValidationFinding } from './validation_engine.js';

export type FieldRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export interface FieldDefinition {
  key: string;
  label: string;
  requirement: FieldRequirement;
  description: string;
  category: 'FACTUAL' | 'STRUCTURAL';
  aliases: string[]; // Paths or keys in facts
  // Function or patterns to check if field is present in document text
  textPatterns?: RegExp[];
  missingReason: string;
  suggestion: string;
}

export interface DetectedPlaceholder {
  rawText: string;
  fieldHint?: string;
  startIndex: number;
  endIndex: number;
  lineSnippet: string;
}

// ============================================================================
// CANONICAL FIELD DEFINITIONS PER DOCUMENT TYPE
// ============================================================================

export const NDA_FIELDS: FieldDefinition[] = [
  {
    key: 'disclosingParty',
    label: 'Disclosing Party Name',
    requirement: 'REQUIRED',
    description: 'Legal name of the entity or individual disclosing confidential information.',
    category: 'FACTUAL',
    aliases: ['disclosingParty.name', 'disclosingParty', 'parties.disclosingParty', 'partyA', 'client'],
    textPatterns: [
      /(?:entered\s+into\s+by|by\s+and\s+between)\s+([^,("\n]+?)(?=\s*\(|,|\s+and\b)/i,
      /Disclosing\s+Party[:\s]+([^\n,]+)/i
    ],
    missingReason: 'An NDA requires identification of the disclosing party to establish privity of contract and confidentiality covenants.',
    suggestion: 'Specify the registered legal name of the Disclosing Party in the agreement preamble.'
  },
  {
    key: 'receivingParty',
    label: 'Receiving Party Name',
    requirement: 'REQUIRED',
    description: 'Legal name of the entity or individual receiving confidential information.',
    category: 'FACTUAL',
    aliases: ['receivingParty.name', 'receivingParty', 'parties.receivingParty', 'partyB', 'recipient', 'serviceProvider', 'contractor'],
    textPatterns: [
      /(?:and\s+)([^,("\n]+?)(?=\s*\("Receiving|\s*\(the\s*"Receiving|\s*,?\s*hereinafter\s+referred\s+to\s+as\s*"Receiving)/i,
      /Receiving\s+Party[:\s]+([^\n,]+)/i
    ],
    missingReason: 'An NDA is unenforceable unless the receiving entity bound by non-disclosure covenants is legally identifiable.',
    suggestion: 'Specify the registered legal name of the Receiving Party in the agreement preamble.'
  },
  {
    key: 'effectiveDate',
    label: 'Effective Date',
    requirement: 'REQUIRED',
    description: 'Date on which the agreement and confidentiality covenants take effect.',
    category: 'FACTUAL',
    aliases: ['effectiveDate', 'date', 'commencementDate', 'agreementDate'],
    textPatterns: [
      /(?:effective\s+(?:as\s+of|date:?)|dated\s+as\s+of|made\s+and\s+entered\s+into\s+(?:on\s+this|as\s+of)?)\s*([A-Za-z0-9\s,\-\/]{4,30})(?=\.|,|\n|\)|$)/i,
      /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+\d{4})\b/i,
      /\b(\d{4}-\d{2}-\d{2})\b/,
      /(?:from\s+the\s+effective\s+date|as\s+of\s+the\s+effective\s+date|commencing\s+on\s+the\s+effective\s+date|date\s+first\s+written\s+above|date\s+of\s+execution)/i
    ],
    missingReason: 'Without a discernible Effective Date, the commencement of confidentiality duties and survival periods cannot be established.',
    suggestion: 'Specify the formal Effective Date (e.g., DD Month YYYY) in the agreement preamble.'
  },
  {
    key: 'duration',
    label: 'Term / Duration of Confidentiality',
    requirement: 'REQUIRED',
    description: 'Duration of the agreement or survival period of confidentiality obligations.',
    category: 'STRUCTURAL',
    aliases: ['duration', 'term', 'confidentialityTerm', 'survivalPeriod'],
    textPatterns: [
      /\b(\d+\s*(?:years?|months?))\b/i,
      /(?:in\s+effect\s+for|period\s+of|term\s+of)\s*(\d+\s*(?:years?|months?))/i,
      /survive\s+for\s*(?:a\s+period\s+of\s*)?(\d+\s*(?:years?|months?))/i,
      /in\s+perpetuity|perpetual/i
    ],
    missingReason: 'Omitting a definite term or survival period creates legal uncertainty over when confidentiality restrictions expire.',
    suggestion: 'Specify the duration of the agreement and survival period (e.g., "3 years from the Effective Date").'
  },
  {
    key: 'governingLaw',
    label: 'Governing Law & Jurisdiction',
    requirement: 'REQUIRED',
    description: 'Governing state or national jurisdiction and chosen forum for dispute resolution.',
    category: 'STRUCTURAL',
    aliases: ['governingLaw', 'jurisdiction', 'applicableLaw'],
    textPatterns: [
      /(?:governed\s+by|construed\s+in\s+accordance\s+with|laws\s+of|jurisdiction\s+of)\s+([A-Za-z\s]+?)(?=\.|\,|\s+and|\n|$)/i
    ],
    missingReason: 'Omitting governing law exposes disputes to conflict-of-laws uncertainties and forum disputes.',
    suggestion: 'Designate the governing jurisdiction and competent courts in the Governing Law section.'
  },
  {
    key: 'purpose',
    label: 'Authorized Purpose',
    requirement: 'RECOMMENDED',
    description: 'The specific commercial or evaluation purpose for which confidential information may be used.',
    category: 'STRUCTURAL',
    aliases: ['purpose', 'authorizedPurpose', 'project'],
    textPatterns: [
      /(?:solely\s+for\s+the\s+purpose\s+of|evaluating\s+a\s+potential|exploring\s+a\s+business|purpose\s+of|potential\s+business|potential\s+transaction|disclosed\s+by\s+either\s+party|business\s+relationship)\b/i,
      /##\s*Purpose/i
    ],
    missingReason: 'Without a defined Authorized Purpose, restrictions on the permitted use of disclosed information are ambiguous.',
    suggestion: 'Clearly define the specific commercial purpose (e.g., "evaluating a potential business collaboration").'
  }
];

export const NOTICE_FIELDS: FieldDefinition[] = [
  {
    key: 'senderName',
    label: 'Sender / Claimant Name',
    requirement: 'REQUIRED',
    description: 'Full legal name and details of the party issuing the legal notice.',
    category: 'FACTUAL',
    aliases: ['sender.name', 'senderName', 'claimant', 'sender', 'partyA'],
    textPatterns: [
      /(?:From|Sender|On\s+behalf\s+of)[:\s]+([^\n,]+)/i,
      /(?:I|we),\s+([A-Za-z0-9\s\.,&]+),\s+(?:advocate|counsel|director|claimant)/i
    ],
    missingReason: 'A legal notice must authoritatively identify the aggrieved sender issuing the statutory demand.',
    suggestion: 'Include the full legal name and representation of the Sender in the notice header.'
  },
  {
    key: 'recipientName',
    label: 'Recipient / Addressee Name',
    requirement: 'REQUIRED',
    description: 'Full legal name and address of the defaulting or recipient party.',
    category: 'FACTUAL',
    aliases: ['recipient.name', 'recipientName', 'recipient', 'partyB'],
    textPatterns: [
      /(?:To|Recipient|Addressed\s+to)[:\s]+([^\n,]+)/i
    ],
    missingReason: 'Without accurate recipient details, valid statutory service of legal notice cannot be established.',
    suggestion: 'Address the notice explicitly to the formal registered name and address of the Recipient.'
  },
  {
    key: 'noticeDate',
    label: 'Date of Notice',
    requirement: 'REQUIRED',
    description: 'Date of issuance of the statutory legal notice.',
    category: 'FACTUAL',
    aliases: ['noticeDate', 'date', 'effectiveDate'],
    textPatterns: [
      /(?:Date|Dated)[:\s]+([A-Za-z0-9\s,\-\/]{4,30})(?=\n|$)/i,
      /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
      /\b(\d{4}-\d{2}-\d{2})\b/
    ],
    missingReason: 'The notice issuance date is mandatory to establish the commencement of statutory cure and limitation periods.',
    suggestion: 'Include the formal issuance date at the top of the notice.'
  },
  {
    key: 'breachDescription',
    label: 'Description of Breach / Default',
    requirement: 'REQUIRED',
    description: 'Factual narrative detailing the contract breach, non-payment, or statutory default.',
    category: 'STRUCTURAL',
    aliases: ['breach', 'default', 'causeOfAction', 'dispute'],
    textPatterns: [
      /(?:breach\s+of|failed\s+to|default\s+in|dishonou?r\s+of|unlawfully|non-payment\s+of)\b/i,
      /##\s*(?:Breach|Default|Statement\s+of\s+Facts)/i
    ],
    missingReason: 'A legal notice must specifically articulate the factual breach or default supporting the demand.',
    suggestion: 'Provide a chronological statement of facts detailing the recipient\'s breach or non-performance.'
  },
  {
    key: 'demand',
    label: 'Operative Demand / Cure Requirement',
    requirement: 'REQUIRED',
    description: 'Clear, unambiguous demand for payment, performance, or cessation of conduct.',
    category: 'STRUCTURAL',
    aliases: ['demand', 'claim', 'cure', 'relief'],
    textPatterns: [
      /(?:hereby\s+call\s+upon\s+you|demand\s+that\s+you|pay\s+the\s+sum|remit\s+the\s+amount|cure\s+the\s+said\s+breach)\b/i,
      /##\s*Demand/i
    ],
    missingReason: 'A legal notice is legally ineffective if it lacks an explicit operative demand.',
    suggestion: 'State the exact demand required from the recipient (e.g., pay outstanding dues or cure specific breach).'
  },
  {
    key: 'responsePeriod',
    label: 'Response / Cure Period',
    requirement: 'REQUIRED',
    description: 'Specific deadline or timeframe (in days) given to the recipient to comply.',
    category: 'STRUCTURAL',
    aliases: ['responsePeriod', 'curePeriod', 'noticePeriod'],
    textPatterns: [
      /\b(\d+)\s*days\b/i,
      /(?:within|period\s+of)\s*(\d+)\s*days/i
    ],
    missingReason: 'Statutory notices must provide a definite cure period (e.g., 15 or 30 days) before initiating legal proceedings.',
    suggestion: 'Specify the exact compliance period (e.g., "within 15 days of receipt of this notice").'
  },
  {
    key: 'amount',
    label: 'Claimed Monetary Amount',
    requirement: 'RECOMMENDED',
    description: 'Specific monetary sum demanded (if notice relates to a monetary debt or damages).',
    category: 'FACTUAL',
    aliases: ['amount', 'claimAmount', 'debtAmount', 'outstandingAmount'],
    textPatterns: [
      /\$[\d,]+|\bINR\s*[\d,]+|\bRs\.?\s*[\d,]+|\bUSD\s*[\d,]+|\bEUR\s*[\d,]+|\b\d+\s*rupees\b|\b\d+\s*dollars\b/i
    ],
    missingReason: 'Monetary demands require an exact, ascertainable principal and interest figure.',
    suggestion: 'State the precise monetary sum claimed, including currency and applicable interest.'
  }
];

export const CONTRACT_FIELDS: FieldDefinition[] = [
  {
    key: 'clientName',
    label: 'Client / Company Name',
    requirement: 'REQUIRED',
    description: 'Legal name of the contracting client entity.',
    category: 'FACTUAL',
    aliases: ['client.name', 'clientName', 'company', 'partyA', 'disclosingParty.name', 'disclosingParty'],
    textPatterns: [
      /(?:entered\s+into\s+by|by\s+and\s+between)\s+([^,("\n]+)/i
    ],
    missingReason: 'Contracting party identity is essential to establish contractual privity.',
    suggestion: 'Specify the registered legal name of the Client/Company in the preamble.'
  },
  {
    key: 'contractorName',
    label: 'Service Provider / Contractor Name',
    requirement: 'REQUIRED',
    description: 'Legal name of the contractor or service provider.',
    category: 'FACTUAL',
    aliases: ['serviceProvider.name', 'contractorName', 'contractor', 'partyB', 'receivingParty.name', 'receivingParty'],
    textPatterns: [
      /(?:and\s+)([^,("\n]+?)(?=\s*\("Contractor|\s*\("Service|\s*\("Consultant)/i
    ],
    missingReason: 'The performing entity must be identified to bind service obligations.',
    suggestion: 'Specify the registered legal name of the Contractor in the preamble.'
  },
  {
    key: 'effectiveDate',
    label: 'Effective Date',
    requirement: 'REQUIRED',
    description: 'Commencement date of the contract.',
    category: 'FACTUAL',
    aliases: ['effectiveDate', 'startDate', 'date'],
    textPatterns: [
      /(?:effective\s+(?:as\s+of|date:?)|dated\s+as\s+of)\s*([A-Za-z0-9\s,\-\/]{4,30})/i,
      /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
      /\b(\d{4}-\d{2}-\d{2})\b/
    ],
    missingReason: 'A valid contract must establish the effective commencement date of obligations.',
    suggestion: 'Specify the Effective Date in the contract preamble.'
  },
  {
    key: 'compensation',
    label: 'Consideration / Compensation Amount',
    requirement: 'REQUIRED',
    description: 'Contract price, fee schedule, or remuneration.',
    category: 'FACTUAL',
    aliases: ['amount', 'fee', 'compensation', 'price', 'rate'],
    textPatterns: [
      /\$[\d,]+|\bINR\s*[\d,]+|\bRs\.?\s*[\d,]+|\bUSD\s*[\d,]+|\bEUR\s*[\d,]+|\b\d+\s*dollars\b|\b\d+\s*per\s*(?:hour|month|day)\b/i
    ],
    missingReason: 'Commercial contracts lacking definite consideration or an agreed payment formula are unenforceable.',
    suggestion: 'Specify the monetary fee, payment rate, or installment schedule in the Payment section.'
  },
  {
    key: 'term',
    label: 'Term and Termination',
    requirement: 'REQUIRED',
    description: 'Contract duration and termination conditions.',
    category: 'STRUCTURAL',
    aliases: ['duration', 'term'],
    textPatterns: [
      /\b(\d+\s*(?:years?|months?|weeks?))\b/i,
      /##\s*(?:Term|Termination)/i
    ],
    missingReason: 'The contract must define its operational term and conditions for termination.',
    suggestion: 'Include a Term and Termination section defining duration and notice periods.'
  },
  {
    key: 'governingLaw',
    label: 'Governing Law',
    requirement: 'REQUIRED',
    description: 'Governing legal jurisdiction.',
    category: 'STRUCTURAL',
    aliases: ['governingLaw', 'jurisdiction'],
    textPatterns: [
      /(?:governed\s+by|laws\s+of)\s+([A-Za-z\s]+?)(?=\.|\,|$)/i
    ],
    missingReason: 'Governing jurisdiction must be designated to govern contractual interpretation.',
    suggestion: 'Stipulate governing law in the miscellaneous/governing law clause.'
  }
];

// ============================================================================
// PLACEHOLDER DETECTION
// ============================================================================

/**
 * Detects unresolved placeholders, fill-in prompts, blanks, and generic fallbacks.
 * Distinguishes between:
 * - Real fill-in placeholders that MUST be completed (e.g. `[Party Name]`, `[Insert Date]`, `TBD`, `________`)
 * - Preamble drafting guide instructions (e.g. `> Note: ...`, `<!-- ... -->`)
 * - Recognized signature lines (e.g. `By: _________________`)
 */
export function detectPlaceholders(fullText: string): DetectedPlaceholder[] {
  const placeholders: DetectedPlaceholder[] = [];
  if (!fullText) return placeholders;

  const lines = fullText.split('\n');
  let currentOffset = 0;
  let inSignatureBlock = false;

  // Patterns that indicate fill-in placeholders
  const bracketFillPattern = /\[\s*(?:(?:insert|specify|enter|define|describe|fill\s*in)?\s*(?:party|name|disclosing|receiving|company|client|contractor|vendor|employer|employee|date|effective\s*date|commencement|address|amount|fee|sum|compensation|duration|term|jurisdiction|governing\s*law|title|representative|signatory|authorized|city|state|country|email|phone|contact)[^\]]*|tbd|to\s*be\s*determined|n\/a|unknown|unspecified|your\s*name|party\s*[ab]|company\s*name)\s*\]/gi;

  const genericBracketBlanks = /\[\s*(?:_{2,}|\.{3,}|\s*)\s*\]/g;
  const standaloneAngleFill = /<\s*(?:insert|specify|enter|party|name|date|amount|company|address|jurisdiction)[^>]*>/gi;
  const standaloneCurlyFill = /\{\s*(?:insert|specify|enter|party|name|date|amount|company|address|jurisdiction)[^}]*\}/gi;
  const nakedKeywordFill = /\b(?:TBD|N\/A|YOUR\s+NAME|ENTER\s+PARTY\s+NAME|INSERT\s+DATE|INSERT\s+NAME|PARTY\s+A\s+NAME|PARTY\s+B\s+NAME)\b/g;

  // Generic fallback roles used as party names without entity qualification:
  // e.g. "by and between Disclosing Party and Receiving Party" with no company name
  const nakedRoleAsPartyPattern = /(?:by\s+and\s+between|entered\s+into\s+by)\s+(?:the\s+)?(Disclosing\s+Party|Party\s+A|Client|Company)\s+and\s+(?:the\s+)?(Receiving\s+Party|Party\s+B|Contractor|Service\s+Provider)(?!\s+(?:Pvt|Ltd|Inc|LLC|LLP|Corporation))/g;

  // Extended blank line pattern
  const extendedBlankPattern = /_{4,}/g;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineStart = currentOffset;
    const lineEnd = lineStart + line.length;
    currentOffset = lineEnd + 1; // +1 for newline

    const trimmed = line.trim();

    if (/^##\s*.*(?:execution|signatures?)/i.test(trimmed) || /in\s+witness\s+whereof/i.test(trimmed)) {
      inSignatureBlock = true;
    }

    // Skip blockquotes / drafting instruction comments that are guide banners
    if (/^\s*>\s*(?:note|instructions?|guidance|prompt|tip|important|warning):?/i.test(trimmed)) {
      continue;
    }
    if (/^<!--[\s\S]*?-->$/.test(trimmed)) {
      continue;
    }

    // 1. Bracket fill patterns
    let match: RegExpExecArray | null;
    bracketFillPattern.lastIndex = 0;
    while ((match = bracketFillPattern.exec(line)) !== null) {
      placeholders.push({
        rawText: match[0],
        startIndex: lineStart + match.index,
        endIndex: lineStart + match.index + match[0].length,
        lineSnippet: trimmed
      });
    }

    // 2. Bracket blanks [_] or [...]
    genericBracketBlanks.lastIndex = 0;
    while ((match = genericBracketBlanks.exec(line)) !== null) {
      placeholders.push({
        rawText: match[0],
        startIndex: lineStart + match.index,
        endIndex: lineStart + match.index + match[0].length,
        lineSnippet: trimmed
      });
    }

    // 3. Angle fill patterns <insert ...>
    standaloneAngleFill.lastIndex = 0;
    while ((match = standaloneAngleFill.exec(line)) !== null) {
      placeholders.push({
        rawText: match[0],
        startIndex: lineStart + match.index,
        endIndex: lineStart + match.index + match[0].length,
        lineSnippet: trimmed
      });
    }

    // 4. Curly fill patterns {insert ...}
    standaloneCurlyFill.lastIndex = 0;
    while ((match = standaloneCurlyFill.exec(line)) !== null) {
      placeholders.push({
        rawText: match[0],
        startIndex: lineStart + match.index,
        endIndex: lineStart + match.index + match[0].length,
        lineSnippet: trimmed
      });
    }

    // 5. Naked keywords (TBD, N/A, YOUR NAME)
    nakedKeywordFill.lastIndex = 0;
    while ((match = nakedKeywordFill.exec(line)) !== null) {
      placeholders.push({
        rawText: match[0],
        startIndex: lineStart + match.index,
        endIndex: lineStart + match.index + match[0].length,
        lineSnippet: trimmed
      });
    }

    // 6. Extended blanks (____) - only flag if NOT a standard signature line
    const isSignatureExecutionLine =
      inSignatureBlock ||
      /(?:by|signature|name|title|date|authorized\s*signatory|for\s+and\s+on\s+behalf\s+of)[:\s]+_{3,}/i.test(trimmed) ||
      /:\s*_{3,}\s*$/.test(trimmed);

    if (!isSignatureExecutionLine) {
      extendedBlankPattern.lastIndex = 0;
      while ((match = extendedBlankPattern.exec(line)) !== null) {
        placeholders.push({
          rawText: match[0],
          startIndex: lineStart + match.index,
          endIndex: lineStart + match.index + match[0].length,
          lineSnippet: trimmed
        });
      }
    }

    // 7. Naked role used as party name
    nakedRoleAsPartyPattern.lastIndex = 0;
    while ((match = nakedRoleAsPartyPattern.exec(line)) !== null) {
      placeholders.push({
        rawText: match[0],
        startIndex: lineStart + match.index,
        endIndex: lineStart + match.index + match[0].length,
        lineSnippet: trimmed
      });
    }
  }

  // Deduplicate overlapping placeholders
  const deduped: DetectedPlaceholder[] = [];
  for (const p of placeholders) {
    const overlaps = deduped.some(d =>
      (p.startIndex >= d.startIndex && p.startIndex < d.endIndex) ||
      (p.endIndex > d.startIndex && p.endIndex <= d.endIndex)
    );
    if (!overlaps) {
      deduped.push(p);
    }
  }

  return deduped;
}

/**
 * Checks if a fact value is empty, null, undefined, or a placeholder string.
 */
export function isPlaceholderOrEmpty(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'object') {
    if (val.name !== undefined) return isPlaceholderOrEmpty(val.name);
    return Object.keys(val).length === 0;
  }
  if (typeof val !== 'string') return false;

  const s = val.trim();
  if (s.length === 0) return true;

  // Check against placeholder patterns
  if (/^\[.*\]$/.test(s)) return true;
  if (/^<.*>$/.test(s)) return true;
  if (/^\{.*\}$/.test(s)) return true;
  if (/^(?:tbd|n\/a|unknown|unspecified|placeholder|none|not\s+specified|insert\s+.*|specify\s+.*)$/i.test(s)) return true;
  if (/^_{3,}$/.test(s)) return true;

  // Check generic role names
  if (/^(?:disclosing\s*party|receiving\s*party|party\s*[ab]|company|client|contractor|service\s*provider)$/i.test(s)) return true;

  return false;
}

/**
 * Extracts a value from a structuredFacts dictionary using dot-path or aliases.
 */
export function extractFactValue(facts: Record<string, any>, aliases: string[]): any {
  if (!facts) return undefined;

  for (const alias of aliases) {
    if (alias.includes('.')) {
      const parts = alias.split('.');
      let cur: any = facts;
      let valid = true;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) {
          cur = cur[p];
        } else {
          valid = false;
          break;
        }
      }
      if (valid && !isPlaceholderOrEmpty(cur)) return cur;
    } else {
      if (alias in facts && !isPlaceholderOrEmpty(facts[alias])) {
        return facts[alias];
      }
    }
  }

  return undefined;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validates required and recommended fields, scans for unresolved placeholders,
 * and emits precise, actionable ValidationFindings.
 */
export function validateRequiredFields(
  documentType: string,
  facts: Record<string, any>,
  fullText: string,
  cleanText: string
): ValidationFinding[] {
  const issues: ValidationFinding[] = [];
  const upperType = (documentType || 'NDA').toUpperCase();

  // Select field definitions
  let fieldDefs: FieldDefinition[] = NDA_FIELDS;
  if (upperType === 'LEGAL_NOTICE' || /notice|demand/i.test(upperType)) {
    fieldDefs = NOTICE_FIELDS;
  } else if (/services|consulting|contractor|contract/i.test(upperType)) {
    fieldDefs = CONTRACT_FIELDS;
  }

  // 1. UNRESOLVED PLACEHOLDER DETECTION
  const placeholders = detectPlaceholders(fullText);
  placeholders.forEach((ph, idx) => {
    const located = locateTextInDocument(fullText, ph.rawText);
    const issueId = `det_placeholder_${idx}`;

    issues.push({
      id: issueId,
      issueId,
      type: 'UNRESOLVED_PLACEHOLDER',
      category: 'STRUCTURAL',
      severity: 'HIGH',
      section: located.location.sectionTitle || 'General',
      title: `Unresolved Placeholder: ${ph.rawText.slice(0, 40)}`,
      message: `Document contains unresolved placeholder '${ph.rawText}' which must be populated with authoritative legal terms prior to execution.`,
      description: `Document contains unresolved placeholder '${ph.rawText}' which must be populated with authoritative legal terms prior to execution.`,
      location: located.location,
      evidence: ph.lineSnippet || located.evidence,
      reason: 'Execution of agreements with unresolved bracketed fill-ins or blank placeholders renders essential terms indeterminate and legally defective.',
      suggestion: `Replace '${ph.rawText}' with authoritative contractual data or remove if not applicable.`,
      canAutoFix: false,
      mode: 'MANUAL',
      confidence: 0.96
    });
  });

  // 2. REQUIRED & RECOMMENDED FIELD PRESENCE CHECK
  for (const field of fieldDefs) {
    const factVal = extractFactValue(facts, field.aliases);
    const hasFact = factVal !== undefined && !isPlaceholderOrEmpty(factVal);

    // Check text for field presence
    let hasTextEvidence = false;
    if (field.textPatterns && field.textPatterns.length > 0) {
      for (const pattern of field.textPatterns) {
        if (pattern.test(cleanText)) {
          hasTextEvidence = true;
          break;
        }
      }
    }

    // For party names: verify actual substantive entity name appears in text
    if (hasFact && typeof factVal === 'string' && (field.key.includes('Party') || field.key.includes('Name'))) {
      const cleanVal = factVal.trim();
      if (cleanVal.length > 0 && !cleanText.toLowerCase().includes(cleanVal.toLowerCase())) {
        // Fact is provided but text doesn't contain it!
        // This is handled by party mismatch check in validation_engine.ts
        continue;
      }
    }

    // If neither fact nor text evidence exists:
    if (!hasFact && !hasTextEvidence) {
      const severity = field.requirement === 'REQUIRED' ? 'HIGH' : (field.requirement === 'RECOMMENDED' ? 'MEDIUM' : 'LOW');
      const type = field.requirement === 'REQUIRED' ? 'MISSING_REQUIRED_FIELD' : 'MISSING_RECOMMENDED_FIELD';
      const issueId = `det_missing_${field.key}`;

      const located = locateTextInDocument(fullText, field.label);

      issues.push({
        id: issueId,
        issueId,
        type,
        category: field.category,
        severity,
        section: field.label,
        title: `${field.requirement === 'REQUIRED' ? 'Missing Required Field' : 'Missing Recommended Field'}: ${field.label}`,
        message: `${field.label} is missing from both document structured facts and agreement text. ${field.description}`,
        description: `${field.label} is missing from both document structured facts and agreement text. ${field.description}`,
        location: located.location,
        evidence: `Missing: ${field.label}`,
        reason: field.missingReason,
        suggestion: field.suggestion,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.94
      });
    }
  }

  return issues;
}

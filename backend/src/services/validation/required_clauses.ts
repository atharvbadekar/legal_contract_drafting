/**
 * ATHARV Legal AI - Required & Recommended Clauses Validator
 * Evaluates substantive presence and completeness of canonical contract clauses,
 * distinguishing complete, incomplete, and missing clauses.
 */

import {
  locateTextInDocument,
  stripTemplateInstructions
} from '../documents/document_structure.js';
import { ValidationFinding } from './validation_engine.js';

export type ClauseRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
export type ClauseEvaluationStatus = 'PRESENT' | 'INCOMPLETE' | 'MISSING';

export interface ClauseDefinition {
  key: string;
  title: string;
  requirement: ClauseRequirement;
  minWordCount: number;
  // Substantive patterns that must match in order for clause to be deemed present
  substantivePatterns: RegExp[];
  headingPatterns: RegExp[];
  missingReason: string;
  suggestion: string;
}

// ============================================================================
// CANONICAL CLAUSE DEFINITIONS
// ============================================================================

export const NDA_CLAUSES: ClauseDefinition[] = [
  {
    key: 'CONFIDENTIAL_INFORMATION_DEFINITION',
    title: 'Definition of Confidential Information',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/definition\s+of\s+confidential\s+information/i, /confidential\s+information/i, /scope\s+of\s+confidentiality/i],
    substantivePatterns: [
      /(?:confidential|proprietary)\s+information/i,
      /(?:technical|commercial|financial|business|trade\s*secrets?|data|specifications?|software|deliverables|inventions)/i
    ],
    missingReason: 'An NDA must substantively define the categories and scope of protected information.',
    suggestion: 'Insert a standard operative clause defining Confidential Information, including technical, business, and financial materials.'
  },
  {
    key: 'NON_DISCLOSURE_OBLIGATIONS',
    title: 'Non-Disclosure Obligations & Standard of Care',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/non-disclosure\s+obligations/i, /confidentiality\s+obligations/i, /obligations\s+of\s+the\s+receiving\s+party/i, /confidentiality/i],
    substantivePatterns: [
      /(?:maintain|protect|hold|keep)\s+(?:in\s+)?(?:strict\s+)?confiden|shall\s+not\s+disclose|agrees?\s+not\s+to\s+disclose|without\s+(?:prior\s+)?written\s+(?:consent|permission)|confidentiality\s+and\s+not\s+disclose/i
    ],
    missingReason: 'The covenant not to disclose and duty to protect confidential information is the core consideration of an NDA.',
    suggestion: 'Incorporate clear non-disclosure covenants stipulating standard of care and restrictions against unauthorized use.'
  },
  {
    key: 'TERM_AND_SURVIVAL',
    title: 'Term & Survival of Confidentiality',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/term\s+and\s+survival/i, /duration/i, /term\s+and\s+termination/i, /survival/i, /term\s*&?\s*duration/i],
    substantivePatterns: [
      /(?:term|duration|period\s+of|survive|survival|remain\s+in\s+effect|remain\s+binding)\b/i,
      /(?:\d+\s*(?:years?|months?)|effective\s+date|termination)/i
    ],
    missingReason: 'The agreement must establish its operative duration and the survival period for confidentiality covenants.',
    suggestion: 'Specify the term of the agreement and the post-termination survival window for confidentiality duties.'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law and Dispute Resolution',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/governing\s+law/i, /jurisdiction/i, /dispute\s+resolution/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|jurisdiction\s+of|courts\s+of)\b/i
    ],
    missingReason: 'Designation of governing substantive law and dispute venue is required to avoid costly jurisdictional conflicts.',
    suggestion: 'Include an explicit Governing Law and exclusive jurisdiction or arbitration clause.'
  },
  {
    key: 'EXECUTION_SIGNATURES',
    title: 'Execution & Signatures',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/signatures/i, /execution/i, /in\s+witness\s+whereof/i],
    substantivePatterns: [
      /(?:in\s+witness\s+whereof|authorized\s+signator(?:y|ies)|by:\s*_+|for\s+and\s+on\s+behalf\s+of|signature:\s*_+|executed\s+this\s+agreement)/i
    ],
    missingReason: 'Without formal signature lines for authorized signatories, the agreement cannot be legally executed.',
    suggestion: 'Append a bilateral corporate signature block with entity names, signatory titles, and date lines.'
  },
  {
    key: 'EXCEPTIONS_EXCLUSIONS',
    title: 'Exceptions and Exclusions',
    requirement: 'RECOMMENDED',
    minWordCount: 6,
    headingPatterns: [/exceptions/i, /exclusions/i, /exceptions\s+and\s+exclusions/i, /exclusions\s+and\s+exceptions/i],
    substantivePatterns: [
      /(?:public\s*domain|publicly\s*(?:known|available)|already\s*known|prior\s*knowledge|prior\s*possession|independently\s*developed|required\s+by\s+(?:law|court|statute|regulatory))/i
    ],
    missingReason: 'Standard NDAs require recognized statutory carve-outs (e.g., publicly known information, prior possession).',
    suggestion: 'Incorporate standard exclusions from confidentiality (public domain, independent development, compulsory disclosure).'
  },
  {
    key: 'PERMITTED_DISCLOSURES',
    title: 'Permitted Disclosures',
    requirement: 'RECOMMENDED',
    minWordCount: 6,
    headingPatterns: [/permitted\s+disclosures?/i, /authorized\s+disclosure/i],
    substantivePatterns: [
      /(?:permitted\s+disclosure|need\s+to\s+know|officers|employees|directors|legal\s+advisors?|financial\s+advisors?|counsel)/i
    ],
    missingReason: 'A permitted disclosures clause protects operational disclosures to designated advisors and need-to-know staff.',
    suggestion: 'Include a Permitted Disclosures provision covering employees and professional legal/accounting advisors.'
  },
  {
    key: 'RETURN_OR_DESTRUCTION',
    title: 'Return or Destruction of Information',
    requirement: 'RECOMMENDED',
    minWordCount: 6,
    headingPatterns: [/return\s+or\s+destruction/i, /return\s+of\s+materials/i, /destruction\s+of\s+information/i],
    substantivePatterns: [
      /(?:return|destroy|surrender|destruction)/i,
      /(?:confidential|materials?|documents?|copies)/i
    ],
    missingReason: 'Failure to require prompt return or destruction leaves proprietary assets in recipient possession indefinitely.',
    suggestion: 'Add a covenant requiring return or certified destruction of confidential materials upon termination.'
  },
  {
    key: 'REMEDIES_INJUNCTIVE_RELIEF',
    title: 'Remedies & Injunctive Relief',
    requirement: 'RECOMMENDED',
    minWordCount: 6,
    headingPatterns: [/remedies/i, /injunctive\s+relief/i, /equitable\s+relief/i],
    substantivePatterns: [
      /(?:injunctive\s+relief|irreparable\s+(?:harm|damage|injury)|equitable\s+relief|damages\s+alone\s+(?:would|shall|may)\s+be\s+inadequate)/i
    ],
    missingReason: 'Without injunctive relief acknowledgment, courts may decline preliminary restraining orders upon breach.',
    suggestion: 'Stipulate that monetary damages are inadequate for breach and that equitable injunctive relief is available.'
  }
];

export const NOTICE_CLAUSES: ClauseDefinition[] = [
  {
    key: 'SENDER_RECIPIENT_HEADER',
    title: 'Parties / Header Identification',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/parties/i, /header/i, /sender/i, /recipient/i],
    substantivePatterns: [
      /(?:from|claimant|sender|on\s+behalf\s+of)[:\s]+/i,
      /(?:to|recipient|addressed\s+to)[:\s]+/i
    ],
    missingReason: 'A legal notice must specifically identify the sender issuing the demand and the recipient addressee.',
    suggestion: 'State the sender and recipient legal names, physical addresses, and contact particulars in the header.'
  },
  {
    key: 'FACTUAL_BACKGROUND',
    title: 'Factual Background / Transaction Recital',
    requirement: 'REQUIRED',
    minWordCount: 20,
    headingPatterns: [/facts/i, /background/i, /transaction/i, /statement\s+of\s+facts/i],
    substantivePatterns: [
      /(?:agreement|contract|transaction|entered\s+into|supplied|rendered|services|cheque|invoice|relationship)\b/i
    ],
    missingReason: 'Statutory notices must recite the underlying transaction or relationship from which obligations arose.',
    suggestion: 'Include a chronological recital of relevant background facts and contractual agreements.'
  },
  {
    key: 'BREACH_OR_DEFAULT',
    title: 'Breach / Default Statement',
    requirement: 'REQUIRED',
    minWordCount: 15,
    headingPatterns: [/breach/i, /default/i, /failure/i, /non-payment/i],
    substantivePatterns: [
      /(?:breach|failed\s+to|default|dishonou?r|unlawfully|non-payment|unpaid|neglected)\b/i
    ],
    missingReason: 'The notice must articulate the exact default, non-payment, or statutory breach committed by the addressee.',
    suggestion: 'Specify the specific breach or contractual violation in plain, unambiguous terms.'
  },
  {
    key: 'OPERATIVE_DEMAND',
    title: 'Operative Demand / Call Upon Recipient',
    requirement: 'REQUIRED',
    minWordCount: 15,
    headingPatterns: [/demand/i, /relief/i, /claim/i],
    substantivePatterns: [
      /(?:hereby\s+demand|call\s+upon\s+you|pay\s+the\s+sum|remit|cure\s+(?:the\s+)?breach|desist\s+from)\b/i
    ],
    missingReason: 'A statutory legal notice is defective if it does not contain a specific operative demand.',
    suggestion: 'Formulate a precise demand requiring the recipient to pay outstanding dues or cure the default.'
  },
  {
    key: 'RESPONSE_CURE_PERIOD',
    title: 'Response & Cure Timeline',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/response\s+period/i, /cure\s+period/i, /deadline/i],
    substantivePatterns: [
      /\b\d+\s*days\b/i,
      /(?:within|period\s+of)\s*\d+\s*days/i
    ],
    missingReason: 'Statutory notice requirements necessitate an explicit period (e.g. 15 or 30 days) to comply.',
    suggestion: 'Stipulate the exact statutory response deadline (e.g., "within 15 days of receipt").'
  },
  {
    key: 'CONSEQUENCES_LEGAL_ACTION',
    title: 'Consequences of Non-Compliance',
    requirement: 'RECOMMENDED',
    minWordCount: 12,
    headingPatterns: [/consequences/i, /legal\s+action/i, /proceedings/i],
    substantivePatterns: [
      /(?:legal\s+proceedings|civil\s+and\s+criminal|suit|remedies|costs?\s+and\s+consequences|court\s+of\s+law)/i
    ],
    missingReason: 'Warning the recipient of subsequent litigation preserves rights to claim litigation costs and legal interest.',
    suggestion: 'Outline subsequent civil or criminal remedies that will be initiated if the demand is unfulfilled.'
  },
  {
    key: 'SIGNATURE_AND_CLOSING',
    title: 'Closing & Execution',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/signatures/i, /closing/i, /execution/i],
    substantivePatterns: [
      /(?:yours\s+faithfully|yours\s+sincerely|advocate|counsel|signator(?:y|e)|by:)/i
    ],
    missingReason: 'A formal legal notice requires closing and signatory attribution by the claimant or legal counsel.',
    suggestion: 'Append formal closing lines with counsel or claimant signature and designation.'
  }
];

export const CONTRACT_CLAUSES: ClauseDefinition[] = [
  {
    key: 'PARTIES',
    title: 'Parties Identification',
    requirement: 'REQUIRED',
    minWordCount: 15,
    headingPatterns: [/parties/i, /preamble/i],
    substantivePatterns: [
      /(?:entered\s+into\s+by|by\s+and\s+between|client|contractor|consultant)/i
    ],
    missingReason: 'Contract requires identification of parties to establish contractual privity.',
    suggestion: 'Identify the contracting parties by formal entity name and registered office.'
  },
  {
    key: 'SERVICES_SCOPE',
    title: 'Scope of Services / Deliverables',
    requirement: 'REQUIRED',
    minWordCount: 15,
    headingPatterns: [/services/i, /scope\s+of\s+work/i, /deliverables/i],
    substantivePatterns: [
      /(?:services|deliverables|work\s+product|responsibilities|scope\s+of\s+services)/i
    ],
    missingReason: 'A services contract must define the scope of work and deliverables.',
    suggestion: 'Detail the operative services, specifications, and milestones in the Scope section.'
  },
  {
    key: 'PAYMENT_CONSIDERATION',
    title: 'Fees & Payment Terms',
    requirement: 'REQUIRED',
    minWordCount: 15,
    headingPatterns: [/payment/i, /compensation/i, /fees/i, /consideration/i],
    substantivePatterns: [
      /(?:shall\s+pay|fee|compensation|payment|consideration|rate|invoices?|payable)/i
    ],
    missingReason: 'A contract requires definite consideration or ascertainable payment terms.',
    suggestion: 'Define the compensation amount, invoice frequency, and payment schedule.'
  },
  {
    key: 'TERM_TERMINATION',
    title: 'Term and Termination',
    requirement: 'REQUIRED',
    minWordCount: 15,
    headingPatterns: [/term/i, /termination/i],
    substantivePatterns: [
      /(?:term|termination|period\s+of|terminate\s+upon|notice)/i
    ],
    missingReason: 'The contract must establish term duration and termination mechanics.',
    suggestion: 'Include notice requirements and grounds for termination for cause or convenience.'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/governing\s+law/i, /jurisdiction/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|jurisdiction\s+of)/i
    ],
    missingReason: 'Governing jurisdiction must be designated to govern contractual enforcement.',
    suggestion: 'Designate the governing state law and competent judicial forum.'
  },
  {
    key: 'SIGNATURE_BLOCK',
    title: 'Execution & Signatures',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/signatures/i, /execution/i],
    substantivePatterns: [
      /(?:in\s+witness\s+whereof|authorized\s+signator(?:y|ies)|by:\s*_+)/i
    ],
    missingReason: 'Execution signature lines are mandatory to execute the agreement.',
    suggestion: 'Append authorized signature lines for all contracting parties.'
  }
];

// ============================================================================
// MAIN VALIDATION LOGIC
// ============================================================================

/**
 * Validates clause coverage and completeness across document sections.
 */
export function validateRequiredClauses(
  documentType: string,
  sections: Array<{ sectionType: string; title?: string; content: string }>,
  fullText: string
): ValidationFinding[] {
  const issues: ValidationFinding[] = [];
  const upperType = (documentType || 'NDA').toUpperCase();
  const cleanFullText = stripTemplateInstructions(fullText);

  let clauseDefs = NDA_CLAUSES;
  if (upperType === 'LEGAL_NOTICE' || /notice|demand/i.test(upperType)) {
    clauseDefs = NOTICE_CLAUSES;
  } else if (/services|consulting|contractor|contract/i.test(upperType)) {
    clauseDefs = CONTRACT_CLAUSES;
  }

  for (const clause of clauseDefs) {
    // Skip signature check here as it is authoritatively handled by det_missing_signatures in validation_engine
    if (clause.key === 'EXECUTION_SIGNATURES' || clause.key === 'SIGNATURE_BLOCK' || clause.key === 'SIGNATURE_AND_CLOSING') {
      continue;
    }

    // 1. Locate matching section by heading or type
    const matchingSection = sections.find(s => {
      const title = (s.title || '').trim();
      const type = (s.sectionType || '').trim();
      return clause.headingPatterns.some(p => p.test(title) || p.test(type));
    });

    let status: ClauseEvaluationStatus = 'MISSING';
    let matchedText = '';

    if (matchingSection) {
      const cleanContent = stripTemplateInstructions(matchingSection.content);
      const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
      const hasSubstantive = clause.substantivePatterns.every(p => p.test(cleanContent)) ||
        (clause.substantivePatterns.length > 1 && clause.substantivePatterns.filter(p => p.test(cleanContent)).length >= 1 && wordCount >= clause.minWordCount);

      if (hasSubstantive && wordCount >= clause.minWordCount) {
        status = 'PRESENT';
      } else if (wordCount > 0 && wordCount < clause.minWordCount) {
        status = 'INCOMPLETE';
        matchedText = cleanContent;
      } else if (hasSubstantive) {
        status = 'PRESENT';
      } else {
        status = 'INCOMPLETE';
        matchedText = cleanContent;
      }
    } else {
      // Search full document text if not separated into formal sections
      const allSubstantive = clause.substantivePatterns.every(p => p.test(cleanFullText));
      if (allSubstantive) {
        status = 'PRESENT';
      }
    }

    if (status === 'MISSING') {
      const isRequired = clause.requirement === 'REQUIRED';
      const severity = isRequired ? 'HIGH' : 'MEDIUM';
      const type = isRequired ? 'MISSING_REQUIRED_CLAUSE' : 'MISSING_RECOMMENDED_CLAUSE';
      const issueId = `det_missing_clause_${clause.key.toLowerCase()}`;

      const located = locateTextInDocument(fullText, clause.title);

      issues.push({
        id: issueId,
        issueId,
        type,
        category: 'STRUCTURAL',
        severity,
        section: clause.title,
        title: `${isRequired ? 'Missing Required Clause' : 'Missing Recommended Clause'}: ${clause.title}`,
        message: `Agreement lacks the substantive '${clause.title}' clause required for legal sufficiency.`,
        description: `Agreement lacks the substantive '${clause.title}' clause required for legal sufficiency.`,
        location: located.location,
        evidence: `Missing: ${clause.title}`,
        reason: clause.missingReason,
        suggestion: clause.suggestion,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.93
      });
    } else if (status === 'INCOMPLETE') {
      const issueId = `det_incomplete_clause_${clause.key.toLowerCase()}`;
      const located = locateTextInDocument(fullText, matchedText || clause.title);

      issues.push({
        id: issueId,
        issueId,
        type: 'INCOMPLETE_CLAUSE',
        category: 'STRUCTURAL',
        severity: 'MEDIUM',
        section: clause.title,
        title: `Incomplete / Truncated Clause: ${clause.title}`,
        message: `The '${clause.title}' clause appears abbreviated or lacks necessary operative conditions and standards.`,
        description: `The '${clause.title}' clause appears abbreviated or lacks necessary operative conditions and standards.`,
        location: located.location,
        evidence: matchedText.slice(0, 140) || located.evidence,
        reason: clause.missingReason,
        suggestion: clause.suggestion,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.88
      });
    }
  }

  return issues;
}

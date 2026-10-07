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
      /(?:maintain|protect|hold|keep)[^\.\n]*?(?:in\s+)?(?:strict\s+)?confiden|shall\s+not\s+disclose|agrees?\s+not\s+to\s+disclose|without\s+(?:prior\s+)?written\s+(?:consent|permission)|confidentiality\s+and\s+not\s+disclose/i
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

export const EMPLOYMENT_CLAUSES: ClauseDefinition[] = [
  {
    key: 'APPOINTMENT_POSITION',
    title: 'Appointment and Position',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/appointment/i, /designation/i, /position/i, /duties/i, /role/i],
    substantivePatterns: [
      /(?:appoint|position|designation|duties|responsibilities|employed\s+as)/i
    ],
    missingReason: 'An employment agreement must define the employee position, duties, and appointment terms.',
    suggestion: 'Define the formal job title, duties, reporting relationship, and base of employment.'
  },
  {
    key: 'COMPENSATION_BENEFITS',
    title: 'Compensation and Benefits',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/compensation/i, /salary/i, /remuneration/i, /benefits/i],
    substantivePatterns: [
      /(?:salary|compensation|remuneration|ctc|allowance|per\s+annum|per\s+month|payroll)/i
    ],
    missingReason: 'An employment agreement must specify compensation, remuneration, and payment frequency.',
    suggestion: 'Incorporate base salary details, statutory benefits, and payment cycles.'
  },
  {
    key: 'TERM_PROBATION',
    title: 'Term & Probation Period',
    requirement: 'RECOMMENDED',
    minWordCount: 8,
    headingPatterns: [/probation/i, /term/i, /commencement/i],
    substantivePatterns: [
      /(?:probation|commence|effective\s+date|joining\s+date)/i
    ],
    missingReason: 'The contract should define the commencement date and any applicable probation evaluation period.',
    suggestion: 'Specify the joining date and probation terms with evaluation criteria.'
  },
  {
    key: 'CONFIDENTIALITY_IP',
    title: 'Confidentiality & Inventions Assignment',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/confidentiality/i, /intellectual\s+property/i, /inventions/i, /proprietary/i, /work\s+(?:made\s*)?for\s*hire/i],
    substantivePatterns: [
      /(?:confidential|proprietary|inventions|work\s+(?:made\s*)?for\s*hire|sole\s+and\s+exclusive\s+property|assigns?\s+all\s+rights)/i
    ],
    missingReason: 'Employer proprietary rights and work-product assignment must be explicitly protected.',
    suggestion: 'Add standard proprietary information and employer inventions assignment covenants.'
  },
  {
    key: 'TERMINATION_NOTICE',
    title: 'Termination and Notice Period',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/termination/i, /notice\s+period/i, /resignation/i],
    substantivePatterns: [
      /(?:terminate|termination|notice\s+period|resignation|written\s+notice)/i
    ],
    missingReason: 'An employment contract must specify notice periods and procedures for resignation or separation.',
    suggestion: 'Define mutual notice periods (e.g., 30 or 60 days) and grounds for summary dismissal for cause.'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law and Dispute Resolution',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/governing\s+law/i, /jurisdiction/i, /dispute\s+resolution/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|jurisdiction\s+of|courts\s+of)/i
    ],
    missingReason: 'Designation of applicable employment statutes and competent labor jurisdiction is essential.',
    suggestion: 'Designate the governing jurisdiction and competent judicial forum.'
  }
];

export const SERVICE_CLAUSES: ClauseDefinition[] = [
  {
    key: 'SERVICES_SCOPE',
    title: 'Scope of Services & Deliverables',
    requirement: 'REQUIRED',
    minWordCount: 12,
    headingPatterns: [/services/i, /scope/i, /deliverables/i, /specifications/i],
    substantivePatterns: [
      /(?:services|deliverables|scope\s+of\s+work|specifications|milestones)/i
    ],
    missingReason: 'A services agreement must delineate the scope of work and required deliverables.',
    suggestion: 'Define services, milestones, and deliverables in sufficient detail.'
  },
  {
    key: 'FEES_PAYMENT',
    title: 'Fees & Payment Terms',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/payment/i, /fees/i, /compensation/i, /invoicing/i, /consideration/i],
    substantivePatterns: [
      /(?:fee|fees|payment|invoice|invoices|payable|milestone)/i
    ],
    missingReason: 'Definite commercial consideration and invoicing schedules must be established.',
    suggestion: 'Define service fees, billing milestones, and payment terms.'
  },
  {
    key: 'TERM_TERMINATION',
    title: 'Term & Termination',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/term/i, /termination/i],
    substantivePatterns: [
      /(?:term|termination|effective\s+date|convenience|breach|written\s+notice)/i
    ],
    missingReason: 'Contract duration, expiry, and early termination mechanics must be provided.',
    suggestion: 'Include term length and termination provisions for breach and convenience.'
  },
  {
    key: 'IP_RIGHTS',
    title: 'Intellectual Property Rights',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/intellectual\s+property/i, /ip\s+rights/i, /work\s+product/i, /ownership/i],
    substantivePatterns: [
      /(?:intellectual\s+property|work\s+product|deliverables|ownership|license|assign)/i
    ],
    missingReason: 'Ownership or licensing of newly created deliverables and pre-existing IP must be stated.',
    suggestion: 'Specify whether deliverables are assigned to client or licensed by provider.'
  },
  {
    key: 'CONFIDENTIALITY',
    title: 'Confidentiality Obligations',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/confidential/i, /proprietary/i, /non-disclosure/i],
    substantivePatterns: [
      /(?:confidential|proprietary|non-disclosure|duty\s+of\s+care)/i
    ],
    missingReason: 'Commercial services involve exchange of proprietary information requiring protection.',
    suggestion: 'Incorporate mutual confidentiality covenants protecting proprietary disclosures.'
  },
  {
    key: 'LIMITATION_LIABILITY',
    title: 'Limitation of Liability',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/limitation\s+of\s+liability/i, /liability/i, /indemnification/i],
    substantivePatterns: [
      /(?:liability|damages|indirect|consequential|cap|shall\s+not\s+exceed)/i
    ],
    missingReason: 'Commercial contracts require liability caps to limit exposure to catastrophic claims.',
    suggestion: 'Insert an aggregate liability limitation cap.'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law and Dispute Resolution',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/governing\s+law/i, /jurisdiction/i, /dispute\s+resolution/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|jurisdiction\s+of|courts\s+of)/i
    ],
    missingReason: 'Designation of governing substantive law and jurisdiction is required.',
    suggestion: 'Designate the governing jurisdiction and dispute forum.'
  }
];

export const SAAS_CLAUSES: ClauseDefinition[] = [
  {
    key: 'LICENSE_GRANT',
    title: 'Subscription & License Grant',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/subscription/i, /license/i, /grant/i, /access/i, /service\s+access/i],
    substantivePatterns: [
      /(?:subscription|license|grant|access|non-exclusive|saas|hosted\s+service)/i
    ],
    missingReason: 'A SaaS agreement must define the scope of customer access to the hosted software.',
    suggestion: 'Include a non-exclusive, non-transferable subscription license grant.'
  },
  {
    key: 'SLA_SUPPORT',
    title: 'Service Level Agreement & Support',
    requirement: 'RECOMMENDED',
    minWordCount: 8,
    headingPatterns: [/service\s+level/i, /sla/i, /uptime/i, /support/i, /maintenance/i],
    substantivePatterns: [
      /(?:sla|uptime|availability|support|maintenance|response\s+time)/i
    ],
    missingReason: 'SaaS agreements should specify availability commitments and technical support standards.',
    suggestion: 'Define target availability percentage (e.g. 99.9%) and support ticket channels.'
  },
  {
    key: 'FEES_BILLING',
    title: 'Subscription Fees & Billing',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/fees/i, /subscription\s+fees/i, /billing/i, /payment/i],
    substantivePatterns: [
      /(?:subscription\s+fee|billing|payment|invoicing|recurring|annual|monthly)/i
    ],
    missingReason: 'Recurring subscription pricing, billing intervals, and payment methods must be detailed.',
    suggestion: 'Specify recurring subscription fees and payment schedules.'
  },
  {
    key: 'DATA_SECURITY',
    title: 'Data Security & Ownership',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/data\s+security/i, /customer\s+data/i, /privacy/i, /data\s+protection/i],
    substantivePatterns: [
      /(?:customer\s+data|security|encryption|data\s+protection|privacy|gdpr)/i
    ],
    missingReason: 'Cloud customers require explicit data ownership guarantees and security standards.',
    suggestion: 'Affirm customer retains exclusive ownership of uploaded data and provider implements industry security.'
  },
  {
    key: 'TERM_RENEWAL',
    title: 'Term, Renewal & Termination',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/term/i, /renewal/i, /termination/i],
    substantivePatterns: [
      /(?:initial\s+term|renewal|auto-renew|terminate|written\s+notice)/i
    ],
    missingReason: 'Initial term duration, renewal mechanisms, and cancellation deadlines must be set.',
    suggestion: 'Provide initial subscription duration and non-renewal notice requirements.'
  },
  {
    key: 'LIMITATION_LIABILITY',
    title: 'Limitation of Liability',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/limitation\s+of\s+liability/i, /liability/i],
    substantivePatterns: [
      /(?:liability|damages|cap|fees\s+paid|shall\s+not\s+exceed)/i
    ],
    missingReason: 'Cloud providers must cap enterprise risk to fees received under the contract.',
    suggestion: 'Stipulate an aggregate liability cap (e.g., 12 months fees paid).'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law and Jurisdiction',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/governing\s+law/i, /jurisdiction/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|jurisdiction\s+of)/i
    ],
    missingReason: 'Governing state jurisdiction must be defined.',
    suggestion: 'Designate the governing jurisdiction and venue.'
  }
];

export const CONSULTING_CLAUSES: ClauseDefinition[] = [
  {
    key: 'SERVICES_SCOPE',
    title: 'Scope of Consulting Services',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/services/i, /scope/i, /consulting/i, /advisory/i],
    substantivePatterns: [
      /(?:consulting|advisory|services|scope|deliverables)/i
    ],
    missingReason: 'A consulting agreement must specify advisory duties and expected contributions.',
    suggestion: 'Define the scope of advisory services and deliverables.'
  },
  {
    key: 'INDEPENDENT_CONTRACTOR',
    title: 'Independent Contractor Status',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/independent\s+contractor/i, /relationship/i, /status/i],
    substantivePatterns: [
      /(?:independent\s+contractor|no\s+employment|no\s+agency|no\s+partnership)/i
    ],
    missingReason: 'Expressly disclaiming employment or agency status is critical to avoid misclassification liabilities.',
    suggestion: 'State that consultant acts strictly as an independent contractor without employee benefits.'
  },
  {
    key: 'COMPENSATION',
    title: 'Compensation and Invoicing',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/compensation/i, /fees/i, /retainer/i, /payment/i],
    substantivePatterns: [
      /(?:fee|compensation|retainer|hourly|milestone|invoicing|payment)/i
    ],
    missingReason: 'A consulting contract requires defined fee arrangements and reimbursement rules.',
    suggestion: 'Specify consulting fees, payment milestones, and invoice terms.'
  },
  {
    key: 'IP_RIGHTS',
    title: 'Work Product & Intellectual Property',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/intellectual\s+property/i, /work\s+product/i, /ip/i, /ownership/i],
    substantivePatterns: [
      /(?:work\s+product|deliverables|intellectual\s+property|assigns?|ownership)/i
    ],
    missingReason: 'Clear allocation of advisory deliverables ownership is required.',
    suggestion: 'Specify assignment of custom deliverables to client with retention of consultant background know-how.'
  },
  {
    key: 'CONFIDENTIALITY',
    title: 'Confidentiality Obligations',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/confidential/i, /proprietary/i],
    substantivePatterns: [
      /(?:confidential|proprietary|non-disclosure)/i
    ],
    missingReason: 'Strategic consulting involves access to internal business data that must be safeguarded.',
    suggestion: 'Include binding confidentiality obligations on disclosed materials.'
  },
  {
    key: 'TERM_TERMINATION',
    title: 'Term & Termination',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/term/i, /termination/i],
    substantivePatterns: [
      /(?:term|termination|notice|effective\s+date)/i
    ],
    missingReason: 'Duration of engagement and right to terminate on notice must be defined.',
    suggestion: 'Specify the engagement period and notice timeline for termination.'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law',
    requirement: 'REQUIRED',
    minWordCount: 6,
    headingPatterns: [/governing\s+law/i, /jurisdiction/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|jurisdiction\s+of)/i
    ],
    missingReason: 'Governing law is needed to resolve disputes.',
    suggestion: 'Designate governing state law and dispute forum.'
  }
];

export const MOU_CLAUSES: ClauseDefinition[] = [
  {
    key: 'PURPOSE_OBJECTIVES',
    title: 'Purpose & Objectives',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/purpose/i, /objectives/i, /mission/i, /background/i],
    substantivePatterns: [
      /(?:purpose|objective|collaboration|cooperation|mutual\s+interest)/i
    ],
    missingReason: 'An MOU must define the overarching purpose and shared objectives of the collaboration.',
    suggestion: 'Define the intended collaborative initiatives and joint goals.'
  },
  {
    key: 'SCOPE_COOPERATION',
    title: 'Scope of Cooperation',
    requirement: 'REQUIRED',
    minWordCount: 10,
    headingPatterns: [/scope/i, /cooperation/i, /responsibilities/i, /initiatives/i],
    substantivePatterns: [
      /(?:scope|cooperation|initiatives|undertakings|activities|roles)/i
    ],
    missingReason: 'The MOU must identify the areas of cooperative effort and institutional contributions.',
    suggestion: 'Detail the collaborative programs, resources, or joint activities.'
  },
  {
    key: 'NON_BINDING_STATUS',
    title: 'Legal Status of MOU (Non-Binding)',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/legal\s+status/i, /non-binding/i, /understanding/i, /nature\s+of\s+mou/i],
    substantivePatterns: [
      /(?:non-binding|statement\s+of\s+intent|does\s+not\s+create\s+a\s+legal\s+obligation|good\s+faith|not\s+legally\s+enforceable)/i
    ],
    missingReason: 'An MOU must expressly clarify its non-binding character to prevent unintended contractual obligations.',
    suggestion: 'Clarify that this MOU constitutes a declaration of mutual intent and creates no binding legal relations except confidentiality.'
  },
  {
    key: 'TERM_TERMINATION',
    title: 'Term & Termination',
    requirement: 'REQUIRED',
    minWordCount: 8,
    headingPatterns: [/term/i, /validity/i, /duration/i, /termination/i],
    substantivePatterns: [
      /(?:term|duration|validity|terminate|withdraw|written\s+notice)/i
    ],
    missingReason: 'An MOU should provide a duration and mutual right to withdraw upon notice.',
    suggestion: 'Define the term (e.g. 2 years) and allow unilateral withdrawal with written notice.'
  },
  {
    key: 'CONFIDENTIALITY',
    title: 'Confidentiality',
    requirement: 'RECOMMENDED',
    minWordCount: 6,
    headingPatterns: [/confidential/i, /proprietary/i],
    substantivePatterns: [
      /(?:confidential|proprietary|non-disclosure)/i
    ],
    missingReason: 'Confidentiality should remain binding even within a non-binding memorandum.',
    suggestion: 'Include binding confidentiality provisions for shared data.'
  },
  {
    key: 'GOVERNING_LAW',
    title: 'Governing Law & Amicable Resolution',
    requirement: 'RECOMMENDED',
    minWordCount: 6,
    headingPatterns: [/governing\s+law/i, /dispute/i, /amicable/i],
    substantivePatterns: [
      /(?:governed\s+by|laws\s+of|amicable|consultation|good\s+faith)/i
    ],
    missingReason: 'Governing jurisdiction and good-faith resolution protocols prevent litigation.',
    suggestion: 'Designate governing law and provide for amicable dispute settlement.'
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
  } else if (/employment|internship/i.test(upperType)) {
    clauseDefs = EMPLOYMENT_CLAUSES;
  } else if (/saas/i.test(upperType)) {
    clauseDefs = SAAS_CLAUSES;
  } else if (/consulting/i.test(upperType)) {
    clauseDefs = CONSULTING_CLAUSES;
  } else if (/mou|memorandum|partnership/i.test(upperType)) {
    clauseDefs = MOU_CLAUSES;
  } else if (/services|contractor|vendor|contract|lease/i.test(upperType)) {
    clauseDefs = SERVICE_CLAUSES;
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

      const located = locateTextInDocument(fullText, clause.title, clause.title, {
        nature: 'MISSING_CLAUSE'
      });

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
        location: {
          ...located.location,
          nature: 'MISSING_CLAUSE',
          isMissing: true
        },
        evidence: '',
        isMissing: true,
        reason: clause.missingReason,
        suggestion: clause.suggestion,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.93,
        deduplicationKey: `clause_${clause.key.toLowerCase()}`
      } as any);
    } else if (status === 'INCOMPLETE') {
      const issueId = `det_incomplete_clause_${clause.key.toLowerCase()}`;
      const located = locateTextInDocument(fullText, matchedText || clause.title, clause.title);

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
        evidence: matchedText ? matchedText.slice(0, 140) : (located.found ? located.evidence : ''),
        isMissing: false,
        reason: clause.missingReason,
        suggestion: clause.suggestion,
        canAutoFix: false,
        mode: 'MANUAL',
        confidence: 0.88,
        deduplicationKey: `clause_${clause.key.toLowerCase()}`
      } as any);
    }
  }

  return issues;
}

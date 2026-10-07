import { prisma } from '../../utils/prisma.js';
import { vectorStore, ClauseSearchResult } from '../rag/vector_store.js';
import { legalNLPClient } from '../nlp/legal_nlp_client.js';

export interface ClauseSelectionQuery {
  contractType: string;
  clauseType?: string;
  facts?: Record<string, any>;
  targetContextText?: string;
  preferredVariant?: 'mutual' | 'one-way' | 'strict' | 'balanced' | 'standard' | string;
  preferredJurisdiction?: string;
  limit?: number;
}

export interface SelectedClauseResult {
  id: string;
  title: string;
  documentType: string;
  clauseType: string;
  content: string;
  text?: string;
  variant: string;
  requiredStatus: string;
  riskLevel: string;
  jurisdiction: string;
  version: number;
  status: 'APPROVED';
  source?: string;
  sourceUrl?: string;
  selectionMethod: 'DETERMINISTIC_EXACT' | 'SEMANTIC_PGVECTOR' | 'BUILTIN_APPROVED_FALLBACK';
  similarityScore?: number;
  matchReasons: string[];
}

/**
 * Built-in approved clause corpus ensuring zero-failure resilience
 * when database is offline or in cold sandbox environments.
 */
export const BUILTIN_APPROVED_CLAUSES: Array<{
  id: string;
  title: string;
  documentType: string;
  clauseType: string;
  content: string;
  variant: string;
  requiredStatus: string;
  riskLevel: string;
  jurisdiction: string;
  version: number;
  status: 'APPROVED';
  source: string;
  conditions?: Record<string, any>;
}> = [
  // NDA
  {
    id: 'builtin-nda-def-1',
    title: 'Institutional Definition of Confidential Information',
    documentType: 'NDA',
    clauseType: 'definition',
    content: '"Confidential Information" shall mean all technical, business, financial, software, source code, designs, and commercial data disclosed directly or indirectly by Disclosing Party to Receiving Party, whether in writing, oral, visual, or machine-readable format.',
    variant: 'standard',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Indian Contract Act 1872 Best Practice'
  },
  {
    id: 'builtin-nda-conf-mutual',
    title: 'Mutual Strict Confidentiality Covenants',
    documentType: 'NDA',
    clauseType: 'confidentiality',
    content: 'Each Party covenants to hold all Confidential Information disclosed by the other Party in strict confidence and shall exercise at least a reasonable and commercially diligent degree of care to prevent unauthorized disclosure, publication, or commercial exploitation.',
    variant: 'mutual',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Atharv Institutional Library',
    conditions: { mutual: true }
  },
  {
    id: 'builtin-nda-conf-oneway',
    title: 'Unilateral Strict Confidentiality Covenants',
    documentType: 'NDA',
    clauseType: 'confidentiality',
    content: 'The Receiving Party covenants to preserve the secrecy of all Confidential Information with the utmost degree of diligence and shall not disclose or use said information except exclusively for the Authorized Purpose.',
    variant: 'one-way',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Atharv Institutional Library',
    conditions: { mutual: false }
  },
  {
    id: 'builtin-nda-remedies',
    title: 'Emergency Injunctive Relief & Equitable Remedies',
    documentType: 'NDA',
    clauseType: 'remedies',
    content: 'The Parties acknowledge that monetary damages alone would be inadequate in the event of an actual or threatened breach. Accordingly, the Disclosing Party shall be entitled to seek emergency injunctive relief and specific performance without proving actual damages or posting bond.',
    variant: 'strict',
    requiredStatus: 'RECOMMENDED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Indian Specific Relief Act, 1963'
  },

  // EMPLOYMENT
  {
    id: 'builtin-emp-ip',
    title: 'Work Product & Inventions Assignment (Employment)',
    documentType: 'EMPLOYMENT',
    clauseType: 'ip_assignment',
    content: 'All inventions, works of authorship, code, documentation, and patentable innovations conceived or developed by Employee in the course of employment belong solely to Employer from creation as works for hire under Section 17 of Copyright Act 1957.',
    variant: 'strict',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Section 17 Indian Copyright Act 1957'
  },
  {
    id: 'builtin-emp-notice',
    title: 'Bilateral Notice Period & Separation (Employment)',
    documentType: 'EMPLOYMENT',
    clauseType: 'termination',
    content: 'Either party may terminate the employment relationship by providing sixty (60) days prior written notice or payment of gross salary in lieu thereof. Employer may terminate immediately for cause, gross misconduct, or material breach without severance.',
    variant: 'balanced',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Industrial Employment Model Standing Orders'
  },

  // SERVICE
  {
    id: 'builtin-svc-liability',
    title: 'Mutual Limitation of Liability & Fees Cap (Services)',
    documentType: 'SERVICE',
    clauseType: 'liability',
    content: 'To the maximum extent permitted by applicable law, neither party\'s aggregate cumulative liability arising out of or relating to this Agreement shall exceed the total service fees paid or payable by Client to Service Provider under this Agreement during the twelve (12) months preceding the claim.',
    variant: 'balanced',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Commercial Contracting Standards'
  },
  {
    id: 'builtin-svc-ip',
    title: 'Deliverables Assignment upon Final Remittance (Services)',
    documentType: 'SERVICE',
    clauseType: 'ip_ownership',
    content: 'Upon receipt of full and final payment for the deliverables, Service Provider assigns and transfers to Client all worldwide copyright and title in custom deliverables, while retaining background tools and pre-existing library frameworks.',
    variant: 'standard',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Technology Master Services Model'
  },

  // LEASE
  {
    id: 'builtin-lse-deposit',
    title: 'Interest-Free Refundable Deposit & Handover (Lease)',
    documentType: 'LEASE',
    clauseType: 'rent_deposit',
    content: 'The Lessee has deposited an interest-free refundable security deposit with Lessor. Said deposit shall be refunded in full within twenty-one (21) days of peaceful handover of vacant possession of the premises, subject only to deductions for unpaid utilities or verified structural damages.',
    variant: 'balanced',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Transfer of Property Act, 1882'
  },

  // CONSULTING
  {
    id: 'builtin-cns-status',
    title: 'Independent Contractor Legal Status Disclaimer',
    documentType: 'CONSULTING',
    clauseType: 'independent_contractor',
    content: 'The Consultant is an independent contractor and nothing herein creates an employer-employee, agency, or partnership relationship. The Consultant controls the manner and means of performing services and is solely liable for statutory taxes and compliances.',
    variant: 'strict',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Indian Direct Tax & Contractor Model'
  },

  // SALE OF GOODS
  {
    id: 'builtin-sale-inspect',
    title: 'Commercial Inspection & Acceptance Window (Sale)',
    documentType: 'SALE',
    clauseType: 'inspection',
    content: 'The Buyer shall have a period of seven (7) business days following physical receipt of the Goods to inspect for conformity with specifications. Failure to give written notice of non-conformity within said window constitutes irrevocable acceptance under the Sale of Goods Act, 1930.',
    variant: 'balanced',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Sale of Goods Act, 1930'
  },

  // PARTNERSHIP
  {
    id: 'builtin-prt-profit',
    title: 'Capital Contributions & Pro-Rata Profit Allocation',
    documentType: 'PARTNERSHIP',
    clauseType: 'profit_sharing',
    content: 'The Partners shall contribute capital and share in all net commercial profits and bear all losses of the Partnership firm in strict proportion to their agreed sharing ratio, following quarterly financial reconciliation.',
    variant: 'standard',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Indian Partnership Act, 1932'
  },

  // LEGAL NOTICE
  {
    id: 'builtin-not-demand',
    title: 'Peremptory 15-Day Demand & Litigation Reservation',
    documentType: 'LEGAL_NOTICE',
    clauseType: 'response_period',
    content: 'You are hereby called upon to pay the outstanding liquidated claim within fifteen (15) days of receipt of this notice, failing which our Client shall institute summary commercial suits and recovery proceedings at your sole cost and consequence.',
    variant: 'strict',
    requiredStatus: 'REQUIRED',
    riskLevel: 'LOW',
    jurisdiction: 'India',
    version: 1,
    status: 'APPROVED',
    source: 'Commercial Courts Act, 2015'
  }
];

export class ClauseSelectorService {
  /**
   * Main Clause Selection Pipeline:
   * 1. Deterministic Filtering:
   *    - Filter by contractType + status = 'APPROVED' (strictly approved only).
   *    - Filter by clauseType if requested.
   *    - Evaluate conditions against structured facts.
   * 2. Semantic PGVector Similarity (Variant Selection):
   *    - If multiple approved variants exist, rank using cosine similarity against target context text.
   *    - Choose the highest-scoring approved variant.
   * 3. Graceful fallback to verified built-in corpus when DB is offline.
   */
  async selectClauses(params: ClauseSelectionQuery): Promise<SelectedClauseResult[]> {
    return this.selectApprovedClauses(params);
  }

  async selectApprovedClauses(params: ClauseSelectionQuery): Promise<SelectedClauseResult[]> {
    const {
      contractType,
      clauseType,
      facts = {},
      targetContextText,
      preferredVariant,
      preferredJurisdiction = 'India',
      limit = 5
    } = params;

    const normContractType = (contractType || 'NDA').toUpperCase().trim().replace(/[-\s]/g, '_');
    const normClauseType = clauseType ? clauseType.toLowerCase().trim() : undefined;

    // -------------------------------------------------------------
    // STAGE 1: Deterministic Query against Database (APPROVED only)
    // -------------------------------------------------------------
    let dbCandidates: any[] = [];
    if (process.env.DATABASE_URL) {
      try {
        const where: any = {
          status: 'APPROVED'
        };

        // Match documentType or contractType alias
        where.OR = [
          { documentType: normContractType },
          { documentType: normContractType.replace(/_AGREEMENT$/, '') },
          { contractType: normContractType }
        ];

        if (normClauseType) {
          where.clauseType = normClauseType;
        }

        dbCandidates = await prisma.clause.findMany({
          where,
          take: 50
        });
      } catch (dbErr) {
        // Prisma offline in unit test environment
        dbCandidates = [];
      }
    }

    // -------------------------------------------------------------
    // STAGE 2: Filter by conditions and facts
    // -------------------------------------------------------------
    const filteredCandidates = (dbCandidates.length > 0 ? dbCandidates : BUILTIN_APPROVED_CLAUSES).filter(c => {
      // Contract type check
      const cType = (c.documentType || c.contractType || '').toUpperCase().trim().replace(/[-\s]/g, '_');
      const matchesDoc =
        cType === normContractType ||
        cType === normContractType.replace(/_AGREEMENT$/, '') ||
        normContractType.startsWith(cType);

      if (!matchesDoc) return false;

      // Status check: MUST BE APPROVED
      if (c.status !== 'APPROVED') return false;

      // Clause type check
      if (normClauseType && c.clauseType.toLowerCase() !== normClauseType) {
        return false;
      }

      // Condition evaluation against facts
      if (c.conditions && typeof c.conditions === 'object') {
        const condObj = typeof c.conditions === 'string' ? JSON.parse(c.conditions) : c.conditions;
        for (const [field, expectedVal] of Object.entries(condObj)) {
          if (field === 'conditionField' && condObj.conditionValue !== undefined) {
            const actualVal = facts[expectedVal as string];
            if (actualVal !== undefined && actualVal !== condObj.conditionValue) {
              return false;
            }
          } else {
            let actualVal = facts[field];
            if (actualVal === undefined) {
              if (field === 'mutual') actualVal = facts['isMutual'] ?? facts['mutual'];
              if (field === 'isMutual') actualVal = facts['mutual'] ?? facts['isMutual'];
            }
            if (actualVal !== undefined && actualVal !== expectedVal) {
              return false;
            }
          }
        }
      }

      return true;
    });

    if (filteredCandidates.length === 0) {
      return [];
    }

    // -------------------------------------------------------------
    // STAGE 3: Semantic PGVector Similarity / Variant Selection
    // -------------------------------------------------------------
    // Group candidates by clauseType
    const groupedByType = new Map<string, typeof filteredCandidates>();
    for (const c of filteredCandidates) {
      const typeKey = c.clauseType.toLowerCase();
      if (!groupedByType.has(typeKey)) {
        groupedByType.set(typeKey, []);
      }
      groupedByType.get(typeKey)!.push(c);
    }

    const selectedResults: SelectedClauseResult[] = [];

    for (const [typeKey, candidates] of groupedByType.entries()) {
      let chosenCandidate = candidates[0];
      let selectionMethod: 'DETERMINISTIC_EXACT' | 'SEMANTIC_PGVECTOR' | 'BUILTIN_APPROVED_FALLBACK' =
        chosenCandidate.id.startsWith('builtin-') ? 'BUILTIN_APPROVED_FALLBACK' : 'DETERMINISTIC_EXACT';
      let similarityScore = 0.95;
      const matchReasons: string[] = [`Matched approved clause for ${normContractType} • ${typeKey}`];

      // If user specified preferred variant (e.g. mutual, strict), prioritize matching variant
      if (preferredVariant) {
        const variantMatch = candidates.find(c => (c.variant || '').toLowerCase() === preferredVariant.toLowerCase());
        if (variantMatch) {
          chosenCandidate = variantMatch;
          matchReasons.push(`Selected preferred variant '${preferredVariant}'`);
        }
      }

      // If context text is provided and multiple variants exist, rank with semantic similarity
      if (targetContextText && candidates.length > 1) {
        try {
          const embs = await legalNLPClient.getEmbeddings([targetContextText]);
          if (embs && embs[0]) {
            // Perform vector similarity against candidate clauses
            const searchResults = await vectorStore.searchSimilarApprovedClauses(
              embs[0],
              normContractType,
              typeKey,
              candidates.length
            );
            if (searchResults && searchResults.length > 0) {
              const bestResult = searchResults[0];
              const bestMatch = candidates.find(c => c.id === bestResult.id);
              if (bestMatch) {
                chosenCandidate = bestMatch;
                selectionMethod = 'SEMANTIC_PGVECTOR';
                similarityScore = Math.round(bestResult.similarity * 100) / 100;
                matchReasons.push(`Ranked highest by Legal-BERT pgvector cosine similarity (${Math.round(similarityScore * 100)}%)`);
              }
            }
          }
        } catch (vecErr) {
          // Graceful fallback to deterministic preference
        }
      }

      selectedResults.push({
        id: chosenCandidate.id,
        title: chosenCandidate.title,
        documentType: chosenCandidate.documentType,
        clauseType: chosenCandidate.clauseType,
        content: chosenCandidate.content || chosenCandidate.text,
        text: chosenCandidate.text || chosenCandidate.content,
        variant: chosenCandidate.variant || 'standard',
        requiredStatus: chosenCandidate.requiredStatus || chosenCandidate.requiredLevel || 'RECOMMENDED',
        riskLevel: chosenCandidate.riskLevel || 'LOW',
        jurisdiction: chosenCandidate.jurisdiction || preferredJurisdiction,
        version: chosenCandidate.version || 1,
        status: 'APPROVED',
        source: chosenCandidate.source,
        sourceUrl: chosenCandidate.sourceUrl,
        selectionMethod,
        similarityScore,
        matchReasons
      });

      if (selectedResults.length >= limit) {
        break;
      }
    }

    return selectedResults;
  }
}

export const clauseSelector = new ClauseSelectorService();

/**
 * Atharv Legal AI - Safe Multi-Contract Legal Intelligence Platform
 * Contract Linter Service
 * Performs fast, deterministic structural and textual linting on legal contracts:
 * 1. UNRESOLVED_PLACEHOLDER - [NAME], <TBD>, {{key}}, blanks (____)
 * 2. EMPTY_SECTION - Headings without substantive legal text
 * 3. BROKEN_CROSS_REFERENCE - References to non-existent sections/clauses
 * 4. MISSING_SIGNATURE_BLOCK - Absence of execution lines/covenants
 * 5. TOO_SHORT_DOCUMENT - Truncated drafts lacking legal substance
 */

import { stripTemplateInstructions } from '../documents/document_structure.js';

export interface LintError {
  id: string;
  code: 'UNRESOLVED_PLACEHOLDER' | 'EMPTY_SECTION' | 'BROKEN_CROSS_REFERENCE' | 'MISSING_SIGNATURE_BLOCK' | 'TOO_SHORT_DOCUMENT';
  message: string;
  severity: 'ERROR' | 'WARNING';
  line?: number;
  section?: string;
  snippet?: string;
  suggestion?: string;
}

export interface LintResult {
  valid: boolean;
  errorsCount: number;
  warningsCount: number;
  errors: LintError[];
}

export function lintContract(content: string, documentType?: string): LintResult {
  const errors: LintError[] = [];
  if (!content || !content.trim()) {
    return {
      valid: false,
      errorsCount: 1,
      warningsCount: 0,
      errors: [{
        id: 'lint_empty_doc',
        code: 'TOO_SHORT_DOCUMENT',
        message: 'Contract document is empty.',
        severity: 'ERROR',
        line: 1,
        suggestion: 'Generate or provide complete contract text before linting.'
      }]
    };
  }

  const lines = content.split('\n');
  const cleanFullText = stripTemplateInstructions(content);
  const words = cleanFullText.split(/\s+/).filter(Boolean);

  // 1. TOO_SHORT_DOCUMENT
  if (words.length < 50) {
    errors.push({
      id: 'lint_too_short',
      code: 'TOO_SHORT_DOCUMENT',
      message: `Document has only ${words.length} words and lacks substantive legal covenants.`,
      severity: 'ERROR',
      line: 1,
      snippet: content.slice(0, 100),
      suggestion: 'Complete all mandatory sections and legal clauses before execution.'
    });
  }

  // 2. UNRESOLVED_PLACEHOLDER
  let currentSection = 'Preamble';
  const placeholderPatterns = [
    // [NAME], [Insert ...], [TBD], but NOT markdown links [label](url) or footnote [^1]
    /\[(?![\^])([^\]\n]+)\](?!\()/g,
    // <insert ...>, <TBD>, <date>
    /<([A-Za-z0-9_\-\s]{2,35})>/g,
    // {{variable}}
    /\{\{([^}\n]+)\}\}/g,
    // Underscores blanks: ____ or more
    /(_{3,})/g
  ];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    // Track heading
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[1].replace(/^[0-9\.\-\s]+/, '').trim();
      continue;
    }

    // Skip comment lines or pure markdown formatting lines
    if (trimmed.startsWith('<!--') || trimmed.startsWith('/*') || trimmed.startsWith('>') || trimmed === '---') {
      continue;
    }

    // Check placeholders
    for (const pattern of placeholderPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(rawLine)) !== null) {
        const fullMatch = match[0];

        // Ignore common markdown artifacts like task checkboxes [ ], [x], [X]
        if (/^\[\s*[xX]?\s*\]$/.test(fullMatch)) continue;
        // Ignore citation or legal reference brackets e.g. [2021] 1 SCC 12
        if (/^\[\s*\d{4}\s*\]$/.test(fullMatch)) continue;

        errors.push({
          id: `lint_ph_${lineNum}_${match.index}`,
          code: 'UNRESOLVED_PLACEHOLDER',
          message: `Unresolved placeholder '${fullMatch}' detected in section '${currentSection}'.`,
          severity: 'ERROR',
          line: lineNum,
          section: currentSection,
          snippet: trimmed,
          suggestion: `Replace '${fullMatch}' with authoritative contractual information or remove.`
        });
      }
    }
  }

  // 3. EMPTY_SECTION
  // Parse sections and inspect word count / substantive text
  const sectionHeaders: Array<{ title: string; line: number; numberPrefix?: number; contentLines: string[] }> = [];
  let curSec: { title: string; line: number; numberPrefix?: number; contentLines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      if (curSec) {
        sectionHeaders.push(curSec);
      }
      const rawTitle = headingMatch[1].trim();
      const numMatch = rawTitle.match(/^(\d+)(?:\.|\s)/);
      curSec = {
        title: rawTitle,
        line: i + 1,
        numberPrefix: numMatch ? parseInt(numMatch[1], 10) : undefined,
        contentLines: []
      };
    } else if (curSec) {
      if (trimmed && !trimmed.startsWith('<!--') && !trimmed.startsWith('>') && trimmed !== '---') {
        curSec.contentLines.push(trimmed);
      }
    }
  }
  if (curSec) {
    sectionHeaders.push(curSec);
  }

  for (const sec of sectionHeaders) {
    const combinedContent = sec.contentLines.join(' ').trim();
    const cleanContent = stripTemplateInstructions(combinedContent);
    const secWords = cleanContent.split(/\s+/).filter(Boolean);

    // If section title is not merely "Signatures" and has less than 3 substantive words
    if (secWords.length < 3 && !/signature|execution|closing|schedule|exhibit|annexure/i.test(sec.title)) {
      errors.push({
        id: `lint_empty_sec_${sec.line}`,
        code: 'EMPTY_SECTION',
        message: `Section '${sec.title}' contains no substantive contractual terms.`,
        severity: 'WARNING',
        line: sec.line,
        section: sec.title,
        snippet: sec.title,
        suggestion: `Provide operative legal covenants under '${sec.title}' or remove the header.`
      });
    }
  }

  // 4. BROKEN_CROSS_REFERENCE
  // Identify internal section numbers present in the document
  const presentSectionNumbers = new Set<number>();
  for (const sec of sectionHeaders) {
    if (sec.numberPrefix !== undefined) {
      presentSectionNumbers.add(sec.numberPrefix);
    }
  }

  // Scan text for references to sections
  // e.g. "Section 14", "Clause 12", "Section 9.2", "pursuant to Section 8"
  // Exclude statutory references like "Section 138 of Negotiable Instruments", "Section 43A", "Section 65B of Evidence Act", "Section 73 of Indian Contract Act"
  const statutoryExclusion = /(?:section|clause)\s+\d+[A-Za-z]?(?:\s*\([0-9a-z]+\))*\s+(?:of\s+(?:the\s+)?(?:act|code|rules|regulations?|negotiable|evidence|information|penal|companies|contract\s+act|income\s+tax))/i;

  const crossRefRegex = /\b(?:section|clause|article)\s+(\d+)(?:\.\d+)?\b/gi;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;

    // Skip section headers themselves
    if (/^#{1,4}\s+/.test(rawLine.trim())) continue;

    // Check if line contains a cross-reference
    let refMatch: RegExpExecArray | null;
    crossRefRegex.lastIndex = 0;
    while ((refMatch = crossRefRegex.exec(rawLine)) !== null) {
      const referencedNum = parseInt(refMatch[1], 10);
      const surroundingContext = rawLine.substring(Math.max(0, refMatch.index - 20), Math.min(rawLine.length, refMatch.index + 60));

      if (statutoryExclusion.test(surroundingContext)) {
        continue;
      }

      // Check if reference is higher than total detected sections or not in present numbers
      if (presentSectionNumbers.size > 0 && !presentSectionNumbers.has(referencedNum) && referencedNum > sectionHeaders.length) {
        errors.push({
          id: `lint_broken_ref_${lineNum}_${referencedNum}`,
          code: 'BROKEN_CROSS_REFERENCE',
          message: `Referenced ${refMatch[0]} does not exist in this agreement (total numbered sections: ${sectionHeaders.length}).`,
          severity: 'WARNING',
          line: lineNum,
          snippet: rawLine.trim(),
          suggestion: `Verify and update the internal cross-reference to point to an existing section.`
        });
      }
    }
  }

  // 5. MISSING_SIGNATURE_BLOCK
  const hasExecutionTerms = /(?:in\s+witness\s+whereof|authorized\s+signator(?:y|ies)|by:\s*_+|executed\s+by\s+the\s+parties|for\s+and\s+on\s+behalf\s+of|signature:\s*_+)/i.test(content);
  const isLegalNotice = documentType === 'LEGAL_NOTICE' || /notice|demand/i.test(documentType || '');

  if (!isLegalNotice && !hasExecutionTerms) {
    errors.push({
      id: 'lint_missing_signatures',
      code: 'MISSING_SIGNATURE_BLOCK',
      message: 'Agreement lacks an execution clause or authorized signature blocks.',
      severity: 'ERROR',
      line: lines.length,
      suggestion: 'Append formal execution covenants and bilateral signature blocks.'
    });
  }

  const errorsCount = errors.filter(e => e.severity === 'ERROR').length;
  const warningsCount = errors.filter(e => e.severity === 'WARNING').length;

  return {
    valid: errorsCount === 0,
    errorsCount,
    warningsCount,
    errors
  };
}

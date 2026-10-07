import { findNormalizedMatch, normalizeForMatching } from '../../utils/text_normalizer';

/**
 * ATHARV Legal AI - Structured Document Engine
 * Parses raw legal markdown into a hierarchical, addressable model (Sections -> Paragraphs -> Ranges),
 * providing deterministic text location and surgical patch application with stale-patch protection.
 */

export interface DocumentParagraph {
  id: string; // e.g. 'sec_0_p_0'
  sectionId: string;
  order: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface DocumentSection {
  id: string; // e.g. 'sec_0'
  order: number;
  title: string;
  sectionType: string;
  content: string;
  startIndex: number;
  endIndex: number;
  paragraphs: DocumentParagraph[];
}

export interface StructuredDocument {
  fullText: string;
  sections: DocumentSection[];
  totalWords: number;
  totalCharacters: number;
}

export interface DocumentLocation {
  sectionId?: string;
  sectionTitle?: string;
  sectionIndex?: number;
  clauseId?: string;
  paragraphId?: string;
  paragraphIndex?: number;
  textRange?: {
    start: number;
    end: number;
  };
  contextBefore?: string;
  contextAfter?: string;
  isMissing?: boolean;
  insertionOffset?: number;
  insertionAnchor?: string;
  locationConfidence?: number;
  nature?: 'DEFECTIVE_TEXT' | 'MISSING_CLAUSE' | 'MISSING_FIELD' | 'PLACEHOLDER' | 'STRUCTURAL';
}

export interface DocumentPatch {
  id: string;
  issueId: string;
  action: 'REPLACE_TEXT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'DELETE';
  target: DocumentLocation;
  originalText: string;
  replacementText: string;
  reason: string;
  preserve?: string[];
  canAutoFix: boolean;
  mode: 'SAFE_AUTO' | 'REVIEW' | 'MANUAL';
  confidence: number;
  requiresUserInput: boolean;
}

export class StalePatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StalePatchError';
  }
}

export class InvalidPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPatchError';
  }
}

/**
 * Parses markdown contract text into a hierarchical, structured document model.
 */
export function parseDocumentStructure(content: string): StructuredDocument {
  const fullText = content || '';
  const sections: DocumentSection[] = [];

  // Determine section blocks using markdown thematic dividers (---) or top-level headers (# / ##)
  let rawBlocks = fullText.split(/\n\s*---\s*\n/);
  if (rawBlocks.length <= 1 && /(?:^|\n)#{1,3}\s+/m.test(fullText)) {
    const headerSplit = fullText.split(/(?=\n#{1,3}\s+)/g).filter(b => b.trim().length > 0);
    if (headerSplit.length > 1) {
      rawBlocks = headerSplit;
    }
  }

  let globalOffset = 0;

  for (let sIdx = 0; sIdx < rawBlocks.length; sIdx++) {
    const rawBlock = rawBlocks[sIdx];
    const rawStart = fullText.indexOf(rawBlock, globalOffset);
    globalOffset = rawStart + rawBlock.length;

    const trimmedContent = rawBlock.trim();
    const leadingWhitespaceLen = rawBlock.length - rawBlock.trimStart().length;
    const sectionStart = rawStart + leadingWhitespaceLen;
    const sectionEnd = sectionStart + trimmedContent.length;

    // Detect section heading
    const lines = trimmedContent.split('\n');
    const headingLine = lines.find(l => /^#{1,3}\s+/.test(l.trim()));
    const title = headingLine ? headingLine.replace(/^#{1,3}\s+/, '').trim() : `Section ${sIdx + 1}`;
    const sectionType = title.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const sectionId = `sec_${sIdx}`;
    const paragraphs: DocumentParagraph[] = [];

    // Parse paragraphs within section
    const rawParagraphs = trimmedContent.split(/\n\s*\n+/);
    let pOffset = sectionStart;

    for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
      const pText = rawParagraphs[pIdx].trim();
      if (!pText) continue;

      const pStart = fullText.indexOf(pText, pOffset);
      const pEnd = pStart + pText.length;
      pOffset = pEnd;

      paragraphs.push({
        id: `${sectionId}_p_${pIdx}`,
        sectionId,
        order: pIdx,
        text: pText,
        startIndex: pStart,
        endIndex: pEnd
      });
    }

    sections.push({
      id: sectionId,
      order: sIdx,
      title,
      sectionType,
      content: trimmedContent,
      startIndex: sectionStart,
      endIndex: sectionEnd,
      paragraphs
    });
  }

  return {
    fullText,
    sections,
    totalWords: fullText.split(/\s+/).filter(Boolean).length,
    totalCharacters: fullText.length
  };
}

/**
 * Identifies the logical insertion point in a document for a missing clause or section.
 */
export function findLogicalInsertionPoint(
  content: string,
  clauseTypeOrTitle: string,
  parsedDoc?: StructuredDocument
): { insertionOffset: number; anchorTitle: string } {
  const doc = parsedDoc || parseDocumentStructure(content);
  const normalizedTarget = (clauseTypeOrTitle || '').toLowerCase();

  // 1. Parties / Preamble / Effective Date items belong in the preamble/parties block
  if (
    normalizedTarget.includes('party') ||
    normalizedTarget.includes('parties') ||
    normalizedTarget.includes('date') ||
    normalizedTarget.includes('preamble')
  ) {
    const preambleSec = doc.sections.find(s =>
      /preamble|parties|between/i.test(s.title) || s.sectionType === 'PREAMBLE'
    );
    if (preambleSec) {
      return {
        insertionOffset: preambleSec.endIndex,
        anchorTitle: preambleSec.title
      };
    }
    const firstSec = doc.sections[0];
    if (firstSec && firstSec.paragraphs.length > 0) {
      return {
        insertionOffset: firstSec.paragraphs[0].endIndex,
        anchorTitle: firstSec.title
      };
    }
  }

  // 2. Definitions / Scope items belong after preamble
  if (normalizedTarget.includes('definition') || normalizedTarget.includes('scope') || normalizedTarget.includes('purpose')) {
    const preambleIdx = doc.sections.findIndex(s => /preamble|parties/i.test(s.title) || s.sectionType === 'PREAMBLE');
    if (preambleIdx !== -1 && doc.sections[preambleIdx]) {
      return {
        insertionOffset: doc.sections[preambleIdx].endIndex,
        anchorTitle: doc.sections[preambleIdx].title
      };
    }
  }

  // 3. Execution / Signatures items belong at the very end
  if (normalizedTarget.includes('signature') || normalizedTarget.includes('execution') || normalizedTarget.includes('witness')) {
    return {
      insertionOffset: content.length,
      anchorTitle: 'End of Document (Execution & Signatures)'
    };
  }

  // 4. General clauses: insert before the Signature / Execution block if it exists
  const sigSec = doc.sections.find(s =>
    /signature|execution|in\s+witness/i.test(s.title) ||
    /in\s+witness\s+whereof/i.test(s.content)
  );
  if (sigSec) {
    return {
      insertionOffset: sigSec.startIndex,
      anchorTitle: `Before ${sigSec.title}`
    };
  }

  // 5. Fallback: before the last section or end of document
  if (doc.sections.length > 1) {
    const lastSec = doc.sections[doc.sections.length - 1];
    return {
      insertionOffset: lastSec.startIndex,
      anchorTitle: `Before ${lastSec.title}`
    };
  }

  return {
    insertionOffset: content.length,
    anchorTitle: 'End of Document'
  };
}

/**
 * Locates a text token, phrase, or pattern within the structured document,
 * identifying the exact sectionId, paragraphId, and character boundaries.
 * Uses normalized matching to tolerate quotes/dashes/whitespace variations,
 * and extracts surrounding context to disambiguate repeated phrases.
 */
export function locateTextInDocument(
  content: string,
  targetTokenOrPattern: string | RegExp,
  preferredSectionKeyword?: string,
  options?: {
    contextBefore?: string;
    contextAfter?: string;
    nature?: 'DEFECTIVE_TEXT' | 'MISSING_CLAUSE' | 'MISSING_FIELD' | 'PLACEHOLDER' | 'STRUCTURAL';
  }
): {
  location: DocumentLocation;
  evidence: string;
  found: boolean;
} {
  const doc = parseDocumentStructure(content);

  // 1. If preferred section specified, search within matching section first
  let targetSec: DocumentSection | undefined;
  if (preferredSectionKeyword) {
    targetSec = doc.sections.find(s =>
      s.title.toLowerCase().includes(preferredSectionKeyword.toLowerCase()) ||
      s.sectionType.toLowerCase().includes(preferredSectionKeyword.toLowerCase())
    );
  }

  // 2. Perform normalized matching if target is a string
  if (typeof targetTokenOrPattern === 'string') {
    const cleanToken = targetTokenOrPattern.trim();
    if (cleanToken.length > 0) {
      // 2a. If preferred section exists, search within it first
      if (targetSec) {
        const secMatch = findNormalizedMatch(targetSec.content, cleanToken, {
          contextBefore: options?.contextBefore,
          contextAfter: options?.contextAfter
        });
        if (secMatch) {
          const absStart = targetSec.startIndex + secMatch.start;
          const absEnd = targetSec.startIndex + secMatch.end;
          const p = targetSec.paragraphs.find(para => absStart >= para.startIndex && absEnd <= para.endIndex) ||
            targetSec.paragraphs.find(para => absStart >= para.startIndex && absStart <= para.endIndex) ||
            targetSec.paragraphs[0];

          const ctxBefore = content.substring(Math.max(0, absStart - 40), absStart);
          const ctxAfter = content.substring(absEnd, Math.min(content.length, absEnd + 40));

          return {
            location: {
              sectionId: targetSec.id,
              sectionTitle: targetSec.title,
              sectionIndex: targetSec.order,
              paragraphId: p?.id,
              paragraphIndex: p?.order,
              textRange: { start: absStart, end: absEnd },
              contextBefore: ctxBefore,
              contextAfter: ctxAfter,
              locationConfidence: secMatch.confidence,
              nature: options?.nature || 'DEFECTIVE_TEXT',
              isMissing: false
            },
            evidence: secMatch.matchSnippet,
            found: true
          };
        }
      }

      // 2b. Global search with context disambiguation
      const globalMatch = findNormalizedMatch(content, cleanToken, {
        contextBefore: options?.contextBefore,
        contextAfter: options?.contextAfter,
        searchRange: targetSec ? { start: targetSec.startIndex, end: targetSec.endIndex } : undefined
      });

      if (globalMatch) {
        const absStart = globalMatch.start;
        const absEnd = globalMatch.end;

        const sec = doc.sections.find(s => absStart >= s.startIndex && absStart <= s.endIndex) || doc.sections[0];
        const p = sec?.paragraphs.find(para => absStart >= para.startIndex && absEnd <= para.endIndex) ||
          sec?.paragraphs.find(para => absStart >= para.startIndex && absStart <= para.endIndex);

        const ctxBefore = content.substring(Math.max(0, absStart - 40), absStart);
        const ctxAfter = content.substring(absEnd, Math.min(content.length, absEnd + 40));

        return {
          location: {
            sectionId: sec?.id,
            sectionTitle: sec?.title,
            sectionIndex: sec?.order,
            paragraphId: p?.id,
            paragraphIndex: p?.order,
            textRange: { start: absStart, end: absEnd },
            contextBefore: ctxBefore,
            contextAfter: ctxAfter,
            locationConfidence: globalMatch.confidence,
            nature: options?.nature || 'DEFECTIVE_TEXT',
            isMissing: false
          },
          evidence: globalMatch.matchSnippet,
          found: true
        };
      }
    }
  } else {
    // 3. Regular Expression search
    if (targetSec) {
      for (const p of targetSec.paragraphs) {
        const match = findMatchInText(p.text, targetTokenOrPattern);
        if (match) {
          const absStart = p.startIndex + match.start;
          const absEnd = p.startIndex + match.end;
          return {
            location: {
              sectionId: targetSec.id,
              sectionTitle: targetSec.title,
              sectionIndex: targetSec.order,
              paragraphId: p.id,
              paragraphIndex: p.order,
              textRange: { start: absStart, end: absEnd },
              contextBefore: content.substring(Math.max(0, absStart - 40), absStart),
              contextAfter: content.substring(absEnd, Math.min(content.length, absEnd + 40)),
              locationConfidence: 0.95,
              nature: options?.nature || 'DEFECTIVE_TEXT',
              isMissing: false
            },
            evidence: extractSentenceOrLine(p.text, match.start, match.end),
            found: true
          };
        }
      }
    }

    for (const s of doc.sections) {
      for (const p of s.paragraphs) {
        const match = findMatchInText(p.text, targetTokenOrPattern);
        if (match) {
          const absStart = p.startIndex + match.start;
          const absEnd = p.startIndex + match.end;
          return {
            location: {
              sectionId: s.id,
              sectionTitle: s.title,
              sectionIndex: s.order,
              paragraphId: p.id,
              paragraphIndex: p.order,
              textRange: { start: absStart, end: absEnd },
              contextBefore: content.substring(Math.max(0, absStart - 40), absStart),
              contextAfter: content.substring(absEnd, Math.min(content.length, absEnd + 40)),
              locationConfidence: 0.9,
              nature: options?.nature || 'DEFECTIVE_TEXT',
              isMissing: false
            },
            evidence: extractSentenceOrLine(p.text, match.start, match.end),
            found: true
          };
        }
      }
    }
  }

  // 4. NOT FOUND: Do NOT invent a location or evidence!
  const insertion = findLogicalInsertionPoint(
    content,
    preferredSectionKeyword || (typeof targetTokenOrPattern === 'string' ? targetTokenOrPattern : 'General'),
    doc
  );

  return {
    location: {
      sectionTitle: insertion.anchorTitle,
      isMissing: true,
      insertionOffset: insertion.insertionOffset,
      insertionAnchor: insertion.anchorTitle,
      locationConfidence: 0.85,
      nature: options?.nature || (preferredSectionKeyword ? 'MISSING_CLAUSE' : 'MISSING_FIELD')
    },
    evidence: '',
    found: false
  };
}

/**
 * Applies a precision structured patch to the document content.
 * Enforces stale-patch verification and boundary guards.
 */
export function applyDocumentPatch(
  currentContent: string,
  patch: DocumentPatch
): {
  newContent: string;
  content: string;
  appliedRange: { start: number; end: number };
} {
  if (!patch) {
    throw new InvalidPatchError('No patch provided.');
  }

  const { originalText, replacementText, action, target } = patch;

  // 1. If exact text range is supplied and matches originalText
  if (target?.textRange && target.textRange.start >= 0 && target.textRange.end <= currentContent.length) {
    const rangeContent = currentContent.substring(target.textRange.start, target.textRange.end);
    if (rangeContent.trim() === originalText.trim()) {
      const before = currentContent.substring(0, target.textRange.start);
      const after = currentContent.substring(target.textRange.end);
      const replaceWith = action === 'DELETE' ? '' : replacementText;
      const newContent = `${before}${replaceWith}${after}`;
      return {
        newContent,
        content: newContent,
        appliedRange: {
          start: target.textRange.start,
          end: target.textRange.start + replaceWith.length
        }
      };
    }
  }

  // 2. Locate exact or fuzzy whitespace occurrence of originalText
  if (action === 'REPLACE_TEXT' || action === 'DELETE') {
    const cleanOrig = (originalText || '').trim();
    if (!cleanOrig) {
      throw new InvalidPatchError('Cannot perform text replacement without originalText.');
    }

    let matchIdx = -1;
    let matchLen = cleanOrig.length;

    const directIdx = currentContent.indexOf(cleanOrig);
    if (directIdx !== -1) {
      matchIdx = directIdx;
      matchLen = cleanOrig.length;
    } else {
      const normMatch = findNormalizedMatch(currentContent, cleanOrig, {
        contextBefore: target?.contextBefore,
        contextAfter: target?.contextAfter,
        searchRange: target?.textRange
      });
      if (normMatch) {
        matchIdx = normMatch.start;
        matchLen = normMatch.end - normMatch.start;
      }
    }

    if (matchIdx === -1) {
      throw new StalePatchError(
        `Document has changed since this suggestion was created. Target text "${cleanOrig.slice(0, 40)}..." was not found in the document.`
      );
    }

    const before = currentContent.substring(0, matchIdx);
    const after = currentContent.substring(matchIdx + matchLen);
    const replaceWith = action === 'DELETE' ? '' : replacementText;
    const newContent = `${before}${replaceWith}${after}`;

    return {
      newContent,
      content: newContent,
      appliedRange: {
        start: matchIdx,
        end: matchIdx + replaceWith.length
      }
    };
  }

  // 3. Insert operations
  if (action === 'INSERT_AFTER' || action === 'INSERT_BEFORE') {
    let insertIndex = currentContent.length;

    if (originalText && currentContent.includes(originalText.trim())) {
      const anchorIdx = currentContent.indexOf(originalText.trim());
      insertIndex = action === 'INSERT_AFTER' ? anchorIdx + originalText.trim().length : anchorIdx;
    } else if (target?.sectionId) {
      const doc = parseDocumentStructure(currentContent);
      if (target.sectionId === 'sec_end') {
        insertIndex = currentContent.length;
      } else {
        const sec = doc.sections.find(s => s.id === target.sectionId);
        if (sec) {
          insertIndex = action === 'INSERT_AFTER' ? sec.endIndex : sec.startIndex;
        }
      }
    }

    // Insert with clean markdown separation
    const before = currentContent.substring(0, insertIndex).trimEnd();
    const after = currentContent.substring(insertIndex).trimStart();
    
    let newContent: string;
    if (!before) {
      newContent = after ? `${replacementText.trim()}\n\n---\n\n${after}` : replacementText.trim();
    } else if (!after) {
      newContent = `${before}\n\n---\n\n${replacementText.trim()}`;
    } else {
      newContent = `${before}\n\n---\n\n${replacementText.trim()}\n\n---\n\n${after}`;
    }

    return {
      newContent,
      content: newContent,
      appliedRange: {
        start: before ? before.length + 7 : 0,
        end: (before ? before.length + 7 : 0) + replacementText.trim().length
      }
    };
  }

  throw new InvalidPatchError(`Unsupported patch action: ${action}`);
}

function findMatchInText(text: string, tokenOrPattern: string | RegExp): { start: number; end: number } | null {
  if (!text || !tokenOrPattern) return null;

  if (typeof tokenOrPattern === 'string') {
    const clean = tokenOrPattern.trim().toLowerCase();
    if (!clean) return null;
    const idx = text.toLowerCase().indexOf(clean);
    if (idx !== -1) {
      return { start: idx, end: idx + clean.length };
    }
  } else {
    const match = text.match(tokenOrPattern);
    if (match && match.index !== undefined) {
      return { start: match.index, end: match.index + match[0].length };
    }
  }

  return null;
}

function extractSentenceOrLine(text: string, matchStart: number, matchEnd: number): string {
  // Find surrounding line or sentence
  const lineStart = text.lastIndexOf('\n', matchStart) + 1;
  let lineEnd = text.indexOf('\n', matchEnd);
  if (lineEnd === -1) lineEnd = text.length;

  const snippet = text.substring(lineStart, lineEnd).trim();
  return snippet || text.substring(Math.max(0, matchStart - 40), Math.min(text.length, matchEnd + 40)).trim();
}

/**
 * Strips out template instruction prompts, guidance lines, markdown callouts,
 * HTML/code comments, and bracketed placeholder prompts from text.
 * Leaves genuine contract text intact for legal obligation analysis.
 */
export function stripTemplateInstructions(text: string): string {
  if (!text) return '';

  return text
    // Remove HTML comments: <!-- ... -->
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove C-style block comments: /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove blockquote instructions / callouts: e.g. "> Note:", "> Instructions:", "> Prompt Guide:", "> Guidance:"
    .replace(/^\s*>\s*(?:note|instructions?|guidance|prompt(?:\s*guide)?|tip|important|warning|caution):?.*$/gim, '')
    // Remove standalone instruction lines: e.g. "Prompt Guide: ...", "Instructions: ...", "Guidance: ..."
    .replace(/^\s*(?:prompt(?:\s*guide)?|instructions?|guidance|drafting\s*notes?):?.*$/gim, '')
    // Remove bracketed instructions: e.g. "[Specify the exact consideration...]", "[Insert payment schedule...]", "[Describe ...]"
    .replace(/\[\s*(?:specify|insert|enter|define|describe|select|choose|optional|note|tbd|to be determined|e\.g\.)\b[^\]]*\]/gi, '')
    // Remove angle bracket placeholders: e.g. "<insert ...>", "<specify ...>"
    .replace(/<\s*(?:specify|insert|enter|define|describe|[A-Za-z0-9_\-\s]{2,35})\b[^>]*>/gi, '')
    // Remove curly brace placeholders: e.g. "{insert ...}"
    .replace(/\{\s*(?:specify|insert|enter|define|describe|[A-Za-z0-9_\-\s]{2,35})\b[^}]*\}/gi, '')
    // Remove bare instruction lines: e.g. "Specify the exact consideration...", "Enter the address..."
    .replace(/^\s*(?:Specify\s+the|Enter\s+the|Insert\s+the|Provide\s+the)\s+[^\n]*$/gim, '')
    // Clean multiple consecutive blank lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Checks whether a given string is merely a template instruction or placeholder prompt.
 */
export function isInstructionOrPlaceholder(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  const t = text.trim();
  if (/^#{1,4}\s+/.test(t)) return false;
  if (/^\[\s*(?:specify|insert|enter|define|describe|select|optional|note|tbd|to be determined|e\.g\.)\b/i.test(t)) return true;
  if (/^\[\s*(?:[A-Za-z0-9_\-\s]{2,40})\s*\]$/.test(t)) return true;
  if (/^<\s*(?:[A-Za-z0-9_\-\s]{2,35})\s*>$/.test(t)) return true;
  if (/^\{\{\s*(?:[A-Za-z0-9_\-\s]{2,35})\s*\}\}$/.test(t)) return true;
  if (/^(?:Specify\s+the|Enter\s+the|Insert\s+the|Provide\s+the)\s+/i.test(t)) return true;
  if (/^(?:TBD|N\/A|INSERT\s+HERE|YOUR\s+NAME)$/i.test(t)) return true;
  if (/^_{3,}$/.test(t)) return true;
  if (/^>\s*(?:note|instructions?|guidance|prompt|tip|important|warning):?/i.test(t)) return true;
  if (/^(?:prompt(?:\s*guide)?|instructions?|guidance|drafting\s*notes?):?/i.test(t)) return true;
  if (/^<!--[\s\S]*?-->$/.test(t)) return true;
  return false;
}

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
  clauseId?: string;
  paragraphId?: string;
  textRange?: {
    start: number;
    end: number;
  };
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
    const sectionStart = fullText.indexOf(rawBlock, globalOffset);
    const sectionEnd = sectionStart + rawBlock.length;
    globalOffset = sectionEnd;

    // Detect section heading
    const lines = rawBlock.trim().split('\n');
    const headingLine = lines.find(l => /^#{1,3}\s+/.test(l.trim()));
    const title = headingLine ? headingLine.replace(/^#{1,3}\s+/, '').trim() : `Section ${sIdx + 1}`;
    const sectionType = title.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const sectionId = `sec_${sIdx}`;
    const paragraphs: DocumentParagraph[] = [];

    // Parse paragraphs within section
    const rawParagraphs = rawBlock.split(/\n\s*\n+/);
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
      content: rawBlock.trim(),
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
 * Locates a text token, phrase, or pattern within the structured document,
 * identifying the exact sectionId, paragraphId, and character boundaries.
 */
export function locateTextInDocument(
  content: string,
  targetTokenOrPattern: string | RegExp,
  preferredSectionKeyword?: string
): {
  location: DocumentLocation;
  evidence: string;
  found: boolean;
} {
  const doc = parseDocumentStructure(content);

  // 1. If preferred section specified, search within matching section first
  if (preferredSectionKeyword) {
    const targetSec = doc.sections.find(s =>
      s.title.toLowerCase().includes(preferredSectionKeyword.toLowerCase()) ||
      s.sectionType.toLowerCase().includes(preferredSectionKeyword.toLowerCase())
    );

    if (targetSec) {
      for (const p of targetSec.paragraphs) {
        const match = findMatchInText(p.text, targetTokenOrPattern);
        if (match) {
          const absoluteStart = p.startIndex + match.start;
          const absoluteEnd = p.startIndex + match.end;
          return {
            location: {
              sectionId: targetSec.id,
              sectionTitle: targetSec.title,
              paragraphId: p.id,
              textRange: { start: absoluteStart, end: absoluteEnd }
            },
            evidence: extractSentenceOrLine(p.text, match.start, match.end),
            found: true
          };
        }
      }

      // If token not matched inside section, return the section paragraph
      if (targetSec.paragraphs.length > 0) {
        const firstP = targetSec.paragraphs[0];
        return {
          location: {
            sectionId: targetSec.id,
            sectionTitle: targetSec.title,
            paragraphId: firstP.id,
            textRange: { start: firstP.startIndex, end: firstP.endIndex }
          },
          evidence: firstP.text.slice(0, 160),
          found: true
        };
      }
    }
  }

  // 2. Global search across all paragraphs
  for (const s of doc.sections) {
    for (const p of s.paragraphs) {
      const match = findMatchInText(p.text, targetTokenOrPattern);
      if (match) {
        const absoluteStart = p.startIndex + match.start;
        const absoluteEnd = p.startIndex + match.end;
        return {
          location: {
            sectionId: s.id,
            sectionTitle: s.title,
            paragraphId: p.id,
            textRange: { start: absoluteStart, end: absoluteEnd }
          },
          evidence: extractSentenceOrLine(p.text, match.start, match.end),
          found: true
        };
      }
    }
  }

  // 3. Fallback: Beginning of document
  return {
    location: {
      sectionId: doc.sections[0]?.id || 'sec_0',
      sectionTitle: doc.sections[0]?.title || 'Document Header',
      paragraphId: doc.sections[0]?.paragraphs[0]?.id || 'sec_0_p_0',
      textRange: { start: 0, end: Math.min(content.length, 100) }
    },
    evidence: content.slice(0, 100),
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
      // Try case-insensitive search
      const lowerContent = currentContent.toLowerCase();
      const lowerOrig = cleanOrig.toLowerCase();
      const lowerIdx = lowerContent.indexOf(lowerOrig);
      if (lowerIdx !== -1) {
        matchIdx = lowerIdx;
        matchLen = cleanOrig.length;
      } else {
        // Try regex with whitespace tolerance
        const escaped = cleanOrig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const regexMatch = currentContent.match(new RegExp(escaped, 'i'));
        if (regexMatch && regexMatch.index !== undefined) {
          matchIdx = regexMatch.index;
          matchLen = regexMatch[0].length;
        }
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

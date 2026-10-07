/**
 * Text Normalization & Robust Substring Locator Utility
 * Normalizes Unicode quotes, dashes, whitespace, and line breaks
 * to locate evidence in raw document text without mutating original characters.
 */

export interface NormalizedMatchOptions {
  contextBefore?: string;
  contextAfter?: string;
  searchRange?: {
    start: number;
    end: number;
  };
}

export interface NormalizedMatchResult {
  start: number;
  end: number;
  matchSnippet: string;
  confidence: number;
}

/**
 * Standardizes Unicode quotes, apostrophes, dashes, and whitespace in a string.
 */
export function normalizeQuotesAndPunctuation(text: string): string {
  if (!text) return '';
  return text
    // Replace smart double quotes
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    // Replace smart single quotes & apostrophes
    .replace(/[\u2018\u2019\u201A\u201B\u02BB\u02BC]/g, "'")
    // Replace em/en dashes and hyphen variants
    .replace(/[\u2014\u2013\u2212\u2010\u2015]/g, '-')
    // Replace non-breaking spaces and zero-width spaces
    .replace(/[\u00A0\u2000-\u200B\u202F\uFEFF]/g, ' ');
}

/**
 * Collapses whitespace and normalizes punctuation for string comparison.
 */
export function normalizeForMatching(text: string): string {
  if (!text) return '';
  return normalizeQuotesAndPunctuation(text)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapes regex special characters in a literal string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Constructs a flexible RegExp from needle that matches:
 * - Varied whitespace/newlines (\s+)
 * - Any double quote variant
 * - Any single quote variant
 * - Any dash variant
 */
export function buildFlexibleMatchRegex(needle: string, flags: string = 'gi'): RegExp {
  const norm = normalizeQuotesAndPunctuation(needle.trim());
  if (!norm) return /(?!)/; // matches nothing

  // Break needle into tokens by whitespace
  const tokens = norm.split(/\s+/).filter(t => t.length > 0);

  const patternParts = tokens.map(token => {
    let part = '';
    for (let i = 0; i < token.length; i++) {
      const char = token[i];
      if (char === '"') {
        part += '["\u201C\u201D\u201E\u00AB\u00BB]';
      } else if (char === "'") {
        part += "['\u2018\u2019\u201A\u201B\u02BB\u02BC]";
      } else if (char === '-') {
        part += '[-—–−‐―]';
      } else {
        part += escapeRegex(char);
      }
    }
    return part;
  });

  return new RegExp(patternParts.join('\\s+'), flags);
}

/**
 * Disambiguates multiple matches by scoring context similarity
 */
function scoreContextMatch(
  haystack: string,
  matchStart: number,
  matchEnd: number,
  options?: NormalizedMatchOptions
): number {
  let score = 1.0;

  if (options?.searchRange) {
    // If inside preferred search range, give strong boost
    if (matchStart >= options.searchRange.start && matchEnd <= options.searchRange.end) {
      score += 10.0;
    } else {
      score -= 2.0;
    }
  }

  if (options?.contextBefore && options.contextBefore.trim().length > 3) {
    const normCtxBefore = normalizeForMatching(options.contextBefore).toLowerCase();
    const actualBefore = normalizeForMatching(
      haystack.substring(Math.max(0, matchStart - 80), matchStart)
    ).toLowerCase();

    // Check overlap
    if (actualBefore.endsWith(normCtxBefore) || actualBefore.includes(normCtxBefore.slice(-20))) {
      score += 5.0;
    } else if (normCtxBefore.split(' ').some(w => w.length > 3 && actualBefore.includes(w))) {
      score += 2.0;
    }
  }

  if (options?.contextAfter && options.contextAfter.trim().length > 3) {
    const normCtxAfter = normalizeForMatching(options.contextAfter).toLowerCase();
    const actualAfter = normalizeForMatching(
      haystack.substring(matchEnd, Math.min(haystack.length, matchEnd + 80))
    ).toLowerCase();

    if (actualAfter.startsWith(normCtxAfter) || actualAfter.includes(normCtxAfter.slice(0, 20))) {
      score += 5.0;
    } else if (normCtxAfter.split(' ').some(w => w.length > 3 && actualAfter.includes(w))) {
      score += 2.0;
    }
  }

  return score;
}

/**
 * Finds the exact character boundaries of needle in haystack using flexible normalized matching.
 * Returns exact start and end offsets within the original haystack text.
 */
export function findNormalizedMatch(
  haystack: string,
  needle: string,
  options?: NormalizedMatchOptions
): NormalizedMatchResult | null {
  if (!haystack || !needle || needle.trim().length === 0) {
    return null;
  }

  const cleanNeedle = needle.trim();

  // 1. Direct substring match if clean and unique
  const directIdx = haystack.indexOf(cleanNeedle);
  if (directIdx !== -1) {
    const nextIdx = haystack.indexOf(cleanNeedle, directIdx + 1);
    // If unique match and no conflicting options
    if (nextIdx === -1 && !options?.contextBefore && !options?.contextAfter && !options?.searchRange) {
      return {
        start: directIdx,
        end: directIdx + cleanNeedle.length,
        matchSnippet: haystack.substring(directIdx, directIdx + cleanNeedle.length),
        confidence: 1.0
      };
    }
  }

  // 2. Flexible RegExp search
  try {
    const regex = buildFlexibleMatchRegex(cleanNeedle, 'gi');
    const matches: Array<{ start: number; end: number; snippet: string; score: number }> = [];

    let m: RegExpExecArray | null;
    while ((m = regex.exec(haystack)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const snippet = m[0];
      const score = scoreContextMatch(haystack, start, end, options);
      matches.push({ start, end, snippet, score });

      // Guard against zero-width loops
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    if (matches.length > 0) {
      // Sort descending by score
      matches.sort((a, b) => b.score - a.score);
      const best = matches[0];
      return {
        start: best.start,
        end: best.end,
        matchSnippet: best.snippet,
        confidence: Math.min(1.0, 0.85 + (best.score > 5 ? 0.14 : 0.05))
      };
    }
  } catch (err) {
    console.warn('Regex flexible match error, falling back to substring:', err);
  }

  // 3. Fallback: Lowercase search
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = cleanNeedle.toLowerCase();
  const lowerIdx = lowerHaystack.indexOf(lowerNeedle);
  if (lowerIdx !== -1) {
    return {
      start: lowerIdx,
      end: lowerIdx + cleanNeedle.length,
      matchSnippet: haystack.substring(lowerIdx, lowerIdx + cleanNeedle.length),
      confidence: 0.8
    };
  }

  return null;
}

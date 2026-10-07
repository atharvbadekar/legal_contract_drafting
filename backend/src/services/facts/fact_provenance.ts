export type FactProvenance =
  | 'USER_PROVIDED'
  | 'DOCUMENT_EXTRACTED'
  | 'DATABASE_REFERENCE'
  | 'RAG_SOURCE'
  | 'INFERRED'
  | 'MISSING'
  | 'PLACEHOLDER';

export interface FactRecord<T = any> {
  key: string;
  value: T;
  provenance: FactProvenance;
  label?: string;
  confidence?: number;
  source?: string;
  isPlaceholder?: boolean;
}

export type ProvenanceFactsMap = Record<string, FactRecord>;

/**
 * Normalizes user input facts into structured records with explicit provenance.
 * NEVER invents critical facts (parties, dates, amounts, jurisdiction, term).
 * If a critical fact is absent or empty, tags it explicitly as MISSING or PLACEHOLDER.
 */
export function tagUserFacts(rawFacts: Record<string, any> = {}): ProvenanceFactsMap {
  const result: ProvenanceFactsMap = {};

  const traverse = (obj: any, prefix = '') => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val as any).provenance) {
        traverse(val, fullKey);
      } else {
        // Check if already tagged
        if (val && typeof val === 'object' && 'provenance' in val && 'value' in val) {
          result[fullKey] = {
            key: fullKey,
            value: (val as any).value,
            provenance: (val as any).provenance,
            label: (val as any).label || fullKey,
            confidence: (val as any).confidence ?? 1.0,
            source: (val as any).source,
            isPlaceholder: (val as any).isPlaceholder ?? false
          };
        } else {
          const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
          const isPlaceholderPattern =
            typeof val === 'string' &&
            (/^\[.*\]$/.test(val.trim()) || /^<.*>$/.test(val.trim()) || /^_{3,}$/.test(val.trim()) || /\bTBD\b/i.test(val));

          let provenance: FactProvenance = 'USER_PROVIDED';
          let isPlaceholder = false;

          if (isEmpty) {
            provenance = 'MISSING';
          } else if (isPlaceholderPattern) {
            provenance = 'PLACEHOLDER';
            isPlaceholder = true;
          }

          result[fullKey] = {
            key: fullKey,
            value: isEmpty ? null : val,
            provenance,
            label: fullKey,
            confidence: isEmpty ? 0.0 : 1.0,
            isPlaceholder
          };
        }
      }
    }
  };

  traverse(rawFacts);
  return result;
}

/**
 * Extracts plain raw values from either tagged FactRecord objects or legacy raw values.
 */
export function extractFactValue<T = any>(valOrRecord: any): T {
  if (valOrRecord === null || valOrRecord === undefined) {
    return valOrRecord;
  }
  if (typeof valOrRecord === 'object' && 'value' in valOrRecord && 'provenance' in valOrRecord) {
    return valOrRecord.value;
  }
  return valOrRecord;
}

/**
 * Converts a structured facts map back to a standard flat or nested key-value dictionary.
 */
export function unwrapFacts(facts: Record<string, any>): Record<string, any> {
  const unwrapped: Record<string, any> = {};

  for (const [key, item] of Object.entries(facts)) {
    const val = extractFactValue(item);
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = unwrapped;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!current[p] || typeof current[p] !== 'object') {
          current[p] = {};
        }
        current = current[p];
      }
      current[parts[parts.length - 1]] = val;
    } else {
      unwrapped[key] = val;
    }
  }

  return unwrapped;
}

/**
 * Generates an unmistakable, visible legal placeholder when a critical fact is missing.
 * Prevents hallucination of fictitious entities, amounts, or terms.
 */
export function getVisiblePlaceholder(fieldKey: string, fieldLabel?: string): string {
  const label = fieldLabel || fieldKey.replace(/([A-Z])/g, ' $1').replace(/[._]/g, ' ').trim();
  const upper = label.toUpperCase();
  return `[${upper} — SPECIFY]`;
}

/**
 * Resolves a fact safely: if missing or blank, returns a visible placeholder instead of inventing text.
 */
export function resolveFactOrPlaceholder(
  val: any,
  fieldKey: string,
  fieldLabel?: string
): { text: string; isPlaceholder: boolean; provenance: FactProvenance } {
  const raw = extractFactValue(val);
  const isEmpty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');

  if (isEmpty) {
    return {
      text: getVisiblePlaceholder(fieldKey, fieldLabel),
      isPlaceholder: true,
      provenance: 'PLACEHOLDER'
    };
  }

  return {
    text: String(raw),
    isPlaceholder: false,
    provenance: 'USER_PROVIDED'
  };
}

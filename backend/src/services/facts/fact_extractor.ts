import { getContractTypeConfig } from '../../config/contract_types/registry.js';

export interface ExtractedFactsResult {
  contractTypeCode: string;
  facts: Record<string, any>;
  missingRequired: string[];
  missingRecommended: string[];
  isComplete: boolean;
}

/**
 * Extracts and strictly validates structured facts against the authoritative contract type schema.
 * Missing fields remain explicitly null/undefined—never fabricated or hallucinated.
 */
export function extractAndValidateFacts(
  contractTypeCode: string,
  rawFacts: Record<string, any>
): ExtractedFactsResult {
  const config = getContractTypeConfig(contractTypeCode);
  const normalizedFacts: Record<string, any> = { ...rawFacts };

  if (!config) {
    return {
      contractTypeCode,
      facts: normalizedFacts,
      missingRequired: [],
      missingRecommended: [],
      isComplete: true
    };
  }

  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  for (const field of config.questionnaire) {
    const val = getNestedValue(normalizedFacts, field.key);
    const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');

    if (isEmpty) {
      if (field.required === 'REQUIRED') {
        missingRequired.push(field.key);
      } else if (field.required === 'RECOMMENDED') {
        missingRecommended.push(field.key);
      }
    }
  }

  return {
    contractTypeCode,
    facts: normalizedFacts,
    missingRequired,
    missingRecommended,
    isComplete: missingRequired.length === 0
  };
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[path] !== undefined) return obj[path];

  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

import { ContractTypeConfig } from './contract_type_base.js';
import { ndaConfig } from './nda.config.js';
import { employmentConfig } from './employment.config.js';
import { serviceConfig } from './service.config.js';
import { saasConfig } from './saas.config.js';
import { consultingConfig } from './consulting.config.js';
import { mouConfig } from './mou.config.js';
import { vendorConfig } from './vendor.config.js';
import { partnershipConfig } from './partnership.config.js';
import { internshipConfig } from './internship.config.js';
import { leaseConfig } from './lease.config.js';

export const CONTRACT_TYPES_REGISTRY: Record<string, ContractTypeConfig> = {
  NDA: ndaConfig,
  EMPLOYMENT: employmentConfig,
  SERVICE: serviceConfig,
  SAAS: saasConfig,
  CONSULTING: consultingConfig,
  MOU: mouConfig,
  VENDOR: vendorConfig,
  PARTNERSHIP: partnershipConfig,
  INTERNSHIP: internshipConfig,
  LEASE: leaseConfig,
};

export function getAllContractTypes(): ContractTypeConfig[] {
  return Object.values(CONTRACT_TYPES_REGISTRY);
}

export function getContractTypeConfig(code: string): ContractTypeConfig | null {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  return CONTRACT_TYPES_REGISTRY[upper] || null;
}

export function isSupportedContractType(code: string): boolean {
  return !!getContractTypeConfig(code);
}

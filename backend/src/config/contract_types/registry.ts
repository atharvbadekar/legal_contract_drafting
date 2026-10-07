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
import { legalNoticeConfig } from './legal_notice.config.js';
import { saleConfig } from './sale.config.js';

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
  LEGAL_NOTICE: legalNoticeConfig,
  SALE_AGREEMENT: saleConfig,
  SALE: saleConfig,
  EMPLOYMENT_AGREEMENT: employmentConfig,
  SERVICE_AGREEMENT: serviceConfig,
  RENTAL: leaseConfig,
  RENTAL_LEASE: leaseConfig,
  FREELANCE: consultingConfig,
  CONTRACTOR: consultingConfig,
  INDEPENDENT_CONTRACTOR: consultingConfig
};

export function getAllContractTypes(): ContractTypeConfig[] {
  // Return unique contract types
  const seen = new Set<string>();
  const list: ContractTypeConfig[] = [];
  for (const c of Object.values(CONTRACT_TYPES_REGISTRY)) {
    if (!seen.has(c.code)) {
      seen.add(c.code);
      list.push(c);
    }
  }
  return list;
}

export function getContractTypeConfig(code: string): ContractTypeConfig | null {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  return CONTRACT_TYPES_REGISTRY[upper] || null;
}

export function isSupportedContractType(code: string): boolean {
  return !!getContractTypeConfig(code);
}

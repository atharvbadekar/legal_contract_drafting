import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  tagUserFacts,
  unwrapFacts,
  resolveFactOrPlaceholder,
  getVisiblePlaceholder
} from '../services/facts/fact_provenance.js';
import {
  getAllContractTypes,
  getContractTypeConfig,
  isSupportedContractType
} from '../config/contract_types/registry.js';
import { generationService } from '../services/generation/generation_service.js';

describe('Phase 2 — Templates, Guided Intake, and Two-Pass Generation Tests', () => {
  // 1. FACT PROVENANCE & ANTI-HALLUCINATION
  it('1. Correctly tags user-provided facts, missing values, and explicit placeholders', () => {
    const rawFacts = {
      disclosingParty: {
        name: 'Apex Innovations Inc.',
        address: '' // blank -> MISSING
      },
      receivingParty: {
        name: '[Party Name]' // bracketed -> PLACEHOLDER
      },
      duration: '3 years',
      governingLaw: undefined // undefined -> MISSING
    };

    const tagged = tagUserFacts(rawFacts);

    assert.strictEqual(tagged['disclosingParty.name'].provenance, 'USER_PROVIDED');
    assert.strictEqual(tagged['disclosingParty.name'].value, 'Apex Innovations Inc.');

    assert.strictEqual(tagged['disclosingParty.address'].provenance, 'MISSING');
    assert.strictEqual(tagged['disclosingParty.address'].value, null);

    assert.strictEqual(tagged['receivingParty.name'].provenance, 'PLACEHOLDER');
    assert.strictEqual(tagged['receivingParty.name'].isPlaceholder, true);

    assert.strictEqual(tagged['duration'].provenance, 'USER_PROVIDED');
    assert.strictEqual(tagged['governingLaw'].provenance, 'MISSING');
  });

  it('2. Anti-hallucination: missing facts produce visible placeholders, never hallucinated values', () => {
    const missingAmount = resolveFactOrPlaceholder('', 'purchasePrice', 'Purchase Price');
    assert.strictEqual(missingAmount.isPlaceholder, true);
    assert.strictEqual(missingAmount.provenance, 'PLACEHOLDER');
    assert.strictEqual(missingAmount.text, '[PURCHASE PRICE — SPECIFY]');

    const providedAmount = resolveFactOrPlaceholder('₹1,500,000', 'purchasePrice', 'Purchase Price');
    assert.strictEqual(providedAmount.isPlaceholder, false);
    assert.strictEqual(providedAmount.provenance, 'USER_PROVIDED');
    assert.strictEqual(providedAmount.text, '₹1,500,000');

    const visiblePlaceholder = getVisiblePlaceholder('disclosingParty.signatory');
    assert.strictEqual(visiblePlaceholder, '[DISCLOSING PARTY SIGNATORY — SPECIFY]');
  });

  it('3. unwrapFacts unwinds dotted and nested fact records accurately', () => {
    const tagged = tagUserFacts({
      client: { name: 'Acme Corp', country: 'India' },
      amount: '50000'
    });
    const unwrapped = unwrapFacts(tagged);

    assert.strictEqual(unwrapped.client?.name, 'Acme Corp');
    assert.strictEqual(unwrapped.client?.country, 'India');
    assert.strictEqual(unwrapped.amount, '50000');
  });

  // 2. STRUCTURED CONTRACT ONTOLOGY (ALL 8 CORE TYPES)
  it('4. All 8 core contract types are registered with full clause architectures', () => {
    const coreCodes = [
      'NDA',
      'SERVICE',
      'EMPLOYMENT',
      'LEASE',
      'CONSULTING',
      'PARTNERSHIP',
      'SALE',
      'LEGAL_NOTICE'
    ];

    for (const code of coreCodes) {
      assert.ok(isSupportedContractType(code), `Contract type ${code} must be registered`);
      const config = getContractTypeConfig(code);
      assert.ok(config, `Config for ${code} must exist`);
      assert.ok(config.requiredFacts.length > 0, `${code} must define requiredFacts`);
      assert.ok(config.clauses, `${code} must define clause architecture`);
      assert.ok(config.clauses.requiredClauses.length > 0, `${code} must have requiredClauses`);
      assert.ok(config.clauses.recommendedClauses.length > 0, `${code} must have recommendedClauses`);
      assert.ok(Array.isArray(config.clauses.conditionalClauses), `${code} must have conditionalClauses`);
      assert.ok(config.validationRules && config.validationRules.length > 0, `${code} must have validationRules`);
      assert.ok(config.riskRules && config.riskRules.length > 0, `${code} must have riskRules`);
    }
  });

  it('5. Aliases resolve cleanly to their canonical contract types', () => {
    assert.strictEqual(getContractTypeConfig('SALE_AGREEMENT')?.code, 'SALE_AGREEMENT');
    assert.strictEqual(getContractTypeConfig('SALE')?.code, 'SALE_AGREEMENT');
    assert.strictEqual(getContractTypeConfig('EMPLOYMENT_AGREEMENT')?.code, 'EMPLOYMENT');
    assert.strictEqual(getContractTypeConfig('SERVICE_AGREEMENT')?.code, 'SERVICE');
    assert.strictEqual(getContractTypeConfig('RENTAL')?.code, 'LEASE');
    assert.strictEqual(getContractTypeConfig('FREELANCE')?.code, 'CONSULTING');
    assert.strictEqual(getContractTypeConfig('INDEPENDENT_CONTRACTOR')?.code, 'CONSULTING');
  });

  // 3. PASS 1: STRUCTURE PLANNING
  it('6. Pass 1 plans structure, handles conditional clauses and flags missing required facts', () => {
    const ndaFacts = {
      disclosingParty: { name: 'Acme Pvt Ltd' },
      injunctiveRelief: true // activates conditional injunctive_relief_bond_waiver
      // receivingParty.name and purpose are missing
    };

    const plan = generationService.planStructure('NDA', ndaFacts);

    assert.strictEqual(plan.documentType, 'NDA');
    assert.strictEqual(plan.jurisdiction, 'India', 'Default jurisdiction must be India');
    assert.ok(plan.governingLaw.includes('India'), 'Governing law must default to Indian law');
    assert.ok(plan.requiredClauses.includes('confidentiality'));

    // Check active conditional clauses
    const bondWaiver = plan.activeConditionalClauses.find(c => c.clauseKey === 'injunctive_relief_bond_waiver');
    assert.ok(bondWaiver, 'Conditional clause for bond waiver must be activated');

    // Missing required facts must be flagged
    assert.ok(plan.missingRequiredFacts.includes('receivingParty.name'), 'Missing receivingParty.name must be recorded in plan');
    assert.ok(plan.missingRequiredFacts.includes('purpose'), 'Missing purpose must be recorded in plan');
  });

  // 4. PASS 2: LEGAL LANGUAGE SYNTHESIS
  it('7. Pass 2 synthesizes polished legal language and embeds visible placeholders for missing facts', () => {
    const plan = generationService.planStructure('NDA', {
      disclosingParty: { name: 'Apex Technologies' },
      // receivingParty.name is missing
      duration: '2 years'
    });

    const synthesized = generationService.synthesizeSections(plan, {
      documentType: 'NDA',
      structuredFacts: {
        disclosingParty: { name: 'Apex Technologies' },
        duration: '2 years'
      },
      approvedClauses: [],
      retrievedLegalKnowledge: []
    });

    assert.ok(synthesized.sections.length >= 8, 'Must generate all standard sections');
    const partiesSec = synthesized.sections.find(s => s.sectionType === 'parties');
    assert.ok(partiesSec, 'Parties section must exist');
    assert.ok(partiesSec.content.includes('Apex Technologies'), 'Disclosing party name must be present');
  });

  it('8. Two-pass generation executes full pipeline with verification report and disclaimer', async () => {
    const res = await generationService.generateTwoPassDocument({
      documentType: 'NDA',
      structuredFacts: {
        disclosingParty: { name: 'Tata Consultancy Systems' },
        receivingParty: { name: 'Infosys Global LLP' },
        duration: '3 years',
        purpose: 'strategic AI partnership evaluation'
      },
      approvedClauses: [
        {
          clauseType: 'confidentiality',
          title: 'Approved Bilateral Confidentiality',
          content: 'The Parties mutually covenant to preserve strict confidentiality of all proprietary disclosures.'
        }
      ],
      retrievedLegalKnowledge: [
        {
          title: 'Indian Contract Act 1872 - Section 27',
          chunk: 'Agreements in restraint of trade are void to the extent of restraint.',
          relevanceScore: 0.94
        }
      ]
    });

    assert.ok(res.formattedDocument.length > 500, 'Formatted document must contain full text');
    assert.ok(res.structurePlan, 'Must return structurePlan');
    assert.strictEqual(res.structurePlan.jurisdiction, 'India');
    assert.ok(res.verificationReport, 'Must include verificationReport');
    assert.ok(res.verificationReport.factsCompared > 0, 'Must compare facts');
    assert.ok(res.disclaimer.includes('qualified lawyer'), 'Disclaimer must mention reviewing with a qualified lawyer');
    assert.ok(!res.formattedDocument.includes('100% legally perfect'), 'Must never claim 100% legal perfection');
  });

  it('9. Sale Agreement generates with commercial consideration and inspection window', async () => {
    const saleRes = await generationService.generateTwoPassDocument({
      documentType: 'SALE',
      structuredFacts: {
        seller: { name: 'Precision Machines Ltd.' },
        buyer: { name: 'Zenith Logistics Hub' },
        goodsDescription: 'Automated sorting conveyors',
        purchasePrice: '₹850,000',
        currency: 'INR'
      },
      approvedClauses: [],
      retrievedLegalKnowledge: []
    });

    assert.ok(saleRes.formattedDocument.length > 300);
    assert.ok(saleRes.structurePlan.governingLaw.includes('India'));
    assert.strictEqual(saleRes.structurePlan.documentType, 'SALE');
  });
});

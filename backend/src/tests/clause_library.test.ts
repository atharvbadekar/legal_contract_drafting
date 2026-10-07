import { describe, it } from 'node:test';
import assert from 'node:assert';
import { clauseSelector, BUILTIN_APPROVED_CLAUSES } from '../services/clauses/clause_selector.js';

describe('Phase 3 — Clause Library & Two-Stage Selection Tests', () => {
  it('1. Deterministic condition matching: selects mutual confidentiality when isMutual=true', async () => {
    const results = await clauseSelector.selectClauses({
      contractType: 'NDA',
      clauseType: 'confidentiality',
      facts: { isMutual: true }
    });

    assert.ok(results.length > 0, 'Should find confidentiality clause for NDA');
    const selected = results[0];
    assert.strictEqual(selected.variant, 'mutual', 'Should select mutual variant when isMutual is true');
    assert.strictEqual(selected.status, 'APPROVED', 'Only APPROVED clauses can be selected');
    assert.ok(selected.content.includes('Each Party') || selected.content.includes('Both Parties'), 'Content must reflect mutual obligations');
  });

  it('2. Deterministic condition matching: selects one-way confidentiality when isMutual=false', async () => {
    const results = await clauseSelector.selectClauses({
      contractType: 'NDA',
      clauseType: 'confidentiality',
      facts: { isMutual: false }
    });

    assert.ok(results.length > 0, 'Should find confidentiality clause for NDA');
    const selected = results[0];
    assert.strictEqual(selected.variant, 'one-way', 'Should select one-way variant when isMutual is false');
    assert.strictEqual(selected.status, 'APPROVED', 'Only APPROVED clauses can be selected');
    assert.ok(selected.content.includes('Receiving Party'), 'Content must reflect unilateral obligations');
  });

  it('3. Preferred variant matching: honors explicit variant preference over default', async () => {
    const results = await clauseSelector.selectClauses({
      contractType: 'NDA',
      clauseType: 'confidentiality',
      preferredVariant: 'mutual'
    });

    assert.ok(results.length > 0);
    assert.strictEqual(results[0].variant, 'mutual');
    assert.ok(results[0].matchReasons.some(r => r.includes("variant 'mutual'")));
  });

  it('4. Strict curation rule: draft and archived clauses are strictly excluded', async () => {
    // Check built-in corpus ensures only APPROVED clauses are present
    const nonApproved = BUILTIN_APPROVED_CLAUSES.filter(c => c.status !== 'APPROVED');
    assert.strictEqual(nonApproved.length, 0, 'Builtin clause store must contain ONLY APPROVED clauses');

    // Selection query for any contract type
    const results = await clauseSelector.selectClauses({
      contractType: 'NDA',
      facts: {}
    });

    for (const clause of results) {
      assert.strictEqual(clause.status, 'APPROVED', `Clause ${clause.title} must be strictly APPROVED`);
    }
  });

  it('5. Builtin approved clause library covers all 8 core contract types', () => {
    const expectedContractTypes = [
      'NDA',
      'SERVICE',
      'EMPLOYMENT',
      'LEASE',
      'CONSULTING',
      'PARTNERSHIP',
      'SALE',
      'LEGAL_NOTICE'
    ];

    for (const type of expectedContractTypes) {
      const typeClauses = BUILTIN_APPROVED_CLAUSES.filter(c => {
        const docType = c.documentType.toUpperCase();
        return docType === type || (type === 'SALE' && docType === 'SALE');
      });

      assert.ok(
        typeClauses.length > 0,
        `Builtin clause library must include approved starter clauses for contract type: ${type}`
      );
      assert.ok(
        typeClauses.every(c => c.status === 'APPROVED'),
        `All clauses for ${type} must have APPROVED status`
      );
    }
  });

  it('6. Clause metadata integrity: requiredStatus, riskLevel, and jurisdiction validation', () => {
    for (const clause of BUILTIN_APPROVED_CLAUSES) {
      assert.ok(['REQUIRED', 'RECOMMENDED', 'CONDITIONAL', 'OPTIONAL'].includes(clause.requiredStatus),
        `Clause ${clause.title} has invalid requiredStatus: ${clause.requiredStatus}`);
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(clause.riskLevel),
        `Clause ${clause.title} has invalid riskLevel: ${clause.riskLevel}`);
      assert.strictEqual(clause.jurisdiction, 'India',
        `Clause ${clause.title} should default to India jurisdiction`);
      assert.strictEqual(clause.version >= 1, true,
        `Clause ${clause.title} version must be >= 1`);
      assert.ok(clause.content.length > 20,
        `Clause ${clause.title} content must be substantial operative text`);
    }
  });

  it('7. Multi-section clause retrieval: selects distinct clauses per taxonomy key', async () => {
    const results = await clauseSelector.selectClauses({
      contractType: 'NDA',
      facts: { isMutual: true },
      limit: 10
    });

    assert.ok(results.length >= 2, 'Should retrieve multiple clauses for NDA');
    const clauseTypes = results.map(r => r.clauseType);
    const uniqueTypes = new Set(clauseTypes);
    assert.strictEqual(clauseTypes.length, uniqueTypes.size, 'Each selected clause should represent a distinct section taxonomy key');
  });

  it('8. Resilient fallback: returns empty array or graceful fallback for unknown contract type', async () => {
    const results = await clauseSelector.selectClauses({
      contractType: 'SPACE_TRAVEL_ACCORD_1899',
      clauseType: 'propulsion_liability'
    });

    assert.strictEqual(Array.isArray(results), true);
    assert.strictEqual(results.length, 0, 'Unknown contract type returns empty list without throwing');
  });
});

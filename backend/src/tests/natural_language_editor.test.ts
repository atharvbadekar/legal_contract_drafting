import { describe, it } from 'node:test';
import assert from 'node:assert';
import { naturalLanguageEditor } from '../services/editor/natural_language_editor.js';

describe('Phase 4 — Document Editor & Natural-Language Editing Engine Tests', () => {
  const sampleContract = `# NON-DISCLOSURE AGREEMENT

This Agreement is entered into by and between Alpha Technologies Private Limited ("Disclosing Party") and Beta Solutions LLP ("Receiving Party").

---

## 1. CONFIDENTIALITY OBLIGATIONS

The Receiving Party agrees to maintain all Confidential Information received from the Disclosing Party in strict confidence for a term of 2 years.

---

## 2. GOVERNING LAW AND JURISDICTION

This Agreement shall be governed by and construed in accordance with the laws of India, and the courts of Mumbai shall have exclusive jurisdiction.

---

## 3. SIGNATURES

IN WITNESS WHEREOF, the Parties have executed this Agreement.
`;

  it('1. Global rename (replace_all): case-insensitively replaces entity and updates structured facts', () => {
    const operations = [
      { op: 'replace_all' as const, old: 'Beta Solutions LLP', new: 'Gamma Innovations Pvt Ltd' },
      { op: 'update_fact' as const, factKey: 'receivingParty', factValue: 'Gamma Innovations Pvt Ltd' }
    ];

    const result = naturalLanguageEditor.applyOperations(sampleContract, operations, {
      disclosingParty: 'Alpha Technologies Private Limited',
      receivingParty: 'Beta Solutions LLP'
    });

    assert.ok(result.updatedContent.includes('Gamma Innovations Pvt Ltd'), 'New entity name must be present');
    assert.ok(!result.updatedContent.includes('Beta Solutions LLP'), 'Old entity name must be completely replaced');
    assert.strictEqual(result.updatedFacts.receivingParty, 'Gamma Innovations Pvt Ltd', 'Structured fact must be synchronized');
    assert.ok(result.changes.length >= 2, 'Should record replace_all and update_fact changes');
  });

  it('2. Duration update: replaces contract term and synchronizes facts', () => {
    const operations = [
      { op: 'replace_all' as const, old: '2 years', new: '3 years' },
      { op: 'update_fact' as const, factKey: 'duration', factValue: '3 years' }
    ];

    const result = naturalLanguageEditor.applyOperations(sampleContract, operations, { duration: '2 years' });

    assert.ok(result.updatedContent.includes('term of 3 years'), 'Updated duration must be reflected');
    assert.ok(!result.updatedContent.includes('term of 2 years'), 'Old duration must be removed');
    assert.strictEqual(result.updatedFacts.duration, '3 years');
  });

  it('3. Mutual confidentiality conversion (replace_in_section): transforms unilateral obligations to reciprocal covenants', () => {
    const mutualClause = `## 1. CONFIDENTIALITY OBLIGATIONS\n\nEach Party covenants to hold all Confidential Information disclosed by the other Party in strict confidence and shall exercise reasonable care. Neither Party shall disclose the other Party's Confidential Information without prior written consent.`;
    
    const operations = [
      {
        op: 'replace_in_section' as const,
        sectionTitle: 'CONFIDENTIALITY',
        new: mutualClause
      },
      { op: 'update_fact' as const, factKey: 'isMutual', factValue: true }
    ];

    const result = naturalLanguageEditor.applyOperations(sampleContract, operations, { isMutual: false });

    assert.ok(result.updatedContent.includes('Each Party covenants to hold all Confidential Information'), 'Must include reciprocal covenants');
    assert.strictEqual(result.updatedFacts.isMutual, true);
    assert.ok(result.updatedContent.includes('## 2. GOVERNING LAW AND JURISDICTION'), 'Subsequent sections must remain intact');
  });

  it('4. Clause insertion (insert_clause): places new operative clause cleanly before signatures', () => {
    const nonSolicitation = `## 2A. NON-SOLICITATION COVENANT\n\nNeither Party shall directly or indirectly solicit, recruit, or hire any personnel of the other Party for a period of twelve (12) months.`;

    const operations = [
      {
        op: 'insert_clause' as const,
        sectionTitle: 'NON-SOLICITATION COVENANT',
        new: nonSolicitation
      }
    ];

    const result = naturalLanguageEditor.applyOperations(sampleContract, operations, {});

    assert.ok(result.updatedContent.includes('NON-SOLICITATION COVENANT'), 'Inserted clause must be present');
    const nonSolicitIdx = result.updatedContent.indexOf('NON-SOLICITATION COVENANT');
    const sigsIdx = result.updatedContent.indexOf('SIGNATURES');
    assert.ok(nonSolicitIdx < sigsIdx, 'Inserted clause must appear before the execution/signature block');
  });

  it('5. Clause deletion (delete_clause): removes specified section without damaging surrounding structure', () => {
    const operations = [
      {
        op: 'delete_clause' as const,
        sectionTitle: 'GOVERNING LAW'
      }
    ];

    const result = naturalLanguageEditor.applyOperations(sampleContract, operations, {});

    assert.ok(!result.updatedContent.includes('GOVERNING LAW AND JURISDICTION'), 'Targeted section must be removed');
    assert.ok(result.updatedContent.includes('CONFIDENTIALITY OBLIGATIONS'), 'Unrelated preceding section must remain');
    assert.ok(result.updatedContent.includes('SIGNATURES'), 'Unrelated succeeding section must remain');
  });

  it('6. Ambiguity detection: asks clarifying question for underspecified party name change', async () => {
    const plan = await naturalLanguageEditor.planEdit({
      instruction: 'change the party name to Acme Global Corp',
      content: sampleContract,
      documentType: 'NDA',
      structuredFacts: {
        disclosingParty: { name: 'Alpha Technologies Private Limited' },
        receivingParty: { name: 'Beta Solutions LLP' }
      }
    });

    assert.strictEqual(plan.isAmbiguous, true, 'Must detect underspecified party rename');
    assert.ok(plan.clarifyingQuestion, 'Must provide a clarifying question');
    assert.ok(plan.clarifyingQuestion.includes('Acme Global Corp'));
    assert.ok(plan.suggestedOptions && plan.suggestedOptions.length > 0, 'Must provide options');
    assert.strictEqual(plan.operations.length, 0, 'No operations should be executed when ambiguous');
  });

  it('7. Disambiguation resolution: accepts clarification answer and executes targeted edit', async () => {
    const plan = await naturalLanguageEditor.planEdit({
      instruction: 'change the party name to Acme Global Corp',
      content: sampleContract,
      documentType: 'NDA',
      structuredFacts: {
        disclosingParty: { name: 'Alpha Technologies Private Limited' },
        receivingParty: { name: 'Beta Solutions LLP' }
      },
      clarificationAnswer: 'change receiving party instead of Beta Solutions LLP'
    });

    assert.strictEqual(plan.isAmbiguous, false, 'Must not be ambiguous when clarification answer is supplied');
    assert.ok(plan.previewContent.includes('Acme Global Corp'), 'Preview content must reflect resolved edit');
    assert.ok(plan.operations.length > 0, 'Must produce structured operations');
  });

  it('8. Unified diff computation: generates diff with line markers (+/-) and changed section identification', async () => {
    const plan = await naturalLanguageEditor.planEdit({
      instruction: 'make the term 3 years',
      content: sampleContract,
      documentType: 'NDA',
      structuredFacts: { duration: '2 years' }
    });

    assert.strictEqual(plan.isAmbiguous, false);
    assert.ok(plan.diffSummary.additionsCount > 0, 'Diff must track additions');
    assert.ok(plan.diffSummary.deletionsCount > 0, 'Diff must track deletions');
    assert.ok(plan.diffSummary.unifiedDiff.includes('+'), 'Diff must contain + markers');
    assert.ok(plan.diffSummary.unifiedDiff.includes('-'), 'Diff must contain - markers');
  });
});

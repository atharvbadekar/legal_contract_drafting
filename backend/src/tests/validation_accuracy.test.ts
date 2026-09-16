import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationEngine } from '../services/validation/validation_engine.js';
import { stripTemplateInstructions, isInstructionOrPlaceholder } from '../services/documents/document_structure.js';

describe('Legal Validation Accuracy & False Positive Elimination Test Suite', () => {

  // =========================================================================
  // TEST 1: Completed NDA with template instruction text
  // =========================================================================
  it('Test 1: Valid NDA with template instruction prompts must NOT flag payment, IP, or timeframe errors', async () => {
    const facts = {
      disclosingParty: { name: 'Acme Technologies Pvt Ltd' },
      receivingParty: { name: 'Beta Solutions Inc' },
      duration: '3 years',
      governingLaw: 'Delaware'
    };

    const docContent = `# MUTUAL NON-DISCLOSURE AGREEMENT

> Note: Specify the exact consideration amount or obligations in commercial contracts.
[Specify the exact consideration amount and payment schedule]
<!-- Instructions: Ensure all intellectual property and deliverables definitions are checked -->

## 1. Parties
This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between Acme Technologies Pvt Ltd ("Disclosing Party") and Beta Solutions Inc ("Receiving Party").

---

## 2. Definition of Confidential Information
"Confidential Information" includes all technical, commercial, financial, and proprietary data, software modules, source code, inventions, and deliverables disclosed by either party.

---

## 3. Non-Disclosure Obligations
Receiving Party shall hold in strict confidence all Confidential Information and shall not disclose it without prior written consent.

---

## 4. Exceptions and Exclusions
Confidential Information does not include information that is publicly known, already known without obligation of confidentiality, or independently developed.

---

## 5. Permitted Disclosures
Disclosure is permitted to employees and legal advisors with a strict need to know.

---

## 6. Return or Destruction of Information
Upon written request or termination, Receiving Party shall return or destroy all confidential materials within 7 days.

---

## 7. Term and Survival
This Agreement shall remain in effect for a period of 3 years from the Effective Date. Either party may terminate this Agreement upon 30 days written notice.

---

## 8. Remedies & Injunctive Relief
Breach of this Agreement may cause irreparable harm for which monetary damages alone would be inadequate compensation, entitling the non-breaching party to injunctive relief.

---

## 9. Governing Law and Dispute Resolution
This Agreement shall be governed by and construed in accordance with the laws of Delaware.

---

## 10. Execution & Signatures
IN WITNESS WHEREOF, the authorized signatories have executed this Agreement.
Acme Technologies Pvt Ltd: _________________
Beta Solutions Inc: _________________`;

    const sections = docContent.split('---').map((block, idx) => ({
      sectionType: `sec_${idx}`,
      title: block.match(/##\s+([^\n]+)/)?.[1] || `Section ${idx + 1}`,
      content: block.trim()
    }));

    const result = await validationEngine.validate('NDA', sections, facts, docContent);

    // 1. Zero false Payment Amount flags
    const paymentIssues = result.allIssues.filter(i => i.type === 'MISSING_PAYMENT_AMOUNT');
    assert.strictEqual(paymentIssues.length, 0, 'Must NOT flag MISSING_PAYMENT_AMOUNT on an NDA with template text');

    // 2. Zero false IP Ownership flags
    const ipIssues = result.allIssues.filter(i => i.type === 'MISSING_IP_OWNERSHIP');
    assert.strictEqual(ipIssues.length, 0, 'Must NOT flag MISSING_IP_OWNERSHIP on an NDA');

    // 3. Zero false Timeframe Conflict flags (7 days return vs 30 days notice)
    const conflictIssues = result.allIssues.filter(i => i.type === 'CONFLICTING_TERMS');
    assert.strictEqual(conflictIssues.length, 0, 'Must NOT flag CONFLICTING_TERMS between return of materials and termination notice');

    // 4. Zero NLP Service Offline defect card
    const nlpOfflineIssues = result.allIssues.filter(i => i.type === 'NLP_SERVICE_OFFLINE' || i.description?.toLowerCase().includes('nlp service offline'));
    assert.strictEqual(nlpOfflineIssues.length, 0, 'Must NOT include NLP_SERVICE_OFFLINE as a legal issue card');

    // 5. Score >= 90 and PASSED
    assert.ok(result.overallScore >= 90, `Score must be >= 90 for a complete valid NDA, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'PASSED', 'Valid NDA must pass validation');
  });

  // =========================================================================
  // TEST 2: Template instruction stripper
  // =========================================================================
  it('Test 2: stripTemplateInstructions accurately removes prompts while leaving contract text intact', () => {
    const raw = `
> Note: Specify the exact consideration amount or payment schedule.
> Instructions: Fill in all bracketed fields.
[Specify the exact consideration amount]
<insert contractor address here>
{specify governing jurisdiction}
/* Multi-line comment about drafting */
<!-- HTML comment about legal precedents -->
Actual contract covenant: Receiving Party shall maintain confidentiality.
`;

    const cleaned = stripTemplateInstructions(raw);
    assert.ok(!cleaned.includes('> Note:'));
    assert.ok(!cleaned.includes('Instructions:'));
    assert.ok(!cleaned.includes('[Specify the exact consideration'));
    assert.ok(!cleaned.includes('<insert contractor'));
    assert.ok(!cleaned.includes('{specify governing'));
    assert.ok(!cleaned.includes('/* Multi-line'));
    assert.ok(!cleaned.includes('<!-- HTML'));
    assert.ok(cleaned.includes('Actual contract covenant: Receiving Party shall maintain confidentiality.'));

    assert.strictEqual(isInstructionOrPlaceholder('> Note: Review terms'), true);
    assert.strictEqual(isInstructionOrPlaceholder('[Specify consideration]'), true);
    assert.strictEqual(isInstructionOrPlaceholder('<!-- comments -->'), true);
    assert.strictEqual(isInstructionOrPlaceholder('Receiving Party shall keep secret.'), false);
  });

  // =========================================================================
  // TEST 3: Incomplete NDA with genuine defects
  // =========================================================================
  it('Test 3: Incomplete NDA detects genuine defects without inventing false payment/IP flags', async () => {
    const facts = {
      disclosingParty: { name: 'Auth Corp Inc' },
      receivingParty: { name: 'Target Partner LLC' },
      duration: '2 years',
      governingLaw: 'California'
    };

    // Document has: wrong party name (Wrong Name Ltd), wrong duration (5 years), no signatures
    const docContent = `## 1. Parties
This Agreement is entered into by Wrong Name Ltd and Target Partner LLC.

---

## 2. Term
This Agreement shall remain in force for 5 years.`;

    const sections = [
      { sectionType: 'parties', title: '1. Parties', content: 'This Agreement is entered into by Wrong Name Ltd and Target Partner LLC.' },
      { sectionType: 'duration', title: '2. Term', content: 'This Agreement shall remain in force for 5 years.' }
    ];

    const result = await validationEngine.validate('NDA', sections, facts, docContent);

    // Must detect: Party mismatch, Duration mismatch, Missing signatures
    const partyMismatch = result.allIssues.find(i => i.type === 'PARTY_MISMATCH');
    assert.ok(partyMismatch, 'Must detect Party Mismatch');

    const durationMismatch = result.allIssues.find(i => i.type === 'FACT_MISMATCH' && i.section === 'Duration');
    assert.ok(durationMismatch, 'Must detect Duration Mismatch');

    const missingSigs = result.allIssues.find(i => i.type === 'MISSING_SIGNATURE_BLOCK');
    assert.ok(missingSigs, 'Must detect Missing Signatures');

    // Must NOT flag payment or IP
    assert.strictEqual(result.allIssues.filter(i => i.type === 'MISSING_PAYMENT_AMOUNT').length, 0);
    assert.strictEqual(result.allIssues.filter(i => i.type === 'MISSING_IP_OWNERSHIP').length, 0);
  });

  // =========================================================================
  // TEST 4: Services agreement with real missing payment
  // =========================================================================
  it('Test 4: Services agreement with affirmative payment obligation but no amount is flagged as HIGH', async () => {
    const facts = {
      client: 'Acme Inc',
      serviceProvider: 'Dev Studio'
    };

    const docContent = `## 1. Services
Dev Studio shall perform engineering services.

---

## 2. Compensation
Client shall pay Service Provider fee for all completed deliverables upon invoice.`;

    const sections = [
      { sectionType: 'services', title: '1. Services', content: 'Dev Studio shall perform engineering services.' },
      { sectionType: 'compensation', title: '2. Compensation', content: 'Client shall pay Service Provider fee for all completed deliverables upon invoice.' }
    ];

    const result = await validationEngine.validate('SERVICES_AGREEMENT', sections, facts, docContent);
    const paymentIssue = result.allIssues.find(i => i.type === 'MISSING_PAYMENT_AMOUNT');

    assert.ok(paymentIssue, 'Must detect MISSING_PAYMENT_AMOUNT');
    assert.strictEqual(paymentIssue?.severity, 'HIGH');
    assert.strictEqual(paymentIssue?.canAutoFix, false);
    assert.strictEqual(paymentIssue?.mode, 'MANUAL');
  });

  // =========================================================================
  // TEST 5: Services agreement with custom deliverables and missing IP assignment
  // =========================================================================
  it('Test 5: Services agreement commissioning custom work without IP assignment is flagged as MEDIUM', async () => {
    const facts = {
      client: 'Acme Inc',
      serviceProvider: 'Dev Studio'
    };

    const docContent = `## 1. Scope of Work
Contractor shall create custom software modules and deliverables for Client.

---

## 2. Delivery
All custom deliverables will be provided via source code repository.`;

    const sections = [
      { sectionType: 'scope', title: '1. Scope of Work', content: 'Contractor shall create custom software modules and deliverables for Client.' },
      { sectionType: 'delivery', title: '2. Delivery', content: 'All custom deliverables will be provided via source code repository.' }
    ];

    const result = await validationEngine.validate('SERVICES_AGREEMENT', sections, facts, docContent);
    const ipIssue = result.allIssues.find(i => i.type === 'MISSING_IP_OWNERSHIP');

    assert.ok(ipIssue, 'Must detect MISSING_IP_OWNERSHIP for custom commissioned deliverables');
    assert.strictEqual(ipIssue?.severity, 'MEDIUM');
    assert.strictEqual(ipIssue?.canAutoFix, false);
    assert.strictEqual(ipIssue?.mode, 'MANUAL');
  });

  // =========================================================================
  // TEST 6: Timeframe conflict for same obligation
  // =========================================================================
  it('Test 6: Genuine conflicting timeframes for the same obligation (payment terms) are flagged', async () => {
    const facts = { client: 'Client A', vendor: 'Vendor B' };

    const docContent = `## 1. Invoices
Invoices shall be payable within 30 days of receipt.

---

## 2. Late Payment
If payment is not made within 60 days of invoice date, default interest shall apply.`;

    const sections = [
      { sectionType: 'payment', title: '1. Invoices', content: 'Invoices shall be payable within 30 days of receipt.' },
      { sectionType: 'payment', title: '2. Late Payment', content: 'If payment is not made within 60 days of invoice date, default interest shall apply.' }
    ];

    const result = await validationEngine.validate('SERVICES_AGREEMENT', sections, facts, docContent);
    const conflict = result.allIssues.find(i => i.type === 'CONFLICTING_TERMS');

    assert.ok(conflict, 'Must detect conflicting payment timeframes (30 days vs 60 days)');
    assert.strictEqual(conflict?.severity, 'HIGH');
  });

  // =========================================================================
  // TEST 7: Semantic analysis status
  // =========================================================================
  it('Test 7: Reports clean technical status for semantic analysis without polluting issues list', async () => {
    const facts = {
      disclosingParty: { name: 'Alpha' },
      receivingParty: { name: 'Beta' }
    };

    const sections = [
      { sectionType: 'parties', title: 'Parties', content: 'Alpha and Beta.' },
      { sectionType: 'signatures', title: 'Signatures', content: 'By: _____________' }
    ];

    const result = await validationEngine.validate('NDA', sections, facts);
    assert.ok(result.semanticStatus, 'Must return semanticStatus object');
    assert.ok(typeof result.semanticStatus.available === 'boolean');
    assert.ok(typeof result.semanticStatus.service === 'string');
    assert.ok(typeof result.semanticStatus.message === 'string');

    // Never contain NLP_SERVICE_OFFLINE in allIssues
    const hasOfflineIssue = result.allIssues.some(i => i.type === 'NLP_SERVICE_OFFLINE');
    assert.strictEqual(hasOfflineIssue, false, 'allIssues must NEVER include NLP_SERVICE_OFFLINE');
  });

  // =========================================================================
  // TEST 8: Document with Unresolved Placeholders ([Party Name], [Date], TBD)
  // =========================================================================
  it('Test 8: Document with unresolved placeholders must be flagged as HIGH and CANNOT receive 100% or PASSED', async () => {
    const facts = {
      disclosingParty: { name: 'Acme Technologies Pvt Ltd' },
      receivingParty: { name: 'Beta Solutions Inc' }
    };

    const docContent = `# NON-DISCLOSURE AGREEMENT
## 1. Parties
This Agreement is entered into on [Insert Date] by and between [Disclosing Party Name] and [Receiving Party Name].

## 2. Definition of Confidential Information
Confidential Information includes all proprietary technical data.

## 3. Obligations
Receiving Party shall hold in strict confidence all Confidential Information.

## 4. Term
The term of this agreement shall be TBD.

## 5. Execution
Acme Technologies Pvt Ltd: _________________
Beta Solutions Inc: _________________`;

    const sections = docContent.split('\n\n## ').map((s, idx) => ({
      sectionType: `sec_${idx}`,
      title: s.split('\n')[0].replace(/^#+\s*/, ''),
      content: s
    }));

    const result = await validationEngine.validate('NDA', sections, facts, docContent);

    const placeholderIssues = result.allIssues.filter(i => i.type === 'UNRESOLVED_PLACEHOLDER');
    assert.ok(placeholderIssues.length >= 2, `Must detect unresolved placeholders, found ${placeholderIssues.length}`);

    // Every placeholder must be HIGH severity
    for (const p of placeholderIssues) {
      assert.strictEqual(p.severity, 'HIGH', 'Unresolved placeholder must be HIGH severity');
    }

    // Hard cap: Cannot exceed 74% or be PASSED
    assert.ok(result.overallScore < 75, `Score must be < 75 with unresolved placeholders, got ${result.overallScore}`);
    assert.notStrictEqual(result.status, 'PASSED', 'Document with unresolved placeholders must NEVER be marked PASSED');
  });

  // =========================================================================
  // TEST 9: Severely Broken Document with Multiple Missing Required Fields & Clauses
  // =========================================================================
  it('Test 9: Severely broken document with missing required information must score <= 35% and FAILED', async () => {
    // Intentionally broken input: missing parties, missing dates, missing confidentiality clauses
    const brokenFacts = {};

    const brokenContent = `# AGREEMENT
This agreement is entered into by Disclosing Party and Receiving Party.
General information will be shared.`;

    const sections = [
      { sectionType: 'general', title: 'Preamble', content: brokenContent }
    ];

    const result = await validationEngine.validate('NDA', sections, brokenFacts, brokenContent);

    // High severity issues must be detected
    const highIssues = result.allIssues.filter(i => i.severity === 'HIGH');
    assert.ok(highIssues.length >= 4, `Must detect >= 4 high severity defects, found ${highIssues.length}`);

    // Score must be <= 35 and status must be FAILED
    assert.ok(result.overallScore <= 35, `Score must be <= 35% for severely broken document, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'FAILED', `Status must be FAILED for severely broken document, got ${result.status}`);
  });

  // =========================================================================
  // TEST 10: Incomplete NDA missing operative confidentiality obligations
  // =========================================================================
  it('Test 10: NDA missing operative non-disclosure covenant must flag MISSING_REQUIRED_CLAUSE with HIGH severity', async () => {
    const facts = {
      disclosingParty: { name: 'Acme Corp' },
      receivingParty: { name: 'Beta LLC' },
      duration: '2 years',
      governingLaw: 'New York'
    };

    // Preamble and term exist, but non-disclosure obligations are completely missing
    const docContent = `## 1. Parties
This Agreement is entered into by Acme Corp and Beta LLC.

## 2. Term
This Agreement is effective for 2 years from the Effective Date.

## 3. Governing Law
This Agreement is governed by the laws of New York.

## 4. Signatures
Acme Corp: _________________
Beta LLC: _________________`;

    const sections = [
      { sectionType: 'parties', title: '1. Parties', content: 'This Agreement is entered into by Acme Corp and Beta LLC.' },
      { sectionType: 'term', title: '2. Term', content: 'This Agreement is effective for 2 years from the Effective Date.' },
      { sectionType: 'governing_law', title: '3. Governing Law', content: 'This Agreement is governed by the laws of New York.' },
      { sectionType: 'signatures', title: '4. Signatures', content: 'Acme Corp: _________________\nBeta LLC: _________________' }
    ];

    const result = await validationEngine.validate('NDA', sections, facts, docContent);
    const missingObligation = result.allIssues.find(i =>
      i.type === 'MISSING_REQUIRED_CLAUSE' && i.title.includes('Non-Disclosure Obligations')
    );

    assert.ok(missingObligation, 'Must detect missing Non-Disclosure Obligations clause');
    assert.strictEqual(missingObligation?.severity, 'HIGH');
    assert.ok(result.overallScore < 75, 'Score must be < 75 when required confidentiality covenant is missing');
    assert.strictEqual(result.status, 'NEEDS_REVIEW');
  });

  // =========================================================================
  // TEST 11: Legal Notice missing required statutory demand and cure period
  // =========================================================================
  it('Test 11: Legal Notice missing demand and response period flags MISSING_REQUIRED_FIELD with HIGH severity', async () => {
    const emptyFacts = {};

    const noticeContent = `# LEGAL NOTICE
To: Defaulting Tenant
Subject: Notice of Default
You have breached our lease agreement.`;

    const sections = [
      { sectionType: 'header', title: 'Legal Notice', content: noticeContent }
    ];

    const result = await validationEngine.validate('LEGAL_NOTICE', sections, emptyFacts, noticeContent);

    const highIssues = result.allIssues.filter(i => i.severity === 'HIGH');
    assert.ok(highIssues.length >= 3, `Expected at least 3 high severity issues for defective notice, got ${highIssues.length}`);
    assert.ok(result.overallScore < 60, `Score must be < 60 for defective notice, got ${result.overallScore}`);
    assert.notStrictEqual(result.status, 'PASSED');
  });

  // =========================================================================
  // TEST 12: Deterministic engine is authoritative and offline-safe
  // =========================================================================
  it('Test 12: Deterministic engine functions authoritatively without requiring live NLP service', async () => {
    const facts = {
      disclosingParty: { name: 'Acme Technologies Pvt Ltd' },
      receivingParty: { name: 'Beta Solutions Inc' },
      duration: '3 years',
      governingLaw: 'Delaware'
    };

    const fullText = `## 1. Parties
This Mutual Non-Disclosure Agreement is by and between Acme Technologies Pvt Ltd and Beta Solutions Inc.

## 2. Definition of Confidential Information
Confidential Information includes all proprietary technical data and trade secrets.

## 3. Non-Disclosure Obligations
Receiving Party shall hold in strict confidence all Confidential Information and not disclose without written consent.

## 4. Exceptions and Exclusions
Confidential Information excludes publicly known information and prior knowledge.

## 5. Permitted Disclosures
Disclosure is permitted to employees and advisors with a need to know.

## 6. Return of Materials
Upon termination, Receiving Party shall return or destroy all confidential materials.

## 7. Term and Survival
This Agreement shall remain in effect for 3 years from the Effective Date.

## 8. Remedies & Relief
Breach may cause irreparable harm entitling the non-breaching party to injunctive relief.

## 9. Governing Law
This Agreement is governed by the laws of Delaware.

## 10. Execution & Signatures
In witness whereof, authorized representatives executed this agreement.
Acme Technologies Pvt Ltd: _________________
Beta Solutions Inc: _________________`;

    const sections = fullText.split('\n\n## ').map((s, idx) => ({
      sectionType: `sec_${idx}`,
      title: s.split('\n')[0].replace(/^#+\s*/, ''),
      content: s
    }));

    const result = await validationEngine.validate('NDA', sections, facts, fullText);

    // Deterministic validation verifies presence of parties, duration, law, confidentiality
    assert.ok(result.overallScore >= 90, `Complete valid agreement must score >= 90 even offline, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'PASSED');
    assert.strictEqual(result.deterministicIssues.filter(i => i.severity === 'HIGH').length, 0);
  });
});

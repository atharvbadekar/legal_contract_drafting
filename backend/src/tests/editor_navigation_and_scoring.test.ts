import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseDocumentStructure,
  locateTextInDocument,
  findLogicalInsertionPoint,
  applyDocumentPatch
} from '../services/documents/document_structure.js';
import {
  findNormalizedMatch,
  normalizeQuotesAndPunctuation,
  normalizeForMatching
} from '../utils/text_normalizer.js';
import { ValidationEngine } from '../services/validation/validation_engine.js';
import { ContractAnalyzer } from '../services/analyzer/contract_analyzer.js';

describe('Editor Navigation, Location Resolution & Scoring Regression Suite', () => {
  const validationEngine = new ValidationEngine();
  const contractAnalyzer = new ContractAnalyzer();

  it('Test 1: Repeated identical sentences across sections resolve to their exact section and context', () => {
    const docWithDuplicates = `# NON-DISCLOSURE AGREEMENT

## 1. PREAMBLE & SUMMARY
The Receiving Party shall maintain confidentiality in accordance with strict institutional guidelines.

## 2. DEFINITIONS
"Confidential Information" means all proprietary data.

## 3. CONFIDENTIALITY OBLIGATIONS
The Receiving Party shall maintain confidentiality for a period of two (2) years from the Effective Date.

## 4. REMEDIES
In case of breach, the Receiving Party shall maintain confidentiality regardless of ongoing dispute proceedings.
`;

    // 1. Search for "The Receiving Party shall maintain confidentiality" in Section 3
    const locatedSec3 = locateTextInDocument(
      docWithDuplicates,
      'The Receiving Party shall maintain confidentiality',
      'Confidentiality Obligations',
      { contextAfter: 'for a period of two (2) years' }
    );

    assert.strictEqual(locatedSec3.found, true);
    assert.strictEqual(locatedSec3.location.sectionTitle, '3. CONFIDENTIALITY OBLIGATIONS');
    assert.ok(locatedSec3.location.textRange, 'textRange must exist');
    assert.ok(locatedSec3.location.textRange.start > 150, 'Must not resolve to Section 1 duplicate');
    assert.strictEqual(
      docWithDuplicates.substring(locatedSec3.location.textRange.start, locatedSec3.location.textRange.end),
      'The Receiving Party shall maintain confidentiality'
    );

    // 2. Search for the same phrase in Section 4 (Remedies)
    const locatedSec4 = locateTextInDocument(
      docWithDuplicates,
      'The Receiving Party shall maintain confidentiality',
      'Remedies',
      { contextAfter: 'regardless of ongoing dispute' }
    );

    assert.strictEqual(locatedSec4.found, true);
    assert.strictEqual(locatedSec4.location.sectionTitle, '4. REMEDIES');
    assert.ok(locatedSec4.location.textRange!.start > locatedSec3.location.textRange!.start, 'Must resolve to Section 4');
  });

  it('Test 2: Missing clause navigation does NOT highlight document start (0-100) and sets honest isMissing true', () => {
    const draftContent = `# COMMERCIAL AGREEMENT

## 1. PARTIES
Acme Corp ("Client") and Beta LLC ("Provider").

## 2. SERVICES
Provider shall render design consulting services.

## 3. SIGNATURES
By: ____________________
Date: 2026-05-01
`;

    // Attempt to locate a non-existent clause: "Governing Law"
    const located = locateTextInDocument(
      draftContent,
      'Governing Law',
      'Governing Law',
      { nature: 'MISSING_CLAUSE' }
    );

    assert.strictEqual(located.found, false, 'Must be found: false');
    assert.strictEqual(located.location.isMissing, true, 'isMissing must be true');
    assert.strictEqual(located.evidence, '', 'Evidence must be empty string, never fake header slice');
    assert.strictEqual(located.location.textRange, undefined, 'textRange must be undefined for missing clauses');
    assert.ok(typeof located.location.insertionOffset === 'number', 'Must compute insertionOffset');
    assert.ok(located.location.insertionOffset! > 0, 'Insertion offset must not be 0');

    // Insertion point should logically be before the signature block
    const sigIndex = draftContent.indexOf('## 3. SIGNATURES');
    assert.strictEqual(located.location.insertionOffset, sigIndex, 'Must point right before signature block');
  });

  it('Test 3: Normalized matcher correctly resolves evidence across smart quotes, em-dashes, and non-breaking spaces', () => {
    // Document with smart quotes and em-dash
    const rawDocumentText = `The “Receiving Party” agrees not to disclose—under any circumstances—the proprietary data.`;

    // Search query with straight quotes and regular hyphen
    const query = `The "Receiving Party" agrees not to disclose-under any circumstances`;

    const match = findNormalizedMatch(rawDocumentText, query);
    assert.ok(match, 'Must match despite Unicode quote and dash variance');
    assert.strictEqual(match.start, 0);
    assert.strictEqual(
      rawDocumentText.substring(match.start, match.end),
      `The “Receiving Party” agrees not to disclose—under any circumstances`
    );
  });

  it('Test 4: Affirmative negation ("no payment or consideration is required") does NOT trigger payment defect', async () => {
    const proBonoAgreement = `# SERVICE AGREEMENT

## 1. PARTIES
Global Tech Ltd ("Client") and Open Source Foundation ("Provider").

## 2. SCOPE OF SERVICES
Provider shall provide advisory community support.

## 3. CONSIDERATION
The parties acknowledge that no payment or consideration is required under this Agreement. Services are provided free of charge and pro bono.

## 4. TERM & TERMINATION
This Agreement remains in effect for twelve (12) months. Either party may terminate upon thirty (30) days written notice.

## 5. GOVERNING LAW
Governing law shall be the laws of England and Wales.

## 6. SIGNATURES
Signed for Global Tech Ltd: _____________
Signed for Open Source Foundation: _____________
`;

    const parsed = parseDocumentStructure(proBonoAgreement);
    const sections = parsed.sections.map(s => ({
      sectionType: s.sectionType,
      title: s.title,
      content: s.content
    }));

    const result = await validationEngine.validate(
      'SERVICE_AGREEMENT',
      sections,
      {},
      [],
      proBonoAgreement
    );

    const paymentIssues = result.allIssues.filter(i =>
      i.type === 'MISSING_PAYMENT_AMOUNT' ||
      i.title.toLowerCase().includes('payment amount not specified')
    );

    assert.strictEqual(paymentIssues.length, 0, 'Express waiver must NOT trigger Missing Payment Amount issue');
  });

  it('Test 5: Overlapping defects are deduplicated in contract health scoring', async () => {
    // Agreement missing only the governing law clause and governing law fact
    const draft = `# MUTUAL NON-DISCLOSURE AGREEMENT

## 1. PARTIES
Alpha Corp ("Disclosing Party") and Omega Inc ("Receiving Party").

## 2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" refers to all non-public technical, business, financial, and operational information disclosed directly or indirectly.

## 3. CONFIDENTIALITY OBLIGATIONS
The Receiving Party shall hold all Confidential Information in strict confidence for three (3) years.

## 4. EXCLUSIONS
Confidential Information does not include information in the public domain or independently developed.

## 5. PERMITTED DISCLOSURES
Disclosures are permitted strictly to employees and advisors who have a need to know.

## 6. TERM & TERMINATION
This Agreement enters into force on 2026-01-01 and terminates after three (3) years.

## 7. RETURN OR DESTRUCTION OF MATERIALS
Upon written request, the Receiving Party shall promptly return or destroy all confidential materials within 14 days.

## 8. REMEDIES
Parties are entitled to seek injunctive relief without bond.

## 9. EXECUTION
In witness whereof, the parties have executed this Agreement.
Signed: Alpha Corp _______________
Signed: Omega Inc _______________
`;

    const parsed = parseDocumentStructure(draft);
    const sections = parsed.sections.map(s => ({
      sectionType: s.sectionType,
      title: s.title,
      content: s.content
    }));

    const result = await validationEngine.validate(
      'NDA',
      sections,
      {
        disclosingParty: { name: 'Alpha Corp' },
        receivingParty: { name: 'Omega Inc' },
        effectiveDate: '2026-01-01',
        duration: '3 years',
        purpose: 'Evaluation of commercial transaction'
        // governingLaw is deliberately omitted from facts AND text
      },
      [],
      draft
    );

    assert.ok(result.scoreBreakdown, 'Validation result must include scoreBreakdown');
    assert.strictEqual(result.scoreBreakdown.baseScore, 98);

    // Score deductions must contain deduction for governing law, but not double-counted as separate 18 + 18
    const lawDeductions = result.scoreBreakdown.deductions.filter((d: any) =>
      d.reason.toLowerCase().includes('governing law') || d.reason.toLowerCase().includes('law')
    );
    assert.ok(lawDeductions.length >= 1, 'Must deduct for missing governing law');

    // Total score should be ~74% (1 high defect cap), NOT degraded to failure < 50%
    assert.ok(result.overallScore >= 70 && result.overallScore <= 74, `Expected score ~70-74%, got ${result.overallScore}`);
  });

  it('Test 6: Deliberately incomplete/flawed NDA scores <= 35% and FAILED', async () => {
    const terribleDraft = `# NON-DISCLOSURE AGREEMENT

## 1. PARTIES
[Party A Name] and [Party B Name]

## 2. CONFIDENTIALITY
The party shall keep stuff secret. Specify the exact consideration. TBD.

## 3. OTHER
________
`;

    const parsed = parseDocumentStructure(terribleDraft);
    const sections = parsed.sections.map(s => ({
      sectionType: s.sectionType,
      title: s.title,
      content: s.content
    }));

    const result = await validationEngine.validate(
      'NDA',
      sections,
      {},
      [],
      terribleDraft
    );

    assert.strictEqual(result.status, 'FAILED', 'Severely broken NDA must receive status FAILED');
    assert.ok(result.overallScore <= 35, `Score must be capped at <= 35%, got ${result.overallScore}%`);
    assert.ok(result.overallScore < 100, 'Score must NEVER be 100%');
  });

  it('Test 7: Complete valid NDA achieves 90-98% and PASSED', async () => {
    const perfectNDA = `# MUTUAL NON-DISCLOSURE AGREEMENT

## 1. PARTIES & PREAMBLE
This Mutual Non-Disclosure Agreement is entered into on January 15, 2026 ("Effective Date") by and between Apex Systems Inc. ("Disclosing Party") and Zenith Solutions LLC ("Receiving Party").

## 2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" refers to all non-public technical, business, financial, and operational information disclosed directly or indirectly.

## 3. EXCLUSIONS FROM CONFIDENTIALITY
Confidential Information does not include information that: (a) is or becomes publicly known through no breach; (b) was already in the recipient's possession prior to disclosure; (c) is independently developed without reference to the confidential data; or (d) is rightfully obtained from a third party without confidentiality restrictions.

## 4. NON-DISCLOSURE OBLIGATIONS
The Receiving Party shall maintain all Confidential Information in strict confidence and shall not disclose it to any third party without prior written authorization. The Receiving Party shall exercise at least reasonable care.

## 5. PERMITTED DISCLOSURES
Disclosures are permitted strictly to employees and advisors who have a clear need to know and are bound by confidentiality obligations.

## 6. TERM & SURVIVAL
This Agreement remains in effect for a period of two (2) years. The confidentiality obligations herein shall survive termination for an additional period of three (3) years.

## 7. RETURN OR DESTRUCTION OF MATERIALS
Upon written request, the Receiving Party shall promptly return or destroy all tangible materials containing Confidential Information within fourteen (14) days.

## 8. REMEDIES & INJUNCTIVE RELIEF
The parties acknowledge that money damages alone would be inadequate compensation for a breach, and the Disclosing Party is entitled to seek equitable and injunctive relief without bond.

## 9. GOVERNING LAW & JURISDICTION
This Agreement shall be governed by the laws of the State of Delaware, and the courts located in Wilmington shall have exclusive jurisdiction.

## 10. NOTICES
All notices must be sent in writing via certified mail or tracked courier to the registered addresses.

## 11. GENERAL PROVISIONS
This Agreement constitutes the entire understanding between the parties. Amendments must be in writing. Neither party may assign this agreement without prior written consent.

## 12. EXECUTION & SIGNATURES
IN WITNESS WHEREOF, the parties have executed this Mutual Non-Disclosure Agreement as of the Effective Date.

Apex Systems Inc.
By: Johnathan Miller, Chief Executive Officer

Zenith Solutions LLC
By: Sarah Jenkins, Managing Director
`;

    const parsed = parseDocumentStructure(perfectNDA);
    const sections = parsed.sections.map(s => ({
      sectionType: s.sectionType,
      title: s.title,
      content: s.content
    }));

    const result = await validationEngine.validate(
      'NDA',
      sections,
      {
        disclosingParty: { name: 'Apex Systems Inc.' },
        receivingParty: { name: 'Zenith Solutions LLC' },
        effectiveDate: '2026-01-15',
        duration: '2 years',
        governingLaw: 'Delaware'
      },
      [],
      perfectNDA
    );

    assert.strictEqual(result.status, 'PASSED', 'Complete valid NDA must pass');
    assert.ok(result.overallScore >= 90 && result.overallScore <= 98, `Expected score 90-98%, got ${result.overallScore}`);
  });

  it('Test 8: applyDocumentPatch uses normalized matching and does not break on quote or whitespace differences', () => {
    const text = `The Agreement was entered into on “January 15, 2026” between the parties.`;

    const patch = {
      id: 'patch_1',
      issueId: 'det_date',
      action: 'REPLACE_TEXT' as const,
      target: {
        textRange: { start: 0, end: 0 } // invalid offset
      },
      originalText: `entered into on "January 15, 2026"`,
      replacementText: `entered into on February 1, 2026`,
      reason: 'Align date',
      canAutoFix: true,
      mode: 'SAFE_AUTO' as const,
      confidence: 0.95,
      requiresUserInput: false
    };

    const { newContent } = applyDocumentPatch(text, patch);
    assert.strictEqual(
      newContent,
      `The Agreement was entered into on February 1, 2026 between the parties.`
    );
  });
});

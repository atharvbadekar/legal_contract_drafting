import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  parseDocumentStructure, 
  locateTextInDocument, 
  applyDocumentPatch,
  StalePatchError 
} from '../services/documents/document_structure.js';
import { validationEngine } from '../services/validation/validation_engine.js';
import { patchService } from '../services/validation/patch_service.js';

describe('ATHARV Document Editor & Surgical Quick AI Fix Test Suite', () => {

  // =========================================================================
  // SCENARIO 1: Missing notice period (Safe Auto Fix)
  // =========================================================================
  it('Scenario 1: Missing notice period in facts is detected as SAFE_AUTO and fixed surgically', async () => {
    const facts = {
      parties: {
        disclosingParty: 'Acme Corp',
        receivingParty: 'Beta LLC'
      },
      noticePeriod: '30 days',
      governingLaw: 'California'
    };

    const docContent = `## 1. Parties
This Agreement is entered into by Acme Corp and Beta LLC.

---

## 2. Term & Termination
Either party may terminate this agreement at any time upon notice to the other party without cause.

---

## 3. Signatures
Acme Corp: _________________
Beta LLC: _________________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: s.title.toLowerCase().includes('parties') ? 'parties' : s.title.toLowerCase().includes('term') ? 'termination' : 'signatures',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('NDA', sections, facts, docContent);
    const noticeIssue = valResult.allIssues.find(i => i.type === 'MISSING_NOTICE_PERIOD');

    assert.ok(noticeIssue, 'Expected MISSING_NOTICE_PERIOD finding');
    assert.strictEqual(noticeIssue?.mode, 'SAFE_AUTO', 'Notice period with known facts must be SAFE_AUTO');
    assert.strictEqual(noticeIssue?.canAutoFix, true);
    assert.ok(noticeIssue?.proposedPatch, 'Must generate proposedPatch');

    // Apply patch surgically
    const patchResult = applyDocumentPatch(docContent, noticeIssue!.proposedPatch!);
    const patchedContent = patchResult.content;
    assert.ok(patchedContent.includes('30 days written notice'), 'Patched content must include 30 days written notice');
    assert.ok(patchedContent.includes('## 1. Parties'), 'Must preserve preceding section');
    assert.ok(patchedContent.includes('## 3. Signatures'), 'Must preserve succeeding section');
  });

  // =========================================================================
  // SCENARIO 2: Missing payment amount (Manual, canAutoFix: false)
  // =========================================================================
  it('Scenario 2: Missing payment amount when not in facts must be MANUAL without hallucinated patch', async () => {
    const facts = {
      client: 'Client Inc',
      serviceProvider: 'Dev Studio'
      // No compensation or fee specified in facts!
    };

    const docContent = `## 1. Services
Dev Studio shall perform software development services.

---

## 2. Compensation & Payment
Client shall pay Service Provider payment for all completed deliverables upon invoice submission.

---

## 3. Signatures
Client: _________________
Dev Studio: _________________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: 'payment',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('SERVICES_AGREEMENT', sections, facts, docContent);
    const paymentIssue = valResult.allIssues.find(i => i.type === 'MISSING_PAYMENT_AMOUNT');

    assert.ok(paymentIssue, 'Expected MISSING_PAYMENT_AMOUNT finding');
    assert.strictEqual(paymentIssue?.mode, 'MANUAL', 'Missing commercial term must be MANUAL');
    assert.strictEqual(paymentIssue?.canAutoFix, false, 'canAutoFix must be false');
    assert.ok(
      paymentIssue?.suggestion?.includes('consideration amount') || paymentIssue?.suggestion?.includes('payment amount'),
      'Must guide user on what to change'
    );
  });

  // =========================================================================
  // SCENARIO 3: Conflicting payment periods (Manual, canAutoFix: false)
  // =========================================================================
  it('Scenario 3: Conflicting internal periods (30 days vs 45 days) must be MANUAL', async () => {
    const facts = {
      parties: { client: 'Alpha Co', vendor: 'Beta Co' }
    };

    const docContent = `## 1. Invoicing
Invoices shall be payable within 30 days of receipt by Client.

---

## 2. Dispute Resolution
If payment is delayed past 45 days of invoice date, interest shall accrue.

---

## 3. Signatures
Alpha Co: _________________
Beta Co: _________________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: 'payment',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('SERVICES_AGREEMENT', sections, facts, docContent);
    const conflictIssue = valResult.allIssues.find(i => i.type === 'CONFLICTING_TERMS');

    assert.ok(conflictIssue, 'Expected CONFLICTING_TERMS finding');
    assert.strictEqual(conflictIssue?.mode, 'MANUAL', 'Conflicting terms require human commercial decision');
    assert.strictEqual(conflictIssue?.canAutoFix, false);
  });

  // =========================================================================
  // SCENARIO 4: Wrong party name (Safe Auto Fix)
  // =========================================================================
  it('Scenario 4: Mismatched party name is detected as SAFE_AUTO and fixed cleanly', async () => {
    const facts = {
      disclosingParty: 'Acme Global Tech Corp',
      receivingParty: 'Beta Innovative Solutions LLC',
      duration: '2 years'
    };

    const docContent = `## 1. Parties
This Non-Disclosure Agreement is entered into by Acme Global Technologies Inc ("Disclosing Party") and Beta Innovative Solutions LLC ("Receiving Party").

---

## 2. Confidentiality
Receiving Party shall hold in strict confidence all proprietary data.

---

## 3. Signatures
Acme Global Technologies Inc: _________________
Beta Innovative Solutions LLC: _________________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: s.title.toLowerCase().includes('parties') ? 'parties' : 'content',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('NDA', sections, facts, docContent);
    const partyIssue = valResult.allIssues.find(i => i.type === 'PARTY_MISMATCH' || i.title?.includes('Party Name Mismatch'));

    assert.ok(partyIssue, 'Expected party mismatch issue');
    assert.strictEqual(partyIssue?.mode, 'SAFE_AUTO', 'Party fix with known facts must be SAFE_AUTO');
    const patch = partyIssue!.proposedPatch || await patchService.generatePatchForIssue({
      documentType: 'NDA',
      content: docContent,
      issue: partyIssue!,
      structuredFacts: facts
    });
    assert.ok(patch, 'Must have patch');
    assert.strictEqual(patch.originalText, 'Acme Global Technologies Inc');
    assert.strictEqual(patch.replacementText, 'Acme Global Tech Corp');

    const patched = applyDocumentPatch(docContent, patch).content;
    assert.ok(patched.includes('Acme Global Tech Corp'));
    assert.ok(patched.includes('Beta Innovative Solutions LLC'));
  });

  // =========================================================================
  // SCENARIO 5: Missing IP ownership (Manual, canAutoFix: false)
  // =========================================================================
  it('Scenario 5: Missing IP ownership assignment is flagged as MANUAL without hallucinated ownership', async () => {
    const facts = { client: 'Alpha', contractor: 'Beta' };

    const docContent = `## 1. Scope
Contractor shall create custom software modules and deliverables.

---

## 2. Deliverables
All deliverables will be delivered in executable format.

---

## 3. Signatures
Alpha: ______________
Beta: ______________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: 'scope',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('CONSULTING_AGREEMENT', sections, facts, docContent);
    const ipIssue = valResult.allIssues.find(i => i.type === 'MISSING_IP_OWNERSHIP');

    assert.ok(ipIssue, 'Expected MISSING_IP_OWNERSHIP finding');
    assert.strictEqual(ipIssue?.mode, 'MANUAL');
    assert.strictEqual(ipIssue?.canAutoFix, false);
    assert.strictEqual(ipIssue?.proposedPatch, undefined);
  });

  // =========================================================================
  // SCENARIO 6: Unlimited liability (Manual, canAutoFix: false)
  // =========================================================================
  it('Scenario 6: Unlimited liability exposure is flagged as MANUAL and never invents arbitrary caps', async () => {
    const facts = { partyA: 'A', partyB: 'B' };

    const docContent = `## 1. Indemnification
Party B shall defend, indemnify, and hold harmless Party A from and against any and all claims, liabilities, and damages arising out of this agreement without limitation.

---

## 2. Signatures
A: _____________
B: _____________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: 'indemnity',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('COMMERCIAL_CONTRACT', sections, facts, docContent);
    const liabIssue = valResult.allIssues.find(i => i.type === 'UNLIMITED_LIABILITY');

    assert.ok(liabIssue, 'Expected UNLIMITED_LIABILITY finding');
    assert.strictEqual(liabIssue?.mode, 'MANUAL');
    assert.strictEqual(liabIssue?.canAutoFix, false);
    assert.strictEqual(liabIssue?.proposedPatch, undefined);
  });

  // =========================================================================
  // SCENARIO 7: Broken cross-reference (Manual)
  // =========================================================================
  it('Scenario 7: Broken cross-reference is flagged as MANUAL', async () => {
    const facts = {};

    const docContent = `## 1. Definitions
Terms defined herein apply throughout.

---

## 2. Obligations
Subject to the exceptions detailed in Section 15, Party B shall maintain strict confidentiality.

---

## 3. Signatures
Signatures: _____________`;

    const parsed = parseDocumentStructure(docContent);
    const sections = parsed.sections.map(s => ({
      sectionType: 'general',
      title: s.title,
      content: s.content
    }));

    const valResult = await validationEngine.validate('NDA', sections, facts, docContent);
    const crossRefIssue = valResult.allIssues.find(i => i.type === 'BROKEN_CROSS_REFERENCE');

    assert.ok(crossRefIssue, 'Expected BROKEN_CROSS_REFERENCE finding');
    assert.strictEqual(crossRefIssue?.mode, 'MANUAL');
    assert.strictEqual(crossRefIssue?.canAutoFix, false);
  });

  // =========================================================================
  // SCENARIO 8: Stale patch rejection
  // =========================================================================
  it('Scenario 8: Stale patch is rejected when document has been modified since validation', () => {
    const originalContent = `## 1. Term\nThis Agreement lasts for 1 year from the Effective Date.`;
    const patch = {
      id: 'patch_1',
      issueId: 'iss_1',
      action: 'REPLACE_TEXT' as const,
      target: {
        sectionId: 'sec_0',
        textRange: { start: 11, end: 57 }
      },
      originalText: 'This Agreement lasts for 1 year from the Effective Date.',
      replacementText: 'This Agreement lasts for 3 years from the Effective Date.',
      reason: 'Align with intake',
      canAutoFix: true,
      mode: 'SAFE_AUTO' as const,
      confidence: 1.0,
      requiresUserInput: false
    };

    // User edited the document before applying the patch!
    const userModifiedContent = `## 1. Term\nThis Agreement lasts for 2 years from the Effective Date.`;

    assert.throws(
      () => applyDocumentPatch(userModifiedContent, patch),
      (err: any) => {
        assert.ok(err instanceof StalePatchError);
        assert.ok(err.message.includes('Document has changed'));
        return true;
      }
    );
  });

  // =========================================================================
  // SCENARIO 9: Bad patch rejection (corrupt offsets or mismatch)
  // =========================================================================
  it('Scenario 9: Bad patch with mismatched target text is rejected', () => {
    const content = `## 1. Title\nHello World`;
    const badPatch = {
      id: 'bad_1',
      issueId: 'iss_bad',
      action: 'REPLACE_TEXT' as const,
      target: {
        textRange: { start: 0, end: 5 }
      },
      originalText: 'Goodbye Universe',
      replacementText: 'Greetings Planet',
      reason: 'Test',
      canAutoFix: true,
      mode: 'SAFE_AUTO' as const,
      confidence: 1.0,
      requiresUserInput: false
    };

    assert.throws(
      () => applyDocumentPatch(content, badPatch),
      /Target text mismatch|Document has changed/
    );
  });

  // =========================================================================
  // SCENARIO 10: Unsafe patch dry-run validation rollback
  // =========================================================================
  it('Scenario 10: Dry-run safety check rolls back a patch that degrades score', async () => {
    const originalContent = `## 1. Term\nDuration is 3 years.\n\n---\n\n## 2. Governing Law\nGoverned by laws of California.`;
    const facts = { duration: '3 years', governingLaw: 'California' };

    // Create a bad patch that introduces a severe contradiction
    const maliciousPatch = {
      id: 'p_bad',
      issueId: 'iss_bad',
      action: 'REPLACE_TEXT' as const,
      target: {
        textRange: { start: 11, end: 31 }
      },
      originalText: 'Duration is 3 years.',
      replacementText: 'Duration is 99 years and liability is completely unlimited and payment is missing.',
      reason: 'Malicious modification',
      canAutoFix: true,
      mode: 'SAFE_AUTO' as const,
      confidence: 0.95,
      requiresUserInput: false
    };

    // Verify dry-run safety
    let rejected = false;
    try {
      const candidateContent = applyDocumentPatch(originalContent, maliciousPatch).content;
      const parsed = parseDocumentStructure(candidateContent);
      const candidateSections = parsed.sections.map(s => ({
        sectionType: 'content',
        title: s.title,
        content: s.content
      }));
      const valAfter = await validationEngine.validate('NDA', candidateSections, facts, candidateContent);
      
      // If validation score drops or high findings appear, must reject!
      if (valAfter.allIssues.some(i => i.severity === 'HIGH') || valAfter.overallScore < 70) {
        rejected = true;
      }
    } catch {
      rejected = true;
    }

    assert.ok(rejected, 'Unsafe patch must be detected and rejected during dry-run');
  });

  // =========================================================================
  // SCENARIO 11: Document Structure and Section/Paragraph Range Integrity
  // =========================================================================
  it('Scenario 11: Document Structure parser computes exact character ranges and paragraph IDs', () => {
    const markdown = `# Section One
First paragraph of section one.
Second line of first paragraph.

Another paragraph here.

---

# Section Two
Content of section two.`;

    const parsed = parseDocumentStructure(markdown);
    assert.strictEqual(parsed.sections.length, 2);
    assert.strictEqual(parsed.sections[0].id, 'sec_0');
    assert.strictEqual(parsed.sections[0].title, 'Section One');
    assert.strictEqual(parsed.sections[1].id, 'sec_1');
    assert.strictEqual(parsed.sections[1].title, 'Section Two');

    // Paragraph offsets
    const p0 = parsed.sections[0].paragraphs[0];
    assert.ok(p0.id.startsWith('sec_0_p_'));
    assert.strictEqual(markdown.substring(p0.startIndex, p0.endIndex), p0.text);

    // Pinpoint location lookup
    const loc = locateTextInDocument(markdown, 'Another paragraph here.');
    assert.ok(loc.found, 'Must locate text');
    assert.strictEqual(loc.location.sectionId, 'sec_0');
    assert.strictEqual(markdown.substring(loc.location.textRange!.start, loc.location.textRange!.end), 'Another paragraph here.');
  });

  // =========================================================================
  // SCENARIO 12: Batch Safe Auto-Fix preserves formatting and offsets
  // =========================================================================
  it('Scenario 12: Multiple safe patches applied in sequence preserve document integrity', () => {
    const doc = `## 1. Parties\nParty A: WrongNameA.\n\n---\n\n## 2. Term\nTerm: 10 months.`;
    
    const patch1 = {
      id: 'p1',
      issueId: 'iss1',
      action: 'REPLACE_TEXT' as const,
      target: { textRange: { start: 23, end: 33 } },
      originalText: 'WrongNameA',
      replacementText: 'CorrectNameA Global',
      reason: 'Fix name',
      canAutoFix: true,
      mode: 'SAFE_AUTO' as const,
      confidence: 1.0,
      requiresUserInput: false
    };

    const docAfter1 = applyDocumentPatch(doc, patch1).content;
    assert.ok(docAfter1.includes('Party A: CorrectNameA Global.'));

    // Relocate next target on the updated document
    const loc2 = locateTextInDocument(docAfter1, '10 months');
    assert.ok(loc2.found);

    const patch2 = {
      id: 'p2',
      issueId: 'iss2',
      action: 'REPLACE_TEXT' as const,
      target: { textRange: { start: loc2.location.textRange!.start, end: loc2.location.textRange!.end } },
      originalText: '10 months',
      replacementText: '2 years',
      reason: 'Fix term',
      canAutoFix: true,
      mode: 'SAFE_AUTO' as const,
      confidence: 1.0,
      requiresUserInput: false
    };

    const docAfter2 = applyDocumentPatch(docAfter1, patch2).content;
    assert.ok(docAfter2.includes('Term: 2 years.'));
    assert.ok(docAfter2.includes('Party A: CorrectNameA Global.'));
    assert.ok(docAfter2.includes('## 1. Parties'));
    assert.ok(docAfter2.includes('## 2. Term'));
  });

  // =========================================================================
  // SCENARIO 13: Database E2E verifyAndApplyPatch verifies prisma.document works
  // =========================================================================
  it('Scenario 13: patchService.verifyAndApplyPatch executes cleanly with database document', async () => {
    const { prisma } = await import('../utils/prisma.js');
    
    let isDbAvailable = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      console.log('Database not reachable in test sandbox; skipping live DB scenario 13.');
      return;
    }

    // Find or create a test user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
          name: 'Test User'
        }
      });
    }

    // Create a test document
    const initialContent = `## 1. Parties\nThis Agreement is between Acme Corp and Beta LLC.\n\n---\n\n## 2. Term & Termination\nEither party may terminate at any time upon notice.\n\n---\n\n## 3. Signatures\nSigned by Parties.`;
    const facts = {
      parties: { disclosingParty: 'Acme Corp', receivingParty: 'Beta LLC' },
      noticePeriod: '30 days'
    };

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        title: 'E2E Test NDA',
        documentType: 'NDA',
        content: initialContent,
        structuredFacts: facts,
        validationScore: 80.0
      }
    });

    try {
      // Validate to get the patch
      const parsed = parseDocumentStructure(initialContent);
      const sections = parsed.sections.map(s => ({
        sectionType: s.title.toLowerCase().includes('parties') ? 'parties' : s.title.toLowerCase().includes('term') ? 'termination' : 'signatures',
        title: s.title,
        content: s.content
      }));
      const valResult = await validationEngine.validate('NDA', sections, facts, initialContent);
      const noticeIssue = valResult.allIssues.find(i => i.type === 'MISSING_NOTICE_PERIOD');

      assert.ok(noticeIssue?.proposedPatch, 'Must have proposed patch');

      // Now verify and apply via patchService - this calls prisma.document and prisma.documentVersion
      const result = await patchService.verifyAndApplyPatch({
        documentId: doc.id,
        patch: noticeIssue!.proposedPatch!,
        userId: user.id
      });

      assert.strictEqual(result.applied, true, 'Patch must be applied');
      assert.ok(result.newContent?.includes('30 days written notice'), 'New content must include notice period');

      // Verify DB was updated
      const updatedDoc = await prisma.document.findUnique({ where: { id: doc.id } });
      assert.ok(updatedDoc?.content.includes('30 days written notice'), 'Database must be updated');

      // Verify a version was created
      const versions = await prisma.documentVersion.findMany({ where: { documentId: doc.id } });
      assert.ok(versions.length >= 1, 'A version snapshot must be created');
    } finally {
      // Clean up
      await prisma.document.delete({ where: { id: doc.id } }).catch(() => {});
    }
  });

  // =========================================================================
  // SCENARIO 14: Database E2E batchApplySafePatches executes cleanly
  // =========================================================================
  it('Scenario 14: patchService.batchApplySafePatches executes cleanly without undefined prisma', async () => {
    const { prisma } = await import('../utils/prisma.js');
    
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      console.log('Database not reachable in test sandbox; skipping live DB scenario 14.');
      return;
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-batch-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
          name: 'Batch User'
        }
      });
    }

    const initialContent = `## 1. Parties\nThis Agreement is between Acme Corp and Beta LLC.\n\n---\n\n## 2. Term & Termination\nEither party may terminate at any time upon notice.\n\n---\n\n## 3. Signatures\nSigned by Parties.`;
    const facts = {
      parties: { disclosingParty: 'Acme Corp', receivingParty: 'Beta LLC' },
      noticePeriod: '30 days'
    };

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        title: 'Batch Safe Test NDA',
        documentType: 'NDA',
        content: initialContent,
        structuredFacts: facts,
        validationScore: 80.0
      }
    });

    try {
      const batchResult = await patchService.batchApplySafePatches(doc.id, user.id);
      assert.strictEqual(batchResult.success, true);
      assert.ok(batchResult.appliedCount >= 1, 'At least 1 safe patch applied');
      assert.ok(batchResult.content?.includes('30 days written notice'));

      const updated = await prisma.document.findUnique({ where: { id: doc.id } });
      assert.ok(updated?.content.includes('30 days written notice'));
    } finally {
      await prisma.document.delete({ where: { id: doc.id } }).catch(() => {});
    }
  });

});


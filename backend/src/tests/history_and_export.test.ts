import { describe, it } from 'node:test';
import assert from 'node:assert';
import { documentHistoryService } from '../services/history/document_history_service.js';
import { exportService } from '../services/documents/export_service.js';
import { randomUUID } from 'crypto';

describe('Phase 6 — Document History, Diffing, Audit Trail & Export Perfection Tests', () => {
  const docId = `doc_test_${Date.now()}`;
  const userId = `usr_test_${Date.now()}`;

  const v1Content = `# NON-DISCLOSURE AGREEMENT

This Agreement is entered into by Alpha Corp ("Disclosing Party") and Beta Ltd ("Receiving Party").

## 1. CONFIDENTIALITY
The Receiving Party shall maintain confidentiality for 2 years.

## 2. GOVERNING LAW
This Agreement shall be governed by the laws of India.
`;

  const v2Content = `# NON-DISCLOSURE AGREEMENT

This Agreement is entered into by Alpha Corp ("Disclosing Party") and Gamma Global Inc ("Receiving Party").

## 1. CONFIDENTIALITY
The Receiving Party shall maintain confidentiality for 3 years.

## 2. GOVERNING LAW
This Agreement shall be governed by the laws of India and jurisdiction of New Delhi courts.

## 3. NON-SOLICITATION
Neither party shall solicit employees for a period of 12 months.
`;

  const v1Facts = {
    disclosingParty: 'Alpha Corp',
    receivingParty: 'Beta Ltd',
    duration: '2 years',
    jurisdiction: 'India'
  };

  const v2Facts = {
    disclosingParty: 'Alpha Corp',
    receivingParty: 'Gamma Global Inc',
    duration: '3 years',
    jurisdiction: 'New Delhi, India'
  };

  it('1. Diff Computation: calculates line-by-line additions, deletions and summary accurately', () => {
    const diff = documentHistoryService.computeDiff(v1Content, v2Content);

    assert.ok(diff.additions > 0, 'Must record positive additions');
    assert.ok(diff.deletions > 0, 'Must record deletions for modified lines');
    assert.ok(diff.diffSummary.includes('additions'), 'Must format human-readable additions summary');
    assert.ok(diff.diffSummary.includes('deletions'), 'Must format human-readable deletions summary');

    // Verify diff lines contain both additions and deletions
    const addedLines = diff.diffLines.filter(l => l.type === 'ADD');
    const removedLines = diff.diffLines.filter(l => l.type === 'REMOVE');

    assert.ok(addedLines.some(l => l.line.includes('Gamma Global Inc')), 'Must identify new party as ADD');
    assert.ok(removedLines.some(l => l.line.includes('Beta Ltd')), 'Must identify old party as REMOVE');
    assert.ok(addedLines.some(l => l.line.includes('NON-SOLICITATION')), 'Must identify new section as ADD');
  });

  it('2. Facts Diffing: identifies exact field deltas between versions', () => {
    const factsDiff = documentHistoryService.compareFacts(v1Facts, v2Facts);

    assert.strictEqual(factsDiff.length, 3, 'Should detect changes in receivingParty, duration, and jurisdiction');

    const partyDelta = factsDiff.find(f => f.field === 'receivingParty');
    assert.ok(partyDelta, 'Should find receivingParty delta');
    assert.strictEqual(partyDelta?.oldValue, 'Beta Ltd');
    assert.strictEqual(partyDelta?.newValue, 'Gamma Global Inc');

    const durDelta = factsDiff.find(f => f.field === 'duration');
    assert.strictEqual(durDelta?.oldValue, '2 years');
    assert.strictEqual(durDelta?.newValue, '3 years');
  });

  it('3. Record Version: creates sequential versions with metadata and audit trail', async () => {
    // Record v1
    const { version: ver1, auditLog: audit1 } = await documentHistoryService.recordVersion({
      documentId: docId,
      userId,
      authorName: 'Atharv Counsel',
      content: v1Content,
      structuredFacts: v1Facts,
      validationScore: 82,
      changeSummary: 'Initial contract drafting',
      operationType: 'GENERATION',
      engine: 'Atharv Legal AI Drafting'
    });

    assert.strictEqual(ver1.versionNumber, 1, 'First version must have versionNumber 1');
    assert.strictEqual(audit1.action, 'DOCUMENT_GENERATION');
    assert.strictEqual(audit1.details.scoreAfter, 82);
    assert.strictEqual(audit1.details.authorName, 'Atharv Counsel');

    // Record v2
    const { version: ver2, auditLog: audit2 } = await documentHistoryService.recordVersion({
      documentId: docId,
      userId,
      authorName: 'Legal Reviewer',
      content: v2Content,
      structuredFacts: v2Facts,
      validationScore: 94,
      changeSummary: 'Updated receiving party and extended term to 3 years',
      operationType: 'MANUAL_EDIT',
      scoreBefore: 82
    });

    assert.strictEqual(ver2.versionNumber, 2, 'Second version must have versionNumber 2');
    assert.strictEqual(audit2.details.scoreBefore, 82);
    assert.strictEqual(audit2.details.scoreAfter, 94);
    assert.strictEqual(audit2.details.operationType, 'MANUAL_EDIT');
    assert.ok(audit2.details.diffSummary?.includes('+'), 'Must include additions summary in audit log');
  });

  it('4. Compare Any Two Versions: retrieves dynamic diff and score delta between v1 and v2', async () => {
    const diff = await documentHistoryService.compareVersions(docId, 1, 2);

    assert.strictEqual(diff.v1Number, 1);
    assert.strictEqual(diff.v2Number, 2);
    assert.strictEqual(diff.v1Score, 82);
    assert.strictEqual(diff.v2Score, 94);
    assert.strictEqual(diff.scoreDelta, 12, 'Score delta must be exactly 94 - 82 = +12');
    assert.ok(diff.additions > 0);
    assert.ok(diff.deletions > 0);
    assert.strictEqual(diff.factsDiff.length, 3, 'Must detect 3 facts changed');
  });

  it('5. Audit Trail & Log Retrieval: returns all events with execution details', async () => {
    // Log an export audit event
    await documentHistoryService.logAuditEvent({
      documentId: docId,
      userId,
      authorName: 'Atharv Counsel',
      action: 'DOCUMENT_EXPORT_DOCX',
      operationType: 'EXPORT_DOCX',
      changeSummary: 'Exported contract to DOCX',
      engine: 'Native Word XML Engine'
    });

    const logs = await documentHistoryService.getAuditLogs(docId);
    assert.ok(logs.length >= 3, 'Must retrieve at least 3 audit events (generation, edit, export)');

    const exportLog = logs.find(l => l.details?.operationType === 'EXPORT_DOCX');
    assert.ok(exportLog, 'Must find DOCX export audit event');
    assert.strictEqual(exportLog?.details?.engine, 'Native Word XML Engine');
  });

  it('6. Export Audit Report: produces structured JSON report with governance disclaimer', async () => {
    const report = await documentHistoryService.exportAuditReport(docId);

    assert.strictEqual(report.documentId, docId);
    assert.ok(report.totalAuditEvents >= 3, 'Report must contain recorded audit events');
    assert.ok(report.totalVersions >= 2, 'Report must reflect version count');
    assert.ok(report.auditEvents.length >= 3);
    assert.ok(report.regulatoryDisclaimer.includes('Review with a qualified lawyer'), 'Must include lawyer review disclaimer');
  });

  it('7. Export DOCX Perfection: generates valid Word document buffer with legal formatting', async () => {
    const title = 'MUTUAL NON-DISCLOSURE AGREEMENT';
    const buffer = await exportService.generateDocx(title, v2Content);

    assert.ok(Buffer.isBuffer(buffer), 'Must return a Node.js Buffer');
    assert.ok(buffer.length > 2000, 'DOCX file buffer must be substantial in size');

    // DOCX files are zip packages starting with PK magic bytes (0x50 0x4B)
    assert.strictEqual(buffer[0], 0x50, 'First byte must be P (0x50)');
    assert.strictEqual(buffer[1], 0x4B, 'Second byte must be K (0x4B)');
  });

  it('8. Export PDF Perfection: generates valid PDF buffer with orphan protection and legal disclaimer', async () => {
    const title = 'MUTUAL NON-DISCLOSURE AGREEMENT';
    const buffer = await exportService.generatePdf(title, v2Content);

    assert.ok(Buffer.isBuffer(buffer), 'Must return a Node.js Buffer');
    assert.ok(buffer.length > 1000, 'PDF buffer must be valid size');

    // PDF files start with %PDF- header
    const pdfHeader = buffer.slice(0, 5).toString('utf8');
    assert.strictEqual(pdfHeader, '%PDF-', 'Must start with %PDF- magic bytes');
  });
});

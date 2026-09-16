import { describe, it } from 'node:test';
import assert from 'node:assert';
import zlib from 'zlib';
import { contractAnalyzer } from '../services/analyzer/contract_analyzer.js';
import { diffService } from '../utils/diff_service.js';

describe('Contract Analyzer & Advanced Legal Intelligence Tests', () => {
  it('Test 1: Complete NDA analysis correctly extracts overview and passes health thresholds', async () => {
    const ndaText = `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of January 15, 2026 ("Effective Date"), by and between:
Apex Technologies Inc., a Delaware corporation, having its principal office at 100 Main St, Wilmington, DE ("Disclosing Party"),
and
Beta Innovations LLC, a California limited liability company, located at 500 Market St, San Francisco, CA ("Receiving Party").

WHEREAS, the parties desire to evaluate a potential business collaboration ("Purpose").

1. Definition of Confidential Information
"Confidential Information" shall mean all non-public, proprietary technical data, software code, financial statements, trade secrets, and business plans disclosed by either party to the other.

2. Non-Disclosure Obligations
Each party agrees to maintain in confidence all Confidential Information of the other party using the same degree of care it uses for its own confidential information, but in no event less than a reasonable degree of care. Neither party shall disclose Confidential Information to any third party without prior written consent.

3. Exceptions and Exclusions
Confidential Information shall not apply to information that: (a) is or becomes part of the public domain without breach; (b) was already in lawful possession prior to disclosure; (c) is independently developed without reference to the confidential data; or (d) is required to be disclosed by judicial order.

4. Term and Duration
This Agreement and the confidentiality obligations herein shall remain in effect for a period of 3 years from the Effective Date.

5. Remedies and Injunctive Relief
The parties acknowledge that unauthorized disclosure causes irreparable harm for which monetary damages alone are inadequate, and agree that the non-breaching party shall be entitled to seek injunctive relief in addition to any other remedies available at law.

6. Governing Law and Dispute Resolution
This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware. Any dispute arising hereunder shall be subject to the exclusive jurisdiction of the courts of Wilmington, Delaware.

7. Execution & Counterparts
IN WITNESS WHEREOF, the parties have caused this Agreement to be executed by their duly authorized representatives.

Apex Technologies Inc.
By: ______________________
Name: Sarah Jenkins
Title: Chief Executive Officer

Beta Innovations LLC
By: ______________________
Name: David Vance
Title: Managing Director`;

    const result = await contractAnalyzer.analyzeContract(ndaText, 'mutual_nda.docx');

    // 1. Overview Verification
    assert.strictEqual(result.overview.contractType, 'NDA');
    assert.strictEqual(result.overview.parties.length, 2);
    assert.ok(result.overview.parties[0].name.includes('Apex Technologies'));
    assert.ok(result.overview.parties[1].name.includes('Beta Innovations'));
    assert.ok(result.overview.duration?.includes('3 years'));
    assert.ok(result.overview.governingLaw?.includes('Delaware'));

    // 2. Clause Map Verification
    const confClause = result.clauseMap.find(c => c.id === 'core_obligations');
    assert.ok(confClause);
    assert.strictEqual(confClause.status, 'PRESENT');

    const remediesClause = result.clauseMap.find(c => c.id === 'remedies_injunction');
    assert.ok(remediesClause);
    assert.strictEqual(remediesClause.status, 'PRESENT');

    // 3. Risk Verification: NDA should NOT have false payment or false IP flags
    const paymentRisk = result.riskAreas.find(r => r.id === 'missing_payment_amount');
    assert.strictEqual(paymentRisk, undefined, 'NDA must NOT flag missing payment amount');

    const ipRisk = result.riskAreas.find(r => r.id === 'missing_ip_assignment');
    assert.strictEqual(ipRisk, undefined, 'NDA must NOT flag missing IP assignment');

    // 4. Health Score Verification
    assert.ok(result.health.score >= 80, `Expected strong health score >= 80, got ${result.health.score}`);
    assert.strictEqual(result.health.status, 'STRONG');
    assert.ok(result.health.scoreBreakdown.length >= 0);
  });

  it('Test 2: Risky Services Agreement triggers uncapped liability, missing IP, and placeholders with hard cap', async () => {
    const brokenServicesText = `SERVICES AGREEMENT
By and between ClientCorp and DevConsultants.

DevConsultants shall develop custom deliverables for ClientCorp.
ClientCorp agrees to pay for the deliverables upon completion.

DevConsultants may terminate immediately without notice at any time.

[PARTY NAME] shall indemnify the other party against any and all claims, without any limitation whatsoever.

Dated: 2026-12-01. Term expires: 2026-04-15.`;

    const result = await contractAnalyzer.analyzeContract(brokenServicesText, 'agreement.txt');

    // 1. Contract Type
    assert.strictEqual(result.overview.contractType, 'SERVICE_AGREEMENT');

    // 2. Uncapped Liability detected as HIGH
    const uncappedRisk = result.riskAreas.find(r => r.id === 'uncapped_liability');
    assert.ok(uncappedRisk, 'Must detect uncapped liability exposure');
    assert.strictEqual(uncappedRisk.severity, 'HIGH');

    // 3. Missing IP Assignment detected as HIGH
    const ipRisk = result.riskAreas.find(r => r.id === 'missing_ip_assignment');
    assert.ok(ipRisk, 'Must detect missing IP assignment for custom deliverables');
    assert.strictEqual(ipRisk.severity, 'HIGH');

    // 4. Missing Payment Amount detected as HIGH (because affirmative payment covenant exists without number)
    const paymentRisk = result.riskAreas.find(r => r.id === 'missing_payment_amount');
    assert.ok(paymentRisk, 'Must flag affirmative payment covenant without specified amount');
    assert.strictEqual(paymentRisk.severity, 'HIGH');

    // 5. Unresolved Placeholders detected
    const phRisk = result.riskAreas.find(r => r.id === 'unresolved_placeholders');
    assert.ok(phRisk, 'Must detect [PARTY NAME] placeholder');

    // 6. Hard Score Cap Verification (must be <= 65% due to multiple HIGH risks)
    assert.ok(result.health.score <= 65, `Expected score <= 65% due to multiple high risks, got ${result.health.score}`);
    assert.notStrictEqual(result.health.status, 'STRONG');

    // 7. Consistency: Chronological discrepancy
    assert.strictEqual(result.consistency.dateChronologyValid, false);
  });

  it('Test 3: Document Diff accurately computes line additions, removals, and unchanged blocks', () => {
    const originalText = `Section 1. Purpose
The purpose is confidential evaluation.
Section 2. Duration
The duration shall be 1 year.
Section 3. Governing Law
State of New York.`;

    const modifiedText = `Section 1. Purpose
The purpose is mutual technology and business evaluation.
Section 2. Duration
The duration shall be 3 years.
Section 3. Governing Law
State of Delaware.
Section 4. Jurisdiction
Courts of Wilmington.`;

    const diff = diffService.computeDiff(originalText, modifiedText);

    assert.ok(diff.lines.length > 0);
    assert.ok(diff.summary.addedCount > 0, 'Must have added lines');
    assert.ok(diff.summary.removedCount > 0, 'Must have removed lines');
    assert.ok(diff.summary.unchangedCount > 0, 'Must have unchanged lines');

    // Section 1 Purpose heading should be unchanged
    const unchangedPurpose = diff.lines.find(l => l.text === 'Section 1. Purpose');
    assert.ok(unchangedPurpose);
    assert.strictEqual(unchangedPurpose.type, 'unchanged');
  });

  it('Test 4: Fallback DOCX text extraction handles raw XML and strips formatting cleanly', () => {
    // Generate a minimal ZIP container containing word/document.xml
    const xmlContent = '<w:document><w:body><w:p><w:t>Confidential Agreement</w:t></w:p><w:p><w:t>Term: 2 years.</w:t></w:p></w:body></w:document>';
    const compressed = zlib.deflateRawSync(Buffer.from(xmlContent, 'utf8'));

    const filename = 'word/document.xml';
    const fnBuf = Buffer.from(filename, 'utf8');

    // Build ZIP local file header
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // Signature
    header.writeUInt16LE(20, 4);        // Version needed
    header.writeUInt16LE(0, 6);         // Flags
    header.writeUInt16LE(8, 8);         // Deflate compression
    header.writeUInt16LE(0, 10);        // Time
    header.writeUInt16LE(0, 12);        // Date
    header.writeUInt32LE(0, 14);        // CRC32
    header.writeUInt32LE(compressed.length, 18); // Compressed size
    header.writeUInt32LE(Buffer.byteLength(xmlContent), 22); // Uncompressed size
    header.writeUInt16LE(fnBuf.length, 26); // Filename length
    header.writeUInt16LE(0, 28);        // Extra field length

    const zipBuffer = Buffer.concat([header, fnBuf, compressed]);

    const extracted = contractAnalyzer.fallbackDocxExtract(zipBuffer);
    assert.ok(extracted.includes('Confidential Agreement'));
    assert.ok(extracted.includes('Term: 2 years.'));
  });
});

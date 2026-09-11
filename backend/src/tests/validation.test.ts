import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationEngine } from '../services/validation/validation_engine.js';

describe('MIRA Multi-Tier Validation Engine Tests', () => {
  it('should detect factual mismatch when duration in text contradicts structured fact', async () => {
    const structuredFacts = {
      disclosingParty: { name: 'ABC Technologies Pvt Ltd' },
      receivingParty: { name: 'XYZ Solutions Pvt Ltd' },
      duration: '3 years',
      governingLaw: 'India'
    };

    const sections = [
      {
        sectionType: 'parties',
        title: 'Parties',
        content: 'By and between ABC Technologies Pvt Ltd and XYZ Solutions Pvt Ltd.'
      },
      {
        sectionType: 'duration',
        title: '6. Term & Duration',
        content: 'This Agreement shall remain binding upon the Receiving Party for a period of 5 years from the Effective Date.'
      },
      {
        sectionType: 'signatures',
        title: 'Signatures',
        content: 'In witness whereof, the parties executed this agreement.'
      }
    ];

    const result = await validationEngine.validate('NDA', sections, structuredFacts);
    const durationMismatch = result.allIssues.find(i => i.type === 'FACT_MISMATCH' && i.section === 'Duration');

    assert.ok(durationMismatch, 'Expected a FACT_MISMATCH issue for Duration');
    assert.strictEqual(durationMismatch?.severity, 'HIGH');
    assert.strictEqual(result.status, 'NEEDS_REVIEW');
  });

  it('should pass validation when facts and sections are strictly consistent', async () => {
    const structuredFacts = {
      disclosingParty: { name: 'ABC Technologies Pvt Ltd' },
      receivingParty: { name: 'XYZ Solutions Pvt Ltd' },
      duration: '3 years',
      governingLaw: 'India'
    };

    const sections = [
      {
        sectionType: 'parties',
        title: '1. Parties',
        content: 'This Non-Disclosure Agreement is by and between ABC Technologies Pvt Ltd and XYZ Solutions Pvt Ltd.'
      },
      {
        sectionType: 'purpose',
        title: '2. Purpose',
        content: 'The parties wish to explore a potential business relationship.'
      },
      {
        sectionType: 'definition',
        title: '3. Definition of Confidential Information',
        content: 'Confidential Information includes all technical and commercial proprietary data.'
      },
      {
        sectionType: 'confidentiality',
        title: '4. Non-Disclosure Obligations',
        content: 'The Receiving Party shall maintain confidentiality and not disclose without written permission.'
      },
      {
        sectionType: 'exceptions',
        title: '5. Exclusions and Exceptions',
        content: 'Confidential information excludes publicly known information.'
      },
      {
        sectionType: 'permitted_disclosure',
        title: '6. Permitted Disclosure',
        content: 'Disclosure is permitted to employees with a need to know.'
      },
      {
        sectionType: 'return_destruction',
        title: '7. Return of Materials',
        content: 'Upon termination, recipient shall return or destroy all confidential materials.'
      },
      {
        sectionType: 'duration',
        title: '8. Term & Duration',
        content: 'This Agreement shall remain binding upon the Receiving Party for a period of 3 years from the Effective Date.'
      },
      {
        sectionType: 'remedies',
        title: '9. Remedies',
        content: 'Breach may cause irreparable harm entitling injunctive relief.'
      },
      {
        sectionType: 'governing_law',
        title: '10. Governing Law',
        content: 'This Agreement is governed by the laws of India.'
      },
      {
        sectionType: 'dispute_resolution',
        title: '11. Dispute Resolution',
        content: 'Disputes shall be settled through arbitration.'
      },
      {
        sectionType: 'miscellaneous',
        title: '12. Miscellaneous',
        content: 'This constitutes the entire agreement between the parties.'
      },
      {
        sectionType: 'signatures',
        title: '13. Signatures',
        content: 'In witness whereof, authorized representatives have executed this agreement.'
      }
    ];

    const result = await validationEngine.validate('NDA', sections, structuredFacts);
    const factMismatches = result.allIssues.filter(i => i.type === 'FACT_MISMATCH');

    assert.strictEqual(factMismatches.length, 0);
    assert.ok(result.overallScore >= 80);
  });
});

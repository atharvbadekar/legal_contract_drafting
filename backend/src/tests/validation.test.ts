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
        title: 'Parties',
        content: 'By and between ABC Technologies Pvt Ltd and XYZ Solutions Pvt Ltd.'
      },
      {
        sectionType: 'duration',
        title: '6. Term & Duration',
        content: 'This Agreement shall remain binding upon the Receiving Party for a period of 3 years from the Effective Date.'
      },
      {
        sectionType: 'governing_law',
        title: 'Governing Law',
        content: 'This Agreement is governed by the laws of India.'
      },
      {
        sectionType: 'signatures',
        title: 'Signatures',
        content: 'In witness whereof, authorized representatives have executed this agreement.'
      }
    ];

    const result = await validationEngine.validate('NDA', sections, structuredFacts);
    const factMismatches = result.allIssues.filter(i => i.type === 'FACT_MISMATCH');

    assert.strictEqual(factMismatches.length, 0);
    assert.ok(result.overallScore >= 80);
  });
});

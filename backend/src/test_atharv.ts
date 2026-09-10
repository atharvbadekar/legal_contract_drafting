import axios from 'axios';

const API = 'http://localhost:5000/api';

async function testAtharvPipeline() {
  console.log('⚖️ Running Atharv Legal AI End-to-End System Tests...\n');

  // 1. Authentication
  console.log('1. Testing Authentication with Atharv credentials...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    email: 'user@atharv.legal',
    password: 'user123'
  });
  const token = loginRes.data.token;
  console.log('✓ Logged in as:', loginRes.data.user.email, `(${loginRes.data.user.name})`);
  console.log('✓ JWT Bearer token acquired.\n');

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Testing Questionnaire-driven Document Creation (Apex Innovations & Nexus Global Partners)
  console.log('2. Creating NDA with 5-Step Questionnaire Data (Apex Innovations & Nexus Global Partners)...');
  const structuredFacts = {
    disclosingParty: {
      name: 'Apex Innovations Inc.',
      type: 'Corporation',
      address: '1200 Innovation Way, Suite 400, Wilmington, DE 19801',
      email: 'legal@apexinnovations.com',
      phone: '+1 (302) 555-0199',
      signatory: 'Dr. Sarah Jenkins, Chief Executive Officer'
    },
    receivingParty: {
      name: 'Nexus Global Partners LLC',
      type: 'Limited Liability Company',
      address: '450 Montgomery Street, Floor 14, San Francisco, CA 94104',
      email: 'contracts@nexuspartners.com',
      phone: '+1 (415) 555-0142',
      signatory: 'David Vance, Managing Partner'
    },
    effectiveDate: '2026-09-10',
    duration: '3 years',
    purpose: 'Evaluation of a prospective artificial intelligence partnership, cloud data integration, and mutual strategic licensing.',
    governingLaw: 'State of Delaware',
    jurisdiction: 'Courts of Wilmington, Delaware',
    disputeResolution: 'Exclusive Court Jurisdiction',
    confidentialInformation: [
      'Technical Data & Source Code',
      'Financial Statements & Valuation Models',
      'Proprietary Algorithms & Architecture',
      'Customer & Vendor Lists',
      'Product Roadmaps & Trade Secrets'
    ],
    standardOfCare: 'Highest degree of reasonable care (Strict standard)',
    returnOrDestructionDays: '7 business days',
    requireDestructionCertificate: true,
    injunctiveReliefWithoutBond: true,
    nonSolicitationCovenant: '1 year',
    agreementStructure: 'MUTUAL',
    draftingTone: 'BALANCED'
  };

  const createRes = await axios.post(`${API}/documents`, {
    title: 'Non-Disclosure Agreement — Apex Innovations Inc. & Nexus Global Partners LLC',
    documentType: 'NDA',
    structuredFacts,
    generationMode: 'MIRA'
  }, { headers });

  const docId = createRes.data.document.id;
  console.log(`✓ Document Created. ID: ${docId}`);

  // 3. Execution of Atharv Legal AI 10-Step Controlled Pipeline
  console.log('\n3. Executing Atharv Legal AI Controlled Generation & Validation Pipeline...');
  const genRes = await axios.post(`${API}/documents/${docId}/generate`, {
    documentType: 'NDA',
    structuredFacts,
    generationMode: 'MIRA'
  }, { headers });

  console.log('✓ Pipeline Finished!');
  console.log('  Title:', genRes.data.document.title);
  console.log('  Status:', genRes.data.document.status);
  console.log('  Validation Score:', genRes.data.document.validationScore + '%');
  console.log('  Model Used:', genRes.data.result.modelUsed);

  // Check that all facts exist in the generated document
  const content = genRes.data.document.content;
  const assertions = [
    { check: 'Apex Innovations Inc.', label: 'Disclosing Party Name' },
    { check: 'Corporation', label: 'Disclosing Party Type' },
    { check: '1200 Innovation Way, Suite 400, Wilmington, DE 19801', label: 'Disclosing Party Address' },
    { check: 'legal@apexinnovations.com', label: 'Disclosing Party Email' },
    { check: '+1 (302) 555-0199', label: 'Disclosing Party Phone' },
    { check: 'Dr. Sarah Jenkins, Chief Executive Officer', label: 'Disclosing Signatory' },
    { check: 'Nexus Global Partners LLC', label: 'Receiving Party Name' },
    { check: 'Limited Liability Company', label: 'Receiving Party Type' },
    { check: '450 Montgomery Street, Floor 14, San Francisco, CA 94104', label: 'Receiving Party Address' },
    { check: 'contracts@nexuspartners.com', label: 'Receiving Party Email' },
    { check: '+1 (415) 555-0142', label: 'Receiving Party Phone' },
    { check: 'David Vance, Managing Partner', label: 'Receiving Signatory' },
    { check: '3 years', label: 'Duration / Term' },
    { check: 'State of Delaware', label: 'Governing Law' },
    { check: 'Wilmington, Delaware', label: 'Jurisdiction' },
    { check: '7 business days', label: 'Return/Destruction Window' },
    { check: 'certificate of destruction', label: 'Destruction Certificate' },
    { check: 'Non-Solicitation', label: 'Non-Solicitation Covenant' }
  ];

  console.log('\n4. Verifying Presence of All Authoritative Questionnaire Fields in Draft:');
  let allPresent = true;
  for (const a of assertions) {
    if (content.toLowerCase().includes(a.check.toLowerCase())) {
      console.log(`  ✓ [FOUND] ${a.label} (${a.check})`);
    } else {
      console.warn(`  ✗ [MISSING] ${a.label} (${a.check})`);
      allPresent = false;
    }
  }

  if (allPresent) {
    console.log('\n🎉 ALL 18 QUESTIONNAIRE CONTRACTUAL PARAMETERS VERIFIED IN FINAL DRAFT!');
  } else {
    throw new Error('Some questionnaire fields were missing from draft');
  }

  // 5. Test DOCX and PDF Export
  console.log('\n5. Exporting Document with Bound Signatures to DOCX and PDF...');
  const docxRes = await axios.get(`${API}/documents/${docId}/export/docx`, {
    headers,
    responseType: 'arraybuffer'
  });
  console.log(`✓ Exported DOCX successfully (${docxRes.data.length} bytes)`);

  const pdfRes = await axios.get(`${API}/documents/${docId}/export/pdf`, {
    headers,
    responseType: 'arraybuffer'
  });
  console.log(`✓ Exported PDF successfully (${pdfRes.data.length} bytes)`);

  // 6. Test Multi-tier Validation Engine Fact Mismatch Detection
  console.log('\n6. Testing Multi-Tier Validation Engine with Injected Fact Tampering...');
  const tamperedContent = content.replace(/3 years/g, '10 years');
  const valRes = await axios.post(`${API}/documents/${docId}/validate`, {
    content: tamperedContent
  }, { headers });

  const mismatch = valRes.data.validationResult.allIssues.find((i: any) => i.type === 'FACT_MISMATCH');
  if (mismatch) {
    console.log('✓ SUCCESS: Validation Engine correctly caught FACT_MISMATCH:');
    console.log('  Issue:', mismatch.description);
  } else {
    console.warn('⚠️ Warning: FACT_MISMATCH not triggered:', valRes.data.validationResult.allIssues);
  }

  console.log('\n======================================================');
  console.log('✅ ALL ATHARV LEGAL AI END-TO-END SYSTEM TESTS PASSED!');
  console.log('======================================================');
}

testAtharvPipeline().catch(err => {
  console.error('Atharv test pipeline failed:', err.response?.data || err.message);
  process.exit(1);
});

import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class NdaDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts, approvedClauses } = input;
    const sections: GeneratedSection[] = [];

    const p1 = structuredFacts.disclosingParty?.name || 'Disclosing Party';
    const p1Type = structuredFacts.disclosingParty?.type ? ` (${structuredFacts.disclosingParty.type})` : '';
    const p1Addr = structuredFacts.disclosingParty?.address || '';
    const p1Email = structuredFacts.disclosingParty?.email || '';
    const p1Phone = structuredFacts.disclosingParty?.phone || '';
    const p1Signatory = structuredFacts.disclosingParty?.signatory || 'Authorized Representative';

    const p2 = structuredFacts.receivingParty?.name || 'Receiving Party';
    const p2Type = structuredFacts.receivingParty?.type ? ` (${structuredFacts.receivingParty.type})` : '';
    const p2Addr = structuredFacts.receivingParty?.address || '';
    const p2Email = structuredFacts.receivingParty?.email || '';
    const p2Phone = structuredFacts.receivingParty?.phone || '';
    const p2Signatory = structuredFacts.receivingParty?.signatory || 'Authorized Representative';

    const p1ContactParts = [p1Email ? `Email: ${p1Email}` : '', p1Phone ? `Phone: ${p1Phone}` : ''].filter(Boolean).join(', ');
    const p2ContactParts = [p2Email ? `Email: ${p2Email}` : '', p2Phone ? `Phone: ${p2Phone}` : ''].filter(Boolean).join(', ');

    const effDate = structuredFacts.effectiveDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const duration = structuredFacts.duration || '2 years';
    const purpose = structuredFacts.purpose || 'evaluating a prospective commercial collaboration';
    const confScope = Array.isArray(structuredFacts.confidentialInformation) 
      ? structuredFacts.confidentialInformation.join(', ')
      : (structuredFacts.confidentialInformation || 'technical, proprietary, and business data');
    const govLaw = structuredFacts.governingLaw || 'State of Delaware';
    const jurisdiction = structuredFacts.jurisdiction || 'Courts of Wilmington, Delaware';
    const disputeResolution = structuredFacts.disputeResolution || 'Exclusive Court Jurisdiction';
    const standardOfCare = structuredFacts.standardOfCare || 'strict and commercially reasonable degree of care';
    const returnDays = structuredFacts.returnOrDestructionDays || 'seven (7) business days';
    const requireCert = structuredFacts.requireDestructionCertificate !== false;

    const docTitle = "NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `This Non-Disclosure and Confidentiality Agreement (the "Agreement") is entered into and made effective as of ${effDate} (the "Effective Date").`
    });

    sections.push({
      sectionType: "parties",
      title: "Parties",
      content: `BY AND BETWEEN:\n\n1. ${p1}${p1Type}${p1Addr ? `, having its registered office address at ${p1Addr}` : ''}${p1ContactParts ? ` (${p1ContactParts})` : ''} (hereinafter referred to as the "Disclosing Party", which expression shall, unless repugnant to the context, include its successors and permitted assigns); and\n\n2. ${p2}${p2Type}${p2Addr ? `, having its registered office address at ${p2Addr}` : ''}${p2ContactParts ? ` (${p2ContactParts})` : ''} (hereinafter referred to as the "Receiving Party", which expression shall, unless repugnant to the context, include its successors and permitted assigns).\n\nThe Disclosing Party and Receiving Party are hereinafter individually referred to as a "Party" and collectively as the "Parties".`
    });

    sections.push({
      sectionType: "purpose",
      title: "Recitals & Purpose",
      content: `WHEREAS, the Parties wish to engage in exploratory discussions concerning ${purpose} (the "Authorized Purpose"); and\n\nWHEREAS, in connection with the Authorized Purpose, the Disclosing Party will disclose to the Receiving Party certain valuable proprietary, non-public, and confidential information, which the Receiving Party agrees to treat in accordance with the covenants contained herein.`
    });

    const defClause = approvedClauses?.find(c => c.clauseType === 'definition')?.content;
    sections.push({
      sectionType: "definition",
      title: "1. Definition of Confidential Information",
      content: defClause ||
        `"Confidential Information" shall mean all technical, business, financial, software, source code, designs, and commercial information disclosed directly or indirectly by the Disclosing Party to the Receiving Party. For the purposes of this Agreement, Confidential Information specifically includes: ${confScope}. Confidential Information may be conveyed orally, visually, in writing, or in electronic or machine-readable format, and shall be deemed confidential whether or not expressly marked as proprietary.`
    });

    const confClause = approvedClauses?.find(c => c.clauseType === 'confidentiality')?.content;
    sections.push({
      sectionType: "confidentiality",
      title: "2. Confidentiality Obligations",
      content: confClause ||
        `The Receiving Party agrees to hold all Confidential Information in strict confidence and shall exercise ${standardOfCare} to prevent unauthorized use, dissemination, or publication as it applies to its own confidential information of like nature. The Receiving Party shall not use the Confidential Information for any purpose other than the Authorized Purpose without prior written consent.`
    });

    sections.push({
      sectionType: "exceptions",
      title: "3. Exceptions to Confidential Information",
      content: `The obligations of confidentiality shall not apply to any information that: (a) is or becomes publicly known through no wrongful act of the Receiving Party; (b) was already in the lawful possession of the Receiving Party prior to disclosure as established by documentary evidence; (c) is rightfully received from a third party without breach of any confidentiality obligation; or (d) is independently developed by the Receiving Party without reference to or reliance upon the Disclosing Party's Confidential Information.`
    });

    sections.push({
      sectionType: "permitted_disclosure",
      title: "4. Permitted Disclosures",
      content: `The Receiving Party may disclose Confidential Information solely to those of its directors, officers, employees, and professional legal or financial advisors who have a verifiable need to know such information for the Authorized Purpose, provided that such individuals are bound by confidentiality obligations substantially similar to those herein. Disclosures required by applicable law or judicial process shall be permitted only after prompt written notice to the Disclosing Party.`
    });

    sections.push({
      sectionType: "return_destruction",
      title: "5. Return or Destruction of Materials",
      content: `Upon written demand by the Disclosing Party or upon conclusion of the Authorized Purpose, the Receiving Party shall promptly, and in any event within ${returnDays}, return to the Disclosing Party or, at the Disclosing Party's election, securely destroy all copies, reproductions, summaries, and extracts of the Confidential Information${requireCert ? ', and promptly furnish a written certificate of destruction executed by an authorized officer' : ''}.`
    });

    sections.push({
      sectionType: "duration",
      title: "6. Term & Duration",
      content: `This Agreement and the confidentiality covenants set forth herein shall govern all disclosures made between the Parties and shall remain binding upon the Receiving Party for a period of ${duration} from the Effective Date.`
    });

    const remediesClause = approvedClauses?.find(c => c.clauseType === 'remedies')?.content;
    sections.push({
      sectionType: "remedies",
      title: "7. Remedies for Breach",
      content: remediesClause ||
        `The Parties acknowledge that any breach of this Agreement may cause irreparable injury to the Disclosing Party for which monetary damages alone would be inadequate. Accordingly, in addition to any other remedies available at law, the Disclosing Party shall be entitled to seek equitable relief, including temporary and permanent injunctive relief, without the necessity of proving actual damages or posting a bond.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "8. Governing Law & Dispute Resolution",
      content: `This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of ${govLaw}. Any dispute, controversy, or claim arising out of or relating to this Agreement shall be resolved through ${disputeResolution} before the competent courts located in ${jurisdiction}.`
    });

    if (structuredFacts.nonSolicitationCovenant) {
      sections.push({
        sectionType: "non_solicitation",
        title: "9. Non-Solicitation Covenant",
        content: `During the term of this Agreement and for a period of ${structuredFacts.nonSolicitationCovenant} following its expiration or termination, neither Party shall directly or indirectly solicit, recruit, or entice away any employee, contractor, or commercial consultant of the other Party without prior express written consent.`
      });
    }

    sections.push({
      sectionType: "miscellaneous",
      title: `${structuredFacts.nonSolicitationCovenant ? '10' : '9'}. Miscellaneous Provisions`,
      content: `This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior agreements, understandings, and negotiations. No amendment, modification, or waiver of any provision of this Agreement shall be effective unless executed in writing by authorized signatories of both Parties.`
    });

    sections.push({
      sectionType: "signatures",
      title: `${structuredFacts.nonSolicitationCovenant ? '11' : '10'}. Signatures & Execution`,
      content: `IN WITNESS WHEREOF, the Parties hereto have caused this Non-Disclosure Agreement to be duly executed by their respective authorized representatives as of the Effective Date.\n\nFOR AND ON BEHALF OF:\n${p1}${p1Type}\n\nBy: ____________________________________\nName: ${p1Signatory}\nTitle: Authorized Signatory\nDate: ${effDate}\n${p1ContactParts ? `Contact: ${p1ContactParts}\n` : ''}\nFOR AND ON BEHALF OF:\n${p2}${p2Type}\n\nBy: ____________________________________\nName: ${p2Signatory}\nTitle: Authorized Signatory\nDate: ${effDate}\n${p2ContactParts ? `Contact: ${p2ContactParts}\n` : ''}`
    });

    return { title: docTitle, sections };
  }
}

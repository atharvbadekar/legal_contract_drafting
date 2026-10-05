import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class MouDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const party1Name = structuredFacts.partyA?.name || structuredFacts.party1?.name || (typeof structuredFacts.partyA === 'string' ? structuredFacts.partyA : 'First Party');
    const party1Addr = structuredFacts.partyA?.address || structuredFacts.party1?.address || 'Principal Office Address';

    const party2Name = structuredFacts.partyB?.name || structuredFacts.party2?.name || (typeof structuredFacts.partyB === 'string' ? structuredFacts.partyB : 'Second Party');
    const party2Addr = structuredFacts.partyB?.address || structuredFacts.party2?.address || 'Principal Office Address';

    const purpose = structuredFacts.purpose || 'mutual collaboration and joint technical initiatives';
    const effectiveDate = structuredFacts.effectiveDate || new Date().toISOString().split('T')[0];
    const term = structuredFacts.term || '2 years';
    const governingLaw = structuredFacts.governingLaw || 'Laws of India';

    const docTitle = "MEMORANDUM OF UNDERSTANDING";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `This Memorandum of Understanding (the "MOU") is entered into and made effective as of ${effectiveDate} by and between:\n\n1. ${party1Name}, having its office at ${party1Addr} (hereinafter "Party A"); and\n\n2. ${party2Name}, having its office at ${party2Addr} (hereinafter "Party B").\n\nParty A and Party B are collectively referred to as the "Parties".`
    });

    sections.push({
      sectionType: "purpose",
      title: "1. Purpose & Objectives",
      content: `The primary objective of this MOU is to establish a non-exclusive institutional framework to pursue: ${purpose}. The Parties intend to work collaboratively in good faith to advance shared goals.`
    });

    sections.push({
      sectionType: "scope",
      title: "2. Scope of Collaboration",
      content: `The collaboration between the Parties may include joint research projects, technical seminars, student/practitioner exchanges, and cooperative initiatives as mutually agreed upon in writing.`
    });

    sections.push({
      sectionType: "non_binding",
      title: "3. Nature of Understanding",
      content: `NON-BINDING UNDERSTANDING: This MOU is a declaration of mutual intent and, except for provisions relating to Confidentiality, Governing Law, and Signatures, does not create legally binding financial commitments. Any specific project requiring resource allocation shall be governed by a separate definitive agreement.`
    });

    sections.push({
      sectionType: "confidentiality",
      title: "4. Confidentiality",
      content: `Each Party agrees to hold in confidence all proprietary materials and data exchanged in connection with this MOU, and shall not disclose such information to third parties without prior written consent.`
    });

    sections.push({
      sectionType: "term_termination",
      title: "5. Duration & Withdrawal",
      content: `This MOU shall remain in effect for a period of ${term} from the Effective Date. Either Party may terminate this MOU at any time by providing thirty (30) days prior written notice to the other Party.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "6. Governing Law & Dispute Resolution",
      content: `This MOU shall be interpreted in accordance with the ${governingLaw}. Any differences arising out of this understanding shall be resolved amicably through mutual discussions between authorized heads of the respective institutions.`
    });

    sections.push({
      sectionType: "signatures",
      title: "7. Signatures & Understanding",
      content: `IN WITNESS WHEREOF, the Parties have signed this Memorandum of Understanding as of the Effective Date.\n\nFOR ${party1Name}:\n\nBy: ____________________________________\nName: Authorized Representative\nTitle: Institutional Head\n\nFOR ${party2Name}:\n\nBy: ____________________________________\nName: Authorized Representative\nTitle: Institutional Head`
    });

    return { title: docTitle, sections };
  }
}

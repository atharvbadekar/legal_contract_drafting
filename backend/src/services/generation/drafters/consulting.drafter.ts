import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class ConsultingDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const clientName = structuredFacts.client?.name || 'Client';
    const clientAddr = structuredFacts.client?.address || 'Client Registered Address';

    const consultantName = structuredFacts.consultant?.name || 'Consultant';
    const consultantAddr = structuredFacts.consultant?.address || 'Consultant Address';

    const scope = structuredFacts.scopeOfServices || 'Specialized strategic and advisory consulting services';
    const comp = structuredFacts.compensation || '15,000';
    const currency = structuredFacts.currency || 'USD';
    const startDate = structuredFacts.startDate || new Date().toISOString().split('T')[0];
    const term = structuredFacts.term || '6 months';
    const governingLaw = structuredFacts.governingLaw || 'State of California';

    const docTitle = "CONSULTING AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `This Consulting Agreement (the "Agreement") is made effective as of ${startDate} by and between:\n\n1. ${clientName}, having its office at ${clientAddr} (the "Client"); and\n\n2. ${consultantName}, residing/operating at ${consultantAddr} (the "Consultant").\n\nThe Client and Consultant are collectively referred to as the "Parties".`
    });

    sections.push({
      sectionType: "services",
      title: "1. Consulting Services",
      content: `The Consultant shall provide the Client with specialized advisory services: ${scope}. The Consultant shall devote necessary professional time and skill to perform the services faithfully.`
    });

    sections.push({
      sectionType: "independent_status",
      title: "2. Independent Contractor Relationship",
      content: `The Consultant is an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship, partnership, or joint venture between the Parties.`
    });

    sections.push({
      sectionType: "compensation",
      title: "3. Consulting Fees & Payment",
      content: `In consideration for the advisory services, the Client shall pay the Consultant ${currency} ${comp}. Payment shall be made against invoices submitted by the Consultant within thirty (30) days of receipt.`
    });

    sections.push({
      sectionType: "ip_rights",
      title: "4. Work Product & Inventions",
      content: `All original reports, memoranda, technical recommendations, and written materials prepared by the Consultant specifically for the Client under this Agreement shall belong exclusively to the Client upon payment in full.`
    });

    sections.push({
      sectionType: "confidentiality",
      title: "5. Confidentiality",
      content: `The Consultant agrees to preserve the confidentiality of all proprietary Client information disclosed during the engagement and shall not disclose such information to any third party without prior written authorization.`
    });

    sections.push({
      sectionType: "term_termination",
      title: "6. Term & Termination",
      content: `This Agreement shall be effective for a period of ${term} from the Effective Date. Either Party may terminate this Agreement at any time upon fourteen (14) days prior written notice.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "7. Governing Law",
      content: `This Agreement shall be governed by and construed in accordance with the laws of the ${governingLaw}.`
    });

    sections.push({
      sectionType: "signatures",
      title: "8. Signatures & Execution",
      content: `IN WITNESS WHEREOF, the Parties have executed this Consulting Agreement as of the date first above written.\n\nFOR THE CLIENT:\n${clientName}\n\nBy: ____________________________________\nName: Authorized Signatory\n\nFOR THE CONSULTANT:\n${consultantName}\n\nBy: ____________________________________\nName: ${consultantName}`
    });

    return { title: docTitle, sections };
  }
}

import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class ServiceDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const clientName = structuredFacts.client?.name || 'Client';
    const clientAddr = structuredFacts.client?.address || 'Client Registered Address';

    const providerName = structuredFacts.serviceProvider?.name || 'Service Provider';
    const providerAddr = structuredFacts.serviceProvider?.address || 'Provider Registered Address';

    const scope = structuredFacts.scopeOfServices || 'Professional technical consulting and engineering services';
    const deliverables = structuredFacts.deliverables || 'Agreed software deliverables, design documentation, and milestone releases';
    const fees = structuredFacts.fees || '50,000';
    const currency = structuredFacts.currency || 'USD';
    const paymentSchedule = structuredFacts.paymentSchedule || 'milestone-based';
    const invoiceDays = structuredFacts.invoicePaymentDays || '30';
    const commencementDate = structuredFacts.commencementDate || new Date().toISOString().split('T')[0];
    const duration = structuredFacts.duration || '1 year';
    const governingLaw = structuredFacts.governingLaw || 'State of New York';

    const docTitle = "MASTER SERVICES AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `This Master Services Agreement (the "Agreement") is entered into and made effective as of ${commencementDate} (the "Effective Date") by and between:\n\n1. ${clientName}, having its principal place of business at ${clientAddr} (the "Client"); and\n\n2. ${providerName}, having its principal place of business at ${providerAddr} (the "Service Provider").\n\nThe Client and the Service Provider are collectively referred to as the "Parties" and individually as a "Party".`
    });

    sections.push({
      sectionType: "scope",
      title: "1. Scope of Services & Engagements",
      content: `The Service Provider shall perform professional services as described herein: ${scope}. The Service Provider shall exercise commercially reasonable skill, diligence, and care commensurate with prevailing industry standards.`
    });

    sections.push({
      sectionType: "deliverables",
      title: "2. Deliverables & Acceptance Procedure",
      content: `The Service Provider shall deliver to the Client: ${deliverables}. The Client shall have ten (10) business days following receipt of each deliverable to review and inspect. Unless written notice of non-conformity is delivered within such period, the deliverable shall be deemed accepted.`
    });

    sections.push({
      sectionType: "fees",
      title: "3. Consideration & Payment Terms",
      content: `In consideration for the satisfactory performance of services, the Client shall pay the Service Provider the total sum of ${currency} ${fees}. Invoices shall be rendered in accordance with the ${paymentSchedule} schedule and shall be payable within ${invoiceDays} days from date of receipt.`
    });

    sections.push({
      sectionType: "term_termination",
      title: "4. Term & Termination",
      content: `This Agreement shall commence on ${commencementDate} and continue in full force for a term of ${duration}. Either Party may terminate upon thirty (30) days prior written notice for convenience, or immediately upon written notice if the other Party commits a material breach and fails to cure within fifteen (15) days.`
    });

    sections.push({
      sectionType: "ip_ownership",
      title: "5. Intellectual Property Rights",
      content: `INTELLECTUAL PROPERTY: Upon full payment of all consideration due hereunder, all newly created deliverables, source code, and custom documentation specifically developed for the Client shall be assigned to and become the exclusive property of the Client. Service Provider retains sole ownership of its pre-existing tools, libraries, and proprietary methodologies.`
    });

    sections.push({
      sectionType: "confidentiality",
      title: "6. Confidentiality Obligations",
      content: `Each Party agrees to hold all non-public, technical, commercial, and financial disclosures of the other Party in confidence for a period of three (3) years following termination, exercising no less than reasonable care.`
    });

    sections.push({
      sectionType: "liability",
      title: "7. Limitation of Liability",
      content: `LIMITATION OF LIABILITY: Neither Party shall be liable for indirect, incidental, punitive, or consequential damages. The aggregate liability of either Party arising out of this Agreement shall not exceed the total fees paid or payable by Client to Service Provider under this Agreement in the preceding twelve (12) months.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "8. Governing Law & Dispute Resolution",
      content: `This Agreement shall be governed by and construed in accordance with the substantive laws of ${governingLaw}. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction.`
    });

    sections.push({
      sectionType: "signatures",
      title: "9. Signatures & Execution",
      content: `IN WITNESS WHEREOF, the Parties have caused this Master Services Agreement to be executed by their authorized representatives as of the Effective Date.\n\nFOR THE CLIENT:\n${clientName}\n\nBy: ____________________________________\nName: Authorized Signatory\nTitle: Corporate Representative\n\nFOR THE SERVICE PROVIDER:\n${providerName}\n\nBy: ____________________________________\nName: Authorized Signatory\nTitle: Corporate Representative`
    });

    return { title: docTitle, sections };
  }
}

import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class SaasDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const providerName = structuredFacts.provider?.name || 'SaaS Provider Inc.';
    const providerAddr = structuredFacts.provider?.address || 'Provider Address';

    const customerName = structuredFacts.customer?.name || 'Customer Organization';
    const customerAddr = structuredFacts.customer?.address || 'Customer Address';

    const productName = structuredFacts.productName || 'Mira Legal AI Suite';
    const fee = structuredFacts.subscriptionFee || '12,000';
    const currency = structuredFacts.currency || 'USD';
    const billingCycle = structuredFacts.billingCycle || 'Annual';
    const startDate = structuredFacts.startDate || new Date().toISOString().split('T')[0];
    const initialTerm = structuredFacts.initialTerm || '1 year';
    const uptimeSLA = structuredFacts.uptimeSLA || '99.9%';
    const governingLaw = structuredFacts.governingLaw || 'State of Delaware';

    const docTitle = "SOFTWARE AS A SERVICE (SAAS) AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `This Software as a Service Agreement (the "Agreement") is made effective as of ${startDate} (the "Effective Date") by and between:\n\n1. ${providerName}, having its office at ${providerAddr} (the "Provider"); and\n\n2. ${customerName}, having its office at ${customerAddr} (the "Customer").\n\nThe Provider and Customer are referred to individually as a "Party" and collectively as the "Parties".`
    });

    sections.push({
      sectionType: "subscription_grant",
      title: "1. Subscription Grant & Access Rights",
      content: `Subject to the terms and timely payment of fees, the Provider grants the Customer a non-exclusive, non-transferable, worldwide right to access and utilize ${productName} during the Subscription Term solely for its internal business operations.`
    });

    sections.push({
      sectionType: "sla",
      title: "2. Service Availability & SLA",
      content: `The Provider shall use commercially reasonable efforts to ensure the cloud service maintains target availability of ${uptimeSLA} during each calendar month, excluding scheduled maintenance windows notified in advance.`
    });

    sections.push({
      sectionType: "fees",
      title: "3. Fees & Payment Terms",
      content: `The Customer shall pay the recurring subscription fee of ${currency} ${fee} per ${billingCycle}. All fees are due and payable thirty (30) days from invoice date and are non-refundable except as expressly provided herein.`
    });

    sections.push({
      sectionType: "data_security",
      title: "4. Customer Data & Security",
      content: `DATA SECURITY & SOVEREIGNTY: The Customer retains all right, title, and ownership interest in all electronic data or materials submitted into the service ("Customer Data"). The Provider shall maintain reasonable administrative, physical, and technical safeguards to protect the security and confidentiality of Customer Data.`
    });

    sections.push({
      sectionType: "term_renewal",
      title: "5. Term & Auto-Renewal",
      content: `The initial subscription term shall be ${initialTerm} commencing on ${startDate}. The subscription shall automatically renew for successive terms of equal duration unless either Party provides written notice of non-renewal at least thirty (30) days prior to the expiration of the then-current term.`
    });

    sections.push({
      sectionType: "liability",
      title: "6. Limitation of Liability",
      content: `In no event shall either Party be liable for lost profits, loss of business, or consequential damages. The aggregate liability of Provider shall be capped at the total amount paid by Customer under this Agreement in the twelve (12) months preceding the incident.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "7. Governing Law",
      content: `This Agreement shall be governed by and construed under the laws of the ${governingLaw}.`
    });

    sections.push({
      sectionType: "signatures",
      title: "8. Signatures & Execution",
      content: `IN WITNESS WHEREOF, the Parties have executed this Software as a Service Agreement as of the Effective Date.\n\nFOR THE PROVIDER:\n${providerName}\n\nBy: ____________________________________\nName: Authorized Signatory\n\nFOR THE CUSTOMER:\n${customerName}\n\nBy: ____________________________________\nName: Authorized Signatory`
    });

    return { title: docTitle, sections };
  }
}

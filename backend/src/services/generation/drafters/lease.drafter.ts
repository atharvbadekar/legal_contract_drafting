import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class LeaseDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const landlordName = structuredFacts.landlord?.name || structuredFacts.lessor?.name || 'Landlord / Lessor';
    const landlordAddr = structuredFacts.landlord?.address || structuredFacts.lessor?.address || 'Landlord Residential Address';

    const tenantName = structuredFacts.tenant?.name || structuredFacts.lessee?.name || 'Tenant / Lessee';
    const tenantAddr = structuredFacts.tenant?.address || structuredFacts.lessee?.address || 'Tenant Permanent Address';

    const propertyAddress = structuredFacts.premisesAddress || structuredFacts.propertyAddress || structuredFacts.premises || 'Suite 400, Commercial Business Park, Sector 62, Gurgaon, Haryana';
    const monthlyRent = structuredFacts.monthlyRent || structuredFacts.rent || '75,000';
    const securityDeposit = structuredFacts.securityDepositMonths ? `${structuredFacts.securityDepositMonths} months' rent` : (structuredFacts.securityDeposit || structuredFacts.deposit || '2,25,000');
    const currency = structuredFacts.currency || 'USD';
    const term = structuredFacts.leaseTermMonths ? `${structuredFacts.leaseTermMonths} months` : (structuredFacts.term || structuredFacts.duration || '11 months');
    const commencementDate = structuredFacts.leaseCommencementDate || structuredFacts.commencementDate || structuredFacts.effectiveDate || new Date().toISOString().split('T')[0];
    const governingLaw = structuredFacts.governingLaw || 'Transfer of Property Act, 1882 and Laws of India';

    const docTitle = "COMMERCIAL / RESIDENTIAL LEASE AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `COMMERCIAL / RESIDENTIAL LEASE AGREEMENT\n\nThis Lease Agreement (the "Agreement") is entered into and made effective as of ${commencementDate} (the "Effective Date") by and between:\n\n1. ${landlordName}, residing at ${landlordAddr} (hereinafter referred to as the "Landlord" or "Lessor"); and\n\n2. ${tenantName}, residing/having office at ${tenantAddr} (hereinafter referred to as the "Tenant" or "Lessee").\n\nThe Landlord and Tenant are collectively referred to as the "Parties".`
    });

    sections.push({
      sectionType: "demised_premises",
      title: "1. Demised Premises & Description",
      content: `The Landlord hereby grants on lease to the Tenant, and the Tenant hereby accepts, the demised premises located at: ${propertyAddress} (the "Premises"), together with all existing permanent fixtures, fittings, and dedicated parking allocations.`
    });

    sections.push({
      sectionType: "term",
      title: "2. Lease Term & Commencement",
      content: `The term of this Lease shall be for a period of ${term}, commencing on ${commencementDate} (the "Commencement Date") and expiring at midnight on the anniversary thereof, unless renewed by mutual written agreement with standard five percent (5%) rent escalation.`
    });

    sections.push({
      sectionType: "monthly_rent",
      title: "3. Monthly Rent & Payment Procedure",
      content: `The Tenant shall pay the Landlord a monthly rent of ${currency} ${monthlyRent}, payable in advance on or before the fifth (5th) day of each calendar month via electronic bank transfer. Failure to pay rent for fifteen (15) days after due date shall incur statutory interest of twelve percent (12%) per annum.`
    });

    sections.push({
      sectionType: "security_deposit",
      title: "4. Interest-Free Refundable Security Deposit",
      content: `SECURITY DEPOSIT: Prior to occupancy, Tenant has deposited with Landlord an interest-free refundable security deposit of ${currency} ${securityDeposit}. This deposit shall secure faithful performance of covenants and shall be refunded in full within seven (7) business days following peaceful vacating and handover of possession, subject to deduction of unpaid utilities or damage repairs.`
    });

    sections.push({
      sectionType: "permitted_use",
      title: "5. Permitted Use & Maintenance Obligations",
      content: `The Premises shall be utilized solely for lawful commercial/residential purposes and not for hazardous, noisy, or offensive trades. The Tenant shall maintain the interior of the Premises in tenantable repair and good sanitary condition, normal wear and tear excepted.`
    });

    sections.push({
      sectionType: "alterations",
      title: "6. Structural Alterations & Improvements",
      content: `The Tenant shall not perform structural alterations, additions, or knock down partitions without prior written approval from the Landlord. Non-structural interior decor and modular installations may be made provided they are removed upon handover without causing property damage.`
    });

    sections.push({
      sectionType: "utilities",
      title: "7. Utilities, Common Charges & Taxes",
      content: `The Tenant shall promptly pay all metered electrical, water, internet, and air conditioning consumption charges. The Landlord shall remain responsible for property taxes, municipal rates, and external structural insurance levies.`
    });

    sections.push({
      sectionType: "default_eviction",
      title: "8. Default, Cure Period & Handover",
      content: `In the event of default in rent payment exceeding thirty (30) days or material breach of lease covenants, Landlord may terminate this Lease upon serving fifteen (15) days notice to cure. Upon expiration or termination, Tenant shall immediately surrender vacant, unencumbered possession to Landlord.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "9. Governing Law & Dispute Resolution",
      content: `This Lease shall be governed by, interpreted, and enforced in accordance with ${governingLaw}. Any dispute arising hereunder shall be subject to the exclusive jurisdiction of the competent civil courts having territorial jurisdiction.`
    });

    sections.push({
      sectionType: "signatures",
      title: "10. Execution & Acceptance",
      content: `IN WITNESS WHEREOF, the Landlord and Tenant have executed this Lease Agreement as of the date first above written.\n\nLANDLORD / LESSOR:\n${landlordName}\n\nSignature: ____________________________________\nDate: ${commencementDate}\n\nTENANT / LESSEE:\n${tenantName}\n\nSignature: ____________________________________\nDate: ${commencementDate}`
    });

    return { title: docTitle, sections };
  }
}

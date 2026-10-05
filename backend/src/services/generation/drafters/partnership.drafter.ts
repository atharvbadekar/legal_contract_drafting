import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class PartnershipDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const partner1Name = structuredFacts.partnerA?.name || structuredFacts.partner1?.name || structuredFacts.partyA?.name || structuredFacts.partner1Name || 'First Partner';
    const partner1Addr = structuredFacts.partnerA?.address || structuredFacts.partner1?.address || structuredFacts.partyA?.address || structuredFacts.partner1Address || 'Partner 1 Address';

    const partner2Name = structuredFacts.partnerB?.name || structuredFacts.partner2?.name || structuredFacts.partyB?.name || structuredFacts.partner2Name || 'Second Partner';
    const partner2Addr = structuredFacts.partnerB?.address || structuredFacts.partner2?.address || structuredFacts.partyB?.address || structuredFacts.partner2Address || 'Partner 2 Address';

    const businessName = structuredFacts.firmName || structuredFacts.businessName || 'Apex Strategic Partners LLP';
    const profitRatio = structuredFacts.profitSharingRatio || (structuredFacts.partnerA?.profitShare && structuredFacts.partnerB?.profitShare ? `${structuredFacts.partnerA.profitShare} : ${structuredFacts.partnerB.profitShare}` : '50:50');
    const capitalContribution = structuredFacts.capitalContribution || (structuredFacts.partnerA?.capitalContribution && structuredFacts.partnerB?.capitalContribution ? `${partner1Name} contributes ${structuredFacts.partnerA.capitalContribution}; ${partner2Name} contributes ${structuredFacts.partnerB.capitalContribution}` : 'Equal initial financial capital of INR 10,00,000 each');
    const businessPurpose = structuredFacts.businessActivity || structuredFacts.purpose || structuredFacts.businessPurpose || 'Commercial trading, technology services, and general business collaboration';
    const effectiveDate = structuredFacts.effectiveDate || new Date().toISOString().split('T')[0];
    const governingLaw = structuredFacts.governingLaw || 'Indian Partnership Act, 1932';

    const docTitle = "GENERAL PARTNERSHIP AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `GENERAL PARTNERSHIP AGREEMENT\n\nThis Partnership Agreement (the "Agreement") is entered into and made effective as of ${effectiveDate} by and between:\n\n1. ${partner1Name}, residing at ${partner1Addr} (hereinafter referred to as the "First Partner"); and\n\n2. ${partner2Name}, residing at ${partner2Addr} (hereinafter referred to as the "Second Partner").\n\nThe First Partner and Second Partner are collectively referred to as the "Partners".`
    });

    sections.push({
      sectionType: "business_name",
      title: "1. Business Name & Nature of Enterprise",
      content: `The Partners agree to associate themselves as commercial partners to carry on lawful commercial business under the firm name of ${businessName}. The principal purpose of the partnership shall be: ${businessPurpose}.`
    });

    sections.push({
      sectionType: "capital",
      title: "2. Capital Contributions & Accounts",
      content: `CAPITAL CONTRIBUTIONS: The initial capital of the Partnership shall be contributed by the Partners as follows: ${capitalContribution}. Capital accounts shall be maintained for each Partner recording initial contributions, additional capital injected, drawings, and allocated shares of net profits or losses.`
    });

    sections.push({
      sectionType: "profit_loss",
      title: "3. Profit & Loss Allocation",
      content: `The net profits and losses of the partnership business shall be apportioned between the Partners in the ratio of ${profitRatio}. Distribution of profits shall be conducted on a quarterly basis or as mutually determined by unanimous consent of the Partners.`
    });

    sections.push({
      sectionType: "management",
      title: "4. Management, Voting & Authority",
      content: `Each Partner shall have equal voice and rights in the management and conduct of the partnership business. Ordinary commercial decisions may be made by mutual consensus; provided that material transactions, including borrowing, lease obligations, or capital expenditures exceeding INR 5,00,000, shall require unanimous written approval.`
    });

    sections.push({
      sectionType: "banking",
      title: "5. Banking, Books & Financial Accounts",
      content: `All partnership funds shall be deposited in a designated scheduled commercial bank account in the firm name. Books of account shall be maintained in accordance with standard accounting principles and shall remain open for inspection by any Partner at all reasonable times.`
    });

    sections.push({
      sectionType: "withdrawal",
      title: "6. Partner Withdrawal, Retirement & Expulsion",
      content: `No Partner may withdraw or retire from the Partnership without tendering at least sixty (60) days prior written notice. In the event of retirement, the non-retiring Partner shall have the primary option to purchase the retiring Partner's interest at fair market book value.`
    });

    sections.push({
      sectionType: "dissolution",
      title: "7. Dissolution & Winding Up",
      content: `DISSOLUTION & WINDING UP: The Partnership may be dissolved by mutual written agreement of all Partners. Upon dissolution, partnership affairs shall be wound up, debts and liabilities discharged in accordance with statutory priority, and any surplus capital distributed strictly in accordance with profit-sharing ratios.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "8. Governing Law & Dispute Resolution",
      content: `This Agreement shall be governed by and construed in accordance with the substantive laws of India, including the ${governingLaw}. Any disputes between the Partners shall be referred to binding arbitration before a sole arbitrator appointed by mutual consent.`
    });

    sections.push({
      sectionType: "signatures",
      title: "9. Execution & Acceptance",
      content: `IN WITNESS WHEREOF, the Partners have set their hands and seals on this General Partnership Agreement as of the date first written above.\n\nSIGNED, SEALED AND DELIVERED BY:\n\n${partner1Name}\nPartner 1 Signature: ____________________________________\nDate: ${effectiveDate}\n\n${partner2Name}\nPartner 2 Signature: ____________________________________\nDate: ${effectiveDate}`
    });

    return { title: docTitle, sections };
  }
}

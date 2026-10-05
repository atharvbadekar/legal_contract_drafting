import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class LegalNoticeDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const senderName = structuredFacts.sender?.name || 'Complainant / Sender';
    const senderType = structuredFacts.sender?.type ? ` (${structuredFacts.sender.type})` : '';
    const senderAddr = structuredFacts.sender?.address || 'Registered Address';
    const senderEmail = structuredFacts.sender?.email || '';
    const senderPhone = structuredFacts.sender?.phone || '';
    const senderAdvocate = structuredFacts.sender?.advocate || 'Advocate & Legal Counsel';

    const recipientName = structuredFacts.recipient?.name || 'Addressee / Defaulting Party';
    const recipientType = structuredFacts.recipient?.type ? ` (${structuredFacts.recipient.type})` : '';
    const recipientAddr = structuredFacts.recipient?.address || 'Registered Address';
    const recipientEmail = structuredFacts.recipient?.email || '';
    const recipientPhone = structuredFacts.recipient?.phone || '';

    const noticeDate = structuredFacts.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const amount = structuredFacts.amount || '₹50,000';
    const interestRate = structuredFacts.interestRate || '18% per annum';
    const respPeriod = structuredFacts.responsePeriod || '15 days';
    const subject = structuredFacts.subject || `LEGAL NOTICE FOR NON-PAYMENT AND BREACH OF CONTRACT`;
    const jurisdiction = structuredFacts.jurisdiction || 'Jaipur, Rajasthan';
    const govLaw = structuredFacts.governingLaw || 'India';
    const transactionNature = structuredFacts.transactionNature || 'Provision of enterprise goods and professional services';
    const breachDesc = structuredFacts.breach || 'Willful failure and neglect to pay legitimate outstanding invoices for accepted deliverables';
    const invoiceNumbers = structuredFacts.invoiceNumbers ? ` (Ref. Invoices: ${structuredFacts.invoiceNumbers})` : '';
    const legalBasisArr = Array.isArray(structuredFacts.legalBasis) ? structuredFacts.legalBasis.join('; ') : (structuredFacts.legalBasis || 'Section 73 of the Indian Contract Act, 1872');

    const docTitle = `FORMAL LEGAL NOTICE`;

    sections.push({
      sectionType: "sender",
      title: "Sender & Advocate Details",
      content: `FROM:\nOffice of ${senderAdvocate}\nOn behalf of: ${senderName}${senderType}\nRegistered Address: ${senderAddr}\n${[senderEmail ? `Email: ${senderEmail}` : '', senderPhone ? `Phone: ${senderPhone}` : ''].filter(Boolean).join(' | ')}\nDate: ${noticeDate}\n\nSENT VIA REGISTERED POST WITH ACKNOWLEDGEMENT DUE / SPEED POST & EMAIL`
    });

    sections.push({
      sectionType: "recipient",
      title: "Addressee / Recipient",
      content: `TO:\n${recipientName}${recipientType}\nRegistered Address: ${recipientAddr}\n${[recipientEmail ? `Email: ${recipientEmail}` : '', recipientPhone ? `Phone: ${recipientPhone}` : ''].filter(Boolean).join(' | ')}`
    });

    sections.push({
      sectionType: "subject",
      title: "Subject",
      content: `SUBJECT: ${subject.toUpperCase()} — DEMAND FOR REMITTANCE OF OUTSTANDING SUM OF ${amount}${invoiceNumbers}.`
    });

    sections.push({
      sectionType: "background",
      title: "1. Background & Transactional History",
      content: `Sir/Madam,\n\nUnder instructions and authority from our Client, ${senderName}, we hereby serve upon you this formal Legal Notice. Our Client is a reputable entity with whom you entered into a binding commercial contract concerning: ${transactionNature}.`
    });

    sections.push({
      sectionType: "facts",
      title: "2. Statement of Facts",
      content: `Pursuant to the aforesaid engagement, our Client diligently performed all contracted milestones and delivered the agreed deliverables. Despite unconditional receipt and acceptance of deliverables, you have failed to discharge your corresponding financial liabilities.`
    });

    sections.push({
      sectionType: "breach",
      title: "3. Breach & Default",
      content: `Your failure constitutes a deliberate breach of agreement: ${breachDesc}. An aggregate principal sum of ${amount}${invoiceNumbers} remains overdue and outstanding on your account as of this date.`
    });

    sections.push({
      sectionType: "legal_basis",
      title: "4. Legal Basis",
      content: `Your unilateral default constitutes actionable breach under ${legalBasisArr} and the substantive laws of ${govLaw}, rendering you liable for interest, compensatory damages, and full litigation expenses.`
    });

    sections.push({
      sectionType: "demand",
      title: "5. Specific Demand",
      content: `In light of the above, we hereby call upon you to make unconditional payment of the outstanding principal sum of ${amount}, together with interest calculated at ${interestRate}, into our Client's designated bank account within ${respPeriod} from receipt of this notice.`
    });

    sections.push({
      sectionType: "response_period",
      title: "6. Response Period & Compliance Deadline",
      content: `You are hereby accorded a strict window of ${respPeriod} from the delivery of this notice to liquidate the debt or provide written response.`
    });

    sections.push({
      sectionType: "consequences",
      title: "7. Consequences of Default",
      content: `Take notice that in the event of failure to comply within ${respPeriod}, our Client has given peremptory instructions to initiate civil recovery and legal proceedings before the competent courts of ${jurisdiction}, holding you liable for all legal costs and damages.`
    });

    sections.push({
      sectionType: "closing",
      title: "8. Closing & Counsel Signature",
      content: `A copy of this notice is retained in our office for future reference and for production before the court of law.\n\nYours faithfully,\n\n____________________________________\n${senderAdvocate}\nLegal Counsel for ${senderName}`
    });

    return { title: docTitle, sections };
  }
}

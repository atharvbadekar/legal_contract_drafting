import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class EmploymentDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const employerName = structuredFacts.employer?.name || 'Company / Employer';
    const employerAddr = structuredFacts.employer?.address || 'Registered Office Address';
    const employerSignatory = structuredFacts.employer?.signatory || 'Authorized Representative';

    const employeeName = structuredFacts.employee?.name || 'Employee';
    const employeeAddr = structuredFacts.employee?.address || 'Residential Address';

    const designation = structuredFacts.designation || 'Senior Professional';
    const department = structuredFacts.department || 'Operations';
    const workLocation = structuredFacts.workLocation || 'Company Office / Hybrid';

    const salary = structuredFacts.salary || 'Competitive Industry CTC';
    const currency = structuredFacts.currency || 'INR';
    const joiningDate = structuredFacts.joiningDate || new Date().toISOString().split('T')[0];
    const probationPeriod = structuredFacts.probationPeriod || '90 days';
    const noticePeriodEmployee = structuredFacts.noticePeriodEmployee || '60 days';
    const noticePeriodEmployer = structuredFacts.noticePeriodEmployer || '60 days';
    const governingLaw = structuredFacts.governingLaw || 'Laws of India';

    const docTitle = "EMPLOYMENT AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (the "Agreement") is executed on this ${joiningDate} (the "Effective Date") by and between:\n\n1. ${employerName}, having its registered office at ${employerAddr} (hereinafter referred to as the "Company" or "Employer", which expression shall include its successors and assigns); and\n\n2. ${employeeName}, residing at ${employeeAddr} (hereinafter referred to as the "Employee").\n\nThe Employer and the Employee are collectively referred to as the "Parties" and individually as a "Party".`
    });

    sections.push({
      sectionType: "appointment",
      title: "1. Position, Duties & Designation",
      content: `The Company hereby appoints the Employee to serve in the position of ${designation} within the ${department} department. The Employee shall perform all duties, responsibilities, and tasks commensurate with this position and comply with all applicable corporate policies and directives issued by the Company from time to time.`
    });

    sections.push({
      sectionType: "work_location",
      title: "2. Commencement & Base of Work",
      content: `The Employee's active engagement shall commence on ${joiningDate}. The principal base of work shall be ${workLocation}, subject to reasonable travel requirements in connection with the Company's commercial operations.`
    });

    sections.push({
      sectionType: "probation",
      title: "3. Probationary Period",
      content: `The Employee shall serve an initial probationary period of ${probationPeriod} from the Effective Date. During probation, either Party may terminate this Agreement upon providing seven (7) business days written notice. Upon successful completion of probation, the Employee's appointment shall stand confirmed in writing.`
    });

    sections.push({
      sectionType: "compensation",
      title: "4. Remuneration & Benefits",
      content: `In consideration for the services rendered hereunder, the Company shall pay the Employee an aggregate gross annual compensation of ${currency} ${salary}, payable in monthly installments in arrears, subject to statutory deductions, income tax withholdings, and provident fund contributions in accordance with applicable law.`
    });

    sections.push({
      sectionType: "confidentiality",
      title: "5. Proprietary Information & Confidentiality",
      content: `The Employee agrees that all trade secrets, source code, product roadmaps, algorithms, customer lists, financial data, and technical know-how acquired during employment constitute strictly confidential property of the Company. The Employee shall hold such information in strict confidence and shall not disclose or use it outside the scope of employment during or after termination.`
    });

    sections.push({
      sectionType: "ip_assignment",
      title: "6. Intellectual Property & Work-for-Hire",
      content: `The Employee expressly acknowledges that all inventions, software, documentation, designs, algorithms, and works of authorship conceived, created, or developed during the course of employment shall constitute "works made for hire". To the extent any title does not vest automatically, the Employee hereby irrevocably transfers and assigns to the Company all worldwide rights, title, and intellectual property interests therein, with full waiver of moral rights.`
    });

    sections.push({
      sectionType: "restrictive_covenants",
      title: "7. Non-Solicitation & Conflict of Interest",
      content: `During employment and for twelve (12) months following termination, the Employee shall not: (a) directly or indirectly solicit, entice away, or recruit any employee, contractor, or commercial agent of the Company; or (b) solicit or divert any client or commercial customer with whom the Employee had material contact.`
    });

    sections.push({
      sectionType: "termination",
      title: "8. Termination & Notice Period",
      content: `Following confirmation, either Party may terminate this Agreement without cause by tendering written notice of ${noticePeriodEmployee} (by Employee) or ${noticePeriodEmployer} (by Company), or payment of base salary in lieu thereof. The Company may terminate employment immediately without notice or severance for cause, including willful misconduct, fraud, moral turpitude, material breach, or insubordination.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "9. Governing Law & Dispute Resolution",
      content: `This Agreement shall be governed by, interpreted, and enforced in accordance with the substantive ${governingLaw}. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts of law.`
    });

    sections.push({
      sectionType: "signatures",
      title: "10. Execution & Acceptance",
      content: `IN WITNESS WHEREOF, the Parties have executed this Employment Agreement as of the date first above written.\n\nFOR AND ON BEHALF OF THE COMPANY:\n${employerName}\n\nBy: ____________________________________\nName: ${employerSignatory}\nTitle: Authorized Representative\n\nACCEPTED AND AGREED:\n\nBy: ____________________________________\nName: ${employeeName}\nDate: ${joiningDate}`
    });

    return { title: docTitle, sections };
  }
}

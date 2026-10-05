import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class InternshipDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const orgName = structuredFacts.company?.name || structuredFacts.organization?.name || structuredFacts.employer?.name || 'Host Company / Organization';
    const orgAddr = structuredFacts.company?.address || structuredFacts.organization?.address || structuredFacts.employer?.address || 'Registered Office Address';

    const internName = structuredFacts.intern?.name || structuredFacts.employee?.name || 'Intern';
    const internAddr = structuredFacts.intern?.address || structuredFacts.employee?.address || 'Residential Address';

    const duration = structuredFacts.durationWeeks || structuredFacts.duration || '12 weeks';
    const stipend = structuredFacts.stipendAmount || structuredFacts.stipend || '25,000';
    const currency = structuredFacts.currency || 'INR';
    const department = structuredFacts.department || 'Technology & Product Engineering';
    const startDate = structuredFacts.startDate || structuredFacts.joiningDate || new Date().toISOString().split('T')[0];
    const governingLaw = structuredFacts.governingLaw || 'Laws of India';

    const docTitle = "INTERNSHIP ENGAGEMENT AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `INTERNSHIP ENGAGEMENT AGREEMENT\n\nThis Internship Agreement (the "Agreement") is entered into and made effective as of ${startDate} by and between:\n\n1. ${orgName}, having its principal place of business at ${orgAddr} (hereinafter referred to as the "Company"); and\n\n2. ${internName}, residing at ${internAddr} (hereinafter referred to as the "Intern").\n\nThe Company and Intern are collectively referred to as the "Parties".`
    });

    sections.push({
      sectionType: "training_objectives",
      title: "1. Training Objectives & Department Placement",
      content: `The Company offers, and the Intern accepts, an educational internship opportunity within the ${department} department. The internship is designed to afford the Intern practical learning experience, professional mentorship, and exposure to contemporary industry practices.`
    });

    sections.push({
      sectionType: "term_schedule",
      title: "2. Term & Schedule of Internship",
      content: `The internship shall commence on ${startDate} and continue for a period of ${duration}, unless terminated earlier pursuant to the terms hereof. The Intern shall dedicate approximately 40 hours per week during regular business hours.`
    });

    sections.push({
      sectionType: "non_employment",
      title: "3. Educational Nature & Non-Employment Status",
      content: `The Intern expressly acknowledges that this engagement is primarily educational and training-oriented and does not create an employer-employee relationship, contract of employment, or entitlement to permanent employment with the Company upon completion.`
    });

    sections.push({
      sectionType: "stipend",
      title: "4. Monthly Stipend & Out-of-Pocket Expenses",
      content: `COMPENSATION & STIPEND: The Company shall pay the Intern an educational stipend of ${currency} ${stipend} per month to assist with living expenses, payable in arrears. The Company shall also reimburse pre-approved out-of-pocket expenses incurred solely in connection with assigned project tasks.`
    });

    sections.push({
      sectionType: "confidentiality",
      title: "5. Confidential Information & Data Privacy",
      content: `The Intern agrees that all technical documentation, software code, customer data, and business strategies observed or accessed during the internship constitute strictly confidential information of the Company. The Intern shall hold all such information in strict confidence both during and after the internship.`
    });

    sections.push({
      sectionType: "ip_assignment",
      title: "6. Intellectual Property & Work-for-Hire",
      content: `INTELLECTUAL PROPERTY & WORK-FOR-HIRE: All inventions, software, documentation, designs, algorithms, and works of authorship developed by the Intern, whether solely or collaboratively, during the internship shall constitute "work made for hire" and shall vest solely and exclusively in the Company worldwide.`
    });

    sections.push({
      sectionType: "code_of_conduct",
      title: "7. Company Policies & Code of Conduct",
      content: `The Intern shall comply with all established rules, regulations, cybersecurity policies, and codes of ethical business conduct implemented by the Company. Failure to maintain professional standards may result in immediate revocation of the internship.`
    });

    sections.push({
      sectionType: "termination",
      title: "8. Termination & Notice",
      content: `Either Party may terminate this Agreement at any time upon providing seven (7) business days written notice. The Company may terminate immediately for cause, including academic dishonesty, moral turpitude, violation of confidentiality, or gross misconduct.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "9. Governing Law & Jurisdiction",
      content: `This Agreement shall be governed by and construed in accordance with the substantive ${governingLaw}. Any disputes shall be subject to the exclusive jurisdiction of the competent courts of law.`
    });

    sections.push({
      sectionType: "signatures",
      title: "10. Execution & Acceptance",
      content: `IN WITNESS WHEREOF, the Parties have executed this Internship Agreement as of the date first above written.\n\nFOR THE COMPANY:\n${orgName}\n\nBy: ____________________________________\nName: Authorized HR Representative\nTitle: Head of Talent Acquisition\n\nACCEPTED AND AGREED BY THE INTERN:\n\nBy: ____________________________________\nName: ${internName}\nDate: ${startDate}`
    });

    return { title: docTitle, sections };
  }
}

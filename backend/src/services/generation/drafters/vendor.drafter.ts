import { ContractDrafter, DraftResult } from './base_drafter.js';
import { GenerationInput, GeneratedSection } from '../generation_service.js';

export class VendorDrafter implements ContractDrafter {
  draft(input: GenerationInput): DraftResult {
    const { structuredFacts } = input;
    const sections: GeneratedSection[] = [];

    const buyerName = structuredFacts.buyer?.name || structuredFacts.client?.name || structuredFacts.buyerName || 'Buyer Enterprise';
    const buyerAddr = structuredFacts.buyer?.address || structuredFacts.client?.address || structuredFacts.buyerAddress || 'Buyer Registered Office Address';

    const vendorName = structuredFacts.vendor?.name || structuredFacts.serviceProvider?.name || structuredFacts.vendorName || structuredFacts.seller?.name || 'Vendor Supplier Corp';
    const vendorAddr = structuredFacts.vendor?.address || structuredFacts.serviceProvider?.address || structuredFacts.vendorAddress || 'Vendor Registered Office Address';

    const goodsDescription = structuredFacts.goodsDescription || structuredFacts.description || structuredFacts.goods || 'Hardware systems, manufactured equipment, and procurement materials';
    const specifications = structuredFacts.specifications || 'Full conformance to quality manufacturing standards and technical benchmark tolerances';
    const price = structuredFacts.price || structuredFacts.fees || structuredFacts.pricingModel || '50,000';
    const currency = structuredFacts.currency || 'USD';
    const deliveryTerms = structuredFacts.deliveryTerms || (structuredFacts.deliveryLocation ? `Delivered to ${structuredFacts.deliveryLocation}` : 'DDP Buyer Warehouse within thirty (30) days from Purchase Order acceptance');
    const inspectionDays = structuredFacts.inspectionDays || '10';
    const warrantyMonths = structuredFacts.warrantyPeriodMonths || '12';
    const commencementDate = structuredFacts.effectiveDate || structuredFacts.commencementDate || new Date().toISOString().split('T')[0];
    const governingLaw = structuredFacts.governingLaw || 'Laws of India';

    const docTitle = "VENDOR SUPPLY & PROCUREMENT AGREEMENT";

    sections.push({
      sectionType: "title",
      title: "Title & Preamble",
      content: `VENDOR SUPPLY & PROCUREMENT AGREEMENT\n\nThis Vendor Supply Agreement (the "Agreement") is entered into and made effective as of ${commencementDate} (the "Effective Date") by and between:\n\n1. ${buyerName}, having its registered office at ${buyerAddr} (hereinafter referred to as the "Buyer"); and\n\n2. ${vendorName}, having its registered office at ${vendorAddr} (hereinafter referred to as the "Vendor").\n\nThe Buyer and Vendor are collectively referred to as the "Parties" and individually as a "Party".`
    });

    sections.push({
      sectionType: "products",
      title: "1. Scope of Goods & Product Specifications",
      content: `The Vendor agrees to manufacture, sell, and supply to the Buyer the following goods and merchandise: ${goodsDescription}. All items delivered shall strictly conform to the following technical specifications: ${specifications}. All goods shall satisfy the benchmark quality standards agreed between the Parties in writing.`
    });

    sections.push({
      sectionType: "purchase_orders",
      title: "2. Purchase Orders & Delivery Schedules",
      content: `Buyer shall issue written Purchase Orders specifying required quantities and requested delivery destinations. Vendor shall confirm acceptance within three (3) business days. Delivery shall be executed pursuant to the agreed schedule: ${deliveryTerms}. Time of delivery shall be of the essence of this Agreement.`
    });

    sections.push({
      sectionType: "pricing",
      title: "3. Contract Price & Invoicing Terms",
      content: `In consideration for the satisfactory supply and delivery of goods, the Buyer shall pay the agreed purchase price of ${currency} ${price}, inclusive of packaging, freight, and insurance, unless specified otherwise. Payment shall be remitted within thirty (30) business days following receipt of a valid tax invoice and verification of delivery.`
    });

    sections.push({
      sectionType: "inspection",
      title: "4. Inspection, Testing & Non-Conforming Goods",
      content: `INSPECTION AND ACCEPTANCE: Buyer shall have a period of ${inspectionDays} (${inspectionDays}) business days following delivery to inspect and test goods. In the event of defective, damaged, or non-conforming items, Buyer may reject such goods and require immediate replacement at Vendor's sole expense or receive a full credit refund.`
    });

    sections.push({
      sectionType: "warranties",
      title: "5. Quality & Performance Warranties",
      content: `Vendor expressly warrants that all goods supplied hereunder shall be: (a) brand new and free from design, material, and workmanship defects; (b) merchantable and fit for their intended commercial purpose; and (c) fully compliant with all applicable statutory and consumer safety standards for a minimum warranty period of ${warrantyMonths} months from delivery.`
    });

    sections.push({
      sectionType: "indemnification",
      title: "6. Indemnification & Product Liability",
      content: `Vendor shall defend, indemnify, and hold harmless Buyer, its officers, and customers from and against any third-party claims, damages, liabilities, and expenses arising out of: (a) defective goods causing bodily injury or property damage; or (b) infringement of third-party patent, trademark, or copyright rights.`
    });

    sections.push({
      sectionType: "liability",
      title: "7. Limitation of Liability",
      content: `LIMITATION OF LIABILITY: Except with respect to gross negligence, willful misconduct, or indemnification obligations hereunder, neither Party shall be liable for indirect, punitive, or consequential damages. Total aggregate liability under this Agreement shall not exceed the total contract price paid in the preceding twelve (12) months.`
    });

    sections.push({
      sectionType: "termination",
      title: "8. Term & Termination",
      content: `This Agreement shall remain in force for an initial term of one (1) year from the Effective Date. Either Party may terminate for convenience upon thirty (30) days prior written notice, or immediately upon written notice if the other Party commits a material breach and fails to cure within fifteen (15) days.`
    });

    sections.push({
      sectionType: "governing_law",
      title: "9. Governing Law & Jurisdiction",
      content: `This Agreement shall be governed by, interpreted, and construed in accordance with the substantive ${governingLaw}. Any disputes arising out of or in connection with this Agreement shall be referred to exclusive arbitration or competent judicial courts.`
    });

    sections.push({
      sectionType: "signatures",
      title: "10. Execution & Acceptance",
      content: `IN WITNESS WHEREOF, the Parties have caused this Vendor Supply Agreement to be executed by their duly authorized corporate officers.\n\nFOR THE BUYER:\n${buyerName}\n\nBy: ____________________________________\nName: Authorized Signatory\nTitle: Procurement Officer\n\nFOR THE VENDOR:\n${vendorName}\n\nBy: ____________________________________\nName: Authorized Signatory\nTitle: Commercial Director`
    });

    return { title: docTitle, sections };
  }
}

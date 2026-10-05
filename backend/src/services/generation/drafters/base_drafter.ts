import { GenerationInput, GeneratedSection } from '../generation_service.js';

export interface DraftResult {
  title: string;
  sections: GeneratedSection[];
}

export interface ContractDrafter {
  draft(input: GenerationInput): DraftResult;
}

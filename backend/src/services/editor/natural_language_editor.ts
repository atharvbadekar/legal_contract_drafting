import { z } from 'zod';
import { llmManager } from '../../ai/factory.js';
import { clauseSelector } from '../clauses/clause_selector.js';
import { parseDocumentStructure } from '../documents/document_structure.js';

export interface StructuredEditOperation {
  op: 'replace_all' | 'replace_in_section' | 'insert_clause' | 'delete_clause' | 'update_fact';
  target?: string;
  old?: string;
  new?: string;
  sectionId?: string;
  sectionTitle?: string;
  factKey?: string;
  factValue?: any;
}

export interface NaturalLanguageEditPlan {
  instruction: string;
  isAmbiguous: boolean;
  clarifyingQuestion?: string;
  suggestedOptions?: string[];
  explanation: string;
  operations: StructuredEditOperation[];
  previewContent: string;
  diffSummary: {
    additionsCount: number;
    deletionsCount: number;
    changedSections: string[];
    unifiedDiff: string;
  };
  updatedFacts: Record<string, any>;
}

export class NaturalLanguageEditorService {
  /**
   * Plan an edit instruction into deterministic structured operations,
   * detect ambiguity if underspecified, and compute a diff preview.
   * NOTE: The LLM NEVER rewrites the entire document directly.
   */
  async planEdit(params: {
    instruction: string;
    content: string;
    documentType: string;
    structuredFacts?: Record<string, any>;
    clarificationAnswer?: string;
  }): Promise<NaturalLanguageEditPlan> {
    const { instruction, content, documentType, structuredFacts = {}, clarificationAnswer } = params;
    const cleanInstruction = instruction.trim();

    // 1. Ambiguity Detection & Disambiguation
    const ambiguityCheck = this.detectAmbiguity(cleanInstruction, content, documentType, structuredFacts, clarificationAnswer);
    if (ambiguityCheck.isAmbiguous) {
      return {
        instruction: cleanInstruction,
        isAmbiguous: true,
        clarifyingQuestion: ambiguityCheck.clarifyingQuestion,
        suggestedOptions: ambiguityCheck.suggestedOptions,
        explanation: 'Instruction is ambiguous. Please clarify the target before applying changes.',
        operations: [],
        previewContent: content,
        diffSummary: {
          additionsCount: 0,
          deletionsCount: 0,
          changedSections: [],
          unifiedDiff: ''
        },
        updatedFacts: { ...structuredFacts }
      };
    }

    // 2. Derive Structured Operations (LLM with Zod Schema, plus deterministic fallback)
    let operations: StructuredEditOperation[] = [];
    let explanation = '';

    const effectiveInstruction = clarificationAnswer
      ? `${cleanInstruction} (Clarification: ${clarificationAnswer})`
      : cleanInstruction;

    const hasRealLLMKey = Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY);

    if (hasRealLLMKey) {
      try {
        const planResult = await this.generateOperationsViaLLM(effectiveInstruction, content, documentType, structuredFacts);
        if (planResult && planResult.operations.length > 0) {
          operations = planResult.operations;
          explanation = planResult.explanation;
        }
      } catch (llmErr) {
        // Graceful fallback to deterministic parsing
      }
    }

    if (operations.length === 0) {
      const fallback = await this.parseOperationsDeterministically(effectiveInstruction, content, documentType, structuredFacts, clarificationAnswer);
      operations = fallback.operations;
      explanation = fallback.explanation;
    }

    // 3. Execute Operations Deterministically
    const execution = this.applyOperations(content, operations, structuredFacts);

    // 4. Compute Unified Diff & Summary
    const diffSummary = this.computeUnifiedDiff(content, execution.updatedContent);

    return {
      instruction: cleanInstruction,
      isAmbiguous: false,
      explanation,
      operations,
      previewContent: execution.updatedContent,
      diffSummary,
      updatedFacts: execution.updatedFacts
    };
  }

  /**
   * Check if instruction is ambiguous and requires user clarification.
   */
  private detectAmbiguity(
    instruction: string,
    content: string,
    documentType: string,
    facts: Record<string, any>,
    clarificationAnswer?: string
  ): { isAmbiguous: boolean; clarifyingQuestion?: string; suggestedOptions?: string[] } {
    if (clarificationAnswer) {
      return { isAmbiguous: false };
    }

    const lower = instruction.toLowerCase();

    // Ambiguity 1: "change the party name to X" without stating which party
    const partyNameMatch = instruction.match(/(?:change|rename|set|update)\s+(?:the\s+)?party\s+name\s+to\s+["']?([^"']+)["']?/i);
    const hasWhichParty = lower.includes('disclosing') || lower.includes('receiving') || lower.includes('employer') || lower.includes('employee') || lower.includes('client') || lower.includes('provider') || lower.includes('instead of') || lower.includes('from ');

    if (partyNameMatch && !hasWhichParty) {
      const newName = partyNameMatch[1].trim();
      const p1 = facts.disclosingParty?.name || facts.partyA?.name || facts.client?.name || 'Party A';
      const p2 = facts.receivingParty?.name || facts.partyB?.name || facts.serviceProvider?.name || 'Party B';

      return {
        isAmbiguous: true,
        clarifyingQuestion: `Which party's name should be changed to "${newName}"?`,
        suggestedOptions: [
          `Disclosing Party / First Party (currently: ${p1})`,
          `Receiving Party / Second Party (currently: ${p2})`,
          `Both Parties`
        ]
      };
    }

    // Ambiguity 2: "make it longer" or "extend term" without duration
    if ((lower.includes('extend the term') || lower.includes('make the term longer') || lower.includes('change term')) && !lower.match(/\d+\s*(?:years?|months?|days?)/i)) {
      return {
        isAmbiguous: true,
        clarifyingQuestion: 'What should be the new duration or term of the contract?',
        suggestedOptions: [
          '1 Year',
          '2 Years',
          '3 Years',
          '5 Years'
        ]
      };
    }

    return { isAmbiguous: false };
  }

  /**
   * LLM converts instruction into JSON structured operations adhering to Zod schema.
   */
  private async generateOperationsViaLLM(
    instruction: string,
    content: string,
    documentType: string,
    facts: Record<string, any>
  ): Promise<{ operations: StructuredEditOperation[]; explanation: string } | null> {
    const EditOperationSchema = z.object({
      op: z.enum(['replace_all', 'replace_in_section', 'insert_clause', 'delete_clause', 'update_fact']),
      target: z.string().optional(),
      old: z.string().optional(),
      new: z.string().optional(),
      sectionId: z.string().optional(),
      sectionTitle: z.string().optional(),
      factKey: z.string().optional(),
      factValue: z.any().optional()
    });

    const EditPlanSchema = z.object({
      explanation: z.string(),
      operations: z.array(EditOperationSchema)
    });

    // Provide excerpt of sections to LLM
    const sectionHeaders = content
      .split('\n')
      .filter(l => l.startsWith('## ') || l.startsWith('# '))
      .map(l => l.replace(/#+\s*/, '').trim());

    const prompt = `You are a legal contract editor compiler. Convert the following natural-language user instruction into precise, structured edit operations in JSON.

RULES:
1. NEVER rewrite the entire document.
2. For global entity or name changes, use "replace_all" with exact "old" and "new" strings, plus "update_fact".
3. For clause insertions (e.g. non-solicitation, liability cap), use "insert_clause" with "sectionTitle" and complete, formal legal operative text in "new".
4. For clause deletion, use "delete_clause" with "sectionTitle".
5. For section modifications, use "replace_in_section" with "sectionTitle", "old", and "new".
6. When changing legal variables (duration, jurisdiction, party names, liability cap), always include an "update_fact" operation.

DOCUMENT TYPE: ${documentType}
EXISTING SECTIONS: ${JSON.stringify(sectionHeaders)}
EXISTING FACTS: ${JSON.stringify(facts)}

USER INSTRUCTION: "${instruction}"`;

    const res = await llmManager.generateJSON({
      prompt,
      systemPrompt: 'You are an institutional legal drafting assistant. Output strictly structured edit operations.',
      schema: EditPlanSchema,
      schemaName: 'NaturalLanguageEditOperations'
    });

    if (res?.data?.operations && Array.isArray(res.data.operations)) {
      return {
        operations: res.data.operations,
        explanation: res.data.explanation || `Executed: ${instruction}`
      };
    }

    return null;
  }

  /**
   * Deterministic pattern compiler for natural-language instructions.
   */
  private async parseOperationsDeterministically(
    instruction: string,
    content: string,
    documentType: string,
    facts: Record<string, any>,
    clarificationAnswer?: string
  ): Promise<{ operations: StructuredEditOperation[]; explanation: string }> {
    const lower = instruction.toLowerCase();
    const ops: StructuredEditOperation[] = [];
    let explanation = `Applied deterministic edit for: "${instruction}"`;

    // 0. Disambiguation resolution with clarificationAnswer
    if (clarificationAnswer) {
      const clarLower = clarificationAnswer.toLowerCase();
      const partyTargetMatch = instruction.match(/(?:change|rename|set|update)\s+(?:the\s+)?party\s+name\s+to\s+["']?([^"']+)["']?/i);
      if (partyTargetMatch) {
        const newPartyName = partyTargetMatch[1].trim().replace(/\s*\(Clarification:.*$/i, '').replace(/["']/g, '');
        if (clarLower.includes('receiving') || clarLower.includes('second party') || clarLower.includes('beta')) {
          const oldName = facts.receivingParty?.name || facts.receivingParty || 'Beta Solutions LLP';
          ops.push({ op: 'replace_all', old: oldName, new: newPartyName });
          ops.push({ op: 'update_fact', factKey: 'receivingParty', factValue: newPartyName });
          return {
            operations: ops,
            explanation: `Renamed Receiving Party ("${oldName}") to "${newPartyName}" across document based on clarification.`
          };
        } else if (clarLower.includes('disclosing') || clarLower.includes('first party') || clarLower.includes('alpha')) {
          const oldName = facts.disclosingParty?.name || facts.disclosingParty || 'Alpha Technologies Private Limited';
          ops.push({ op: 'replace_all', old: oldName, new: newPartyName });
          ops.push({ op: 'update_fact', factKey: 'disclosingParty', factValue: newPartyName });
          return {
            operations: ops,
            explanation: `Renamed Disclosing Party ("${oldName}") to "${newPartyName}" across document based on clarification.`
          };
        }
      }
    }

    // 1. Rename: "change the party name to X instead of Y" or "change X to Y" or "rename Y to X"
    const renameInsteadMatch = instruction.match(/(?:change|rename|replace)\s+(?:the\s+party\s+name\s+to\s+|party\s+to\s+)?["']?([^"']+)["']?\s+instead\s+of\s+["']?([^"']+)["']?/i);
    const renameToFromMatch = instruction.match(/(?:change|replace)\s+["']?([^"']+)["']?\s+(?:to|with)\s+["']?([^"']+)["']?/i);

    if (renameInsteadMatch) {
      const newName = renameInsteadMatch[1].trim();
      const oldName = renameInsteadMatch[2].trim();
      ops.push({ op: 'replace_all', old: oldName, new: newName });
      ops.push({ op: 'update_fact', factKey: 'partyName', factValue: newName });
      explanation = `Globally renamed "${oldName}" to "${newName}" across all occurrences including definitions and signatures.`;
      return { operations: ops, explanation };
    } else if (renameToFromMatch && !lower.includes('term') && !lower.includes('duration') && !lower.includes('jurisdiction') && !lower.includes('governing law')) {
      const oldTarget = renameToFromMatch[1].trim();
      const newTarget = renameToFromMatch[2].trim();
      ops.push({ op: 'replace_all', old: oldTarget, new: newTarget });
      explanation = `Replaced "${oldTarget}" with "${newTarget}" across document.`;
      return { operations: ops, explanation };
    }

    // 2. Term / Duration: "make the term 3 years", "change term to 5 years"
    const durationMatch = instruction.match(/(?:term|duration)\s+(?:to\s+)?(\d+\s*(?:years?|months?))/i) ||
      instruction.match(/make\s+(?:the\s+)?(?:term|duration)\s+(\d+\s*(?:years?|months?))/i);
    if (durationMatch) {
      const newDuration = durationMatch[1].trim();
      const existingDurMatch = content.match(/\b\d+\s*(?:years?|months?)\b/i);
      const oldDuration = existingDurMatch ? existingDurMatch[0] : (facts.duration || '2 years');

      ops.push({ op: 'replace_all', old: oldDuration, new: newDuration });
      ops.push({ op: 'update_fact', factKey: 'duration', factValue: newDuration });
      explanation = `Updated contract term and confidentiality survival period to ${newDuration}.`;
      return { operations: ops, explanation };
    }

    // 3. Mutual Confidentiality: "make confidentiality mutual", "make it mutual"
    if (lower.includes('confidentiality mutual') || lower.includes('make it mutual') || lower.includes('make mutual')) {
      const mutualClause = `## CONFIDENTIALITY OBLIGATIONS\n\nEach Party covenants to hold all Confidential Information disclosed by the other Party in strict confidence and shall exercise at least a reasonable and commercially diligent degree of care to prevent unauthorized disclosure, publication, or commercial exploitation. Neither Party shall disclose the other Party's Confidential Information to third parties without prior express written consent.`;

      ops.push({
        op: 'replace_in_section',
        sectionTitle: 'CONFIDENTIALITY',
        new: mutualClause
      });
      ops.push({ op: 'update_fact', factKey: 'isMutual', factValue: true });
      explanation = 'Replaced unilateral non-disclosure obligations with bilateral reciprocal mutual confidentiality covenants.';
      return { operations: ops, explanation };
    }

    // 4. Governing Law / Jurisdiction: "change governing law to Rajasthan courts", "governing law to Delhi"
    const govLawMatch = instruction.match(/(?:change|set|make)\s+governing\s+law\s+to\s+(.+)$/i) ||
      instruction.match(/jurisdiction\s+to\s+(.+)$/i);
    if (govLawMatch) {
      const newForum = govLawMatch[1].trim().replace(/\.$/, '');
      const newGovClause = `## GOVERNING LAW AND JURISDICTION\n\nThis Agreement and any dispute, controversy, or claim arising out of or in connection with it shall be governed strictly by the laws of India. The courts at ${newForum} shall possess sole and exclusive jurisdiction over all proceedings originating herefrom.`;

      ops.push({
        op: 'replace_in_section',
        sectionTitle: 'GOVERNING LAW',
        new: newGovClause
      });
      ops.push({ op: 'update_fact', factKey: 'jurisdiction', factValue: newForum });
      explanation = `Updated governing law and exclusive forum jurisdiction to ${newForum}.`;
      return { operations: ops, explanation };
    }

    // 5. Add Non-Solicitation: "add a non-solicitation clause", "add non-compete"
    if (lower.includes('non-solicitation') || lower.includes('non solicitation') || lower.includes('solicit')) {
      const nonSolicit = `## NON-SOLICITATION COVENANT\n\nDuring the term of this Agreement and for a period of twelve (12) months following any expiration or termination, neither Party shall directly or indirectly solicit, recruit, or attempt to hire any employee, contractor, or officer of the other Party without prior written consent.`;
      ops.push({
        op: 'insert_clause',
        sectionTitle: 'NON-SOLICITATION COVENANT',
        new: nonSolicit
      });
      explanation = 'Inserted formal 12-month mutual employee and personnel non-solicitation covenant.';
      return { operations: ops, explanation };
    }

    // 5.1 Add Liability Cap / Limit Liability: "add liability cap", "limit liability"
    if (lower.includes('liability') || lower.includes('cap on liability')) {
      const liabilityClause = `## LIMITATION OF LIABILITY\n\nTo the maximum extent permitted by applicable law: (a) neither party's total aggregate liability arising out of or related to this Agreement shall exceed the total fees paid or payable hereunder in the twelve (12) months preceding the claim; and (b) in no event shall either party be liable for any consequential, incidental, indirect, special, or punitive damages.`;
      ops.push({
        op: 'insert_clause',
        sectionTitle: 'LIMITATION OF LIABILITY',
        new: liabilityClause
      });
      explanation = 'Inserted 12-month mutual limitation of liability and consequential damages waiver.';
      return { operations: ops, explanation };
    }

    // 5.2 Add IP Rights / Assignment: "add ip assignment", "add intellectual property"
    if (lower.includes('ip assignment') || lower.includes('intellectual property') || lower.includes('work product')) {
      const ipClause = `## INTELLECTUAL PROPERTY RIGHTS\n\nAll deliverables, software, documentation, inventions, and work product produced under this Agreement shall belong solely and exclusively to the Client. The Service Provider hereby irrevocably assigns all worldwide right, title, and interest therein to the Client.`;
      ops.push({
        op: 'insert_clause',
        sectionTitle: 'INTELLECTUAL PROPERTY RIGHTS',
        new: ipClause
      });
      explanation = 'Inserted intellectual property ownership and work product assignment covenant.';
      return { operations: ops, explanation };
    }

    // 6. Delete section / clause: "delete section X", "remove non-solicitation"
    const deleteMatch = instruction.match(/(?:delete|remove)\s+(?:the\s+)?(?:section|clause)?\s*["']?([^"']+)["']?/i);
    if (deleteMatch) {
      const targetSec = deleteMatch[1].trim();
      ops.push({
        op: 'delete_clause',
        sectionTitle: targetSec
      });
      explanation = `Removed clause/section matching "${targetSec}".`;
      return { operations: ops, explanation };
    }

    // 7. General addition: "add X clause"
    const addMatch = instruction.match(/^(?:add|insert)\s+(?:a\s+|an\s+)?(.+)$/i);
    if (addMatch) {
      const clauseTitle = addMatch[1].trim().toUpperCase().replace(/\s+CLAUSE$/i, '');
      const standardText = `## ${clauseTitle}\n\nThe Parties hereby expressly agree and covenant to perform all duties pertaining to ${clauseTitle.toLowerCase()} in accordance with governing institutional standards and commercial good faith.`;
      ops.push({
        op: 'insert_clause',
        sectionTitle: clauseTitle,
        new: standardText
      });
      explanation = `Inserted standard clause for "${addMatch[1].trim()}".`;
      return { operations: ops, explanation };
    }

    return { operations: ops, explanation };
  }

  /**
   * Deterministically execute operations against document text.
   * Preserves unrelated sections and formatting without duplicates.
   */
  applyOperations(
    content: string,
    operations: StructuredEditOperation[],
    structuredFacts: Record<string, any>
  ): {
    updatedContent: string;
    updatedFacts: Record<string, any>;
    changes: Array<{ op: string; description: string }>;
  } {
    let resultText = content;
    const updatedFacts = { ...structuredFacts };
    const changes: Array<{ op: string; description: string }> = [];

    for (const op of operations) {
      switch (op.op) {
        case 'replace_all': {
          if (op.old && op.new) {
            const escapedOld = op.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Try word boundary first, but fall back to plain global replace if word boundary fails
            const regexWord = new RegExp(`\\b${escapedOld}\\b`, 'gi');
            if (regexWord.test(resultText)) {
              resultText = resultText.replace(regexWord, op.new);
              changes.push({
                op: 'replace_all',
                description: `Replaced occurrences of "${op.old}" with "${op.new}"`
              });
            } else {
              const regexPlain = new RegExp(escapedOld, 'gi');
              resultText = resultText.replace(regexPlain, op.new);
              changes.push({
                op: 'replace_all',
                description: `Replaced occurrences of "${op.old}" with "${op.new}"`
              });
            }
          }
          break;
        }

        case 'replace_in_section': {
          if (op.sectionTitle && op.new) {
            const parsed = parseDocumentStructure(resultText);
            const targetTitle = op.sectionTitle.trim().toLowerCase();

            // Find matching section by title or keyword
            const matchingSec = parsed.sections.find(s => {
              const sTitle = (s.title || '').trim().toLowerCase();
              return sTitle.includes(targetTitle) || targetTitle.includes(sTitle) ||
                     (targetTitle.includes('confidential') && sTitle.includes('confidential')) ||
                     (targetTitle.includes('governing') && sTitle.includes('governing')) ||
                     (targetTitle.includes('jurisdiction') && (sTitle.includes('jurisdiction') || sTitle.includes('governing'))) ||
                     (targetTitle.includes('term') && sTitle.includes('term')) ||
                     (targetTitle.includes('liability') && sTitle.includes('liability')) ||
                     (targetTitle.includes('solicit') && sTitle.includes('solicit'));
            });

            if (matchingSec) {
              const secSlice = resultText.substring(matchingSec.startIndex, matchingSec.endIndex);
              if (op.old && op.new) {
                const updatedSec = secSlice.replace(new RegExp(op.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), op.new);
                resultText = resultText.substring(0, matchingSec.startIndex) + updatedSec + resultText.substring(matchingSec.endIndex);
                changes.push({
                  op: 'replace_in_section',
                  description: `Updated text in section "${matchingSec.title}"`
                });
              } else {
                const cleanReplacement = op.new.trim();
                resultText = resultText.substring(0, matchingSec.startIndex) + cleanReplacement + resultText.substring(matchingSec.endIndex);
                changes.push({
                  op: 'replace_in_section',
                  description: `Replaced section "${matchingSec.title}" with updated legal language`
                });
              }
            } else {
              resultText = this.insertClauseBeforeSignatures(resultText, op.new);
              changes.push({
                op: 'insert_clause',
                description: `Inserted section "${op.sectionTitle}"`
              });
            }
          }
          break;
        }

        case 'insert_clause': {
          if (op.new) {
            const parsed = parseDocumentStructure(resultText);
            const targetTitle = (op.sectionTitle || '').trim().toLowerCase();

            // Check if section with this topic already exists to prevent duplicate clauses
            const existingSec = targetTitle ? parsed.sections.find(s => {
              const sTitle = (s.title || '').trim().toLowerCase();
              return sTitle.includes(targetTitle) || targetTitle.includes(sTitle) ||
                     (targetTitle.includes('solicit') && sTitle.includes('solicit')) ||
                     (targetTitle.includes('liability') && sTitle.includes('liability')) ||
                     (targetTitle.includes('confidential') && sTitle.includes('confidential'));
            }) : null;

            if (existingSec) {
              // Update existing section rather than creating duplicate
              resultText = resultText.substring(0, existingSec.startIndex) + op.new.trim() + resultText.substring(existingSec.endIndex);
              changes.push({
                op: 'replace_in_section',
                description: `Updated existing section "${existingSec.title}"`
              });
            } else {
              resultText = this.insertClauseBeforeSignatures(resultText, op.new);
              changes.push({
                op: 'insert_clause',
                description: `Inserted new clause: "${op.sectionTitle || 'Custom Clause'}"`
              });
            }
          }
          break;
        }

        case 'delete_clause': {
          if (op.sectionTitle) {
            const parsed = parseDocumentStructure(resultText);
            const targetTitle = op.sectionTitle.trim().toLowerCase();
            const matchingSec = parsed.sections.find(s => {
              const sTitle = (s.title || '').trim().toLowerCase();
              return sTitle.includes(targetTitle) || targetTitle.includes(sTitle);
            });

            if (matchingSec) {
              // Remove section slice cleanly
              const before = resultText.substring(0, matchingSec.startIndex).trimEnd();
              const after = resultText.substring(matchingSec.endIndex).trimStart();
              resultText = before && after ? `${before}\n\n---\n\n${after}` : `${before}${after}`;
              changes.push({
                op: 'delete_clause',
                description: `Deleted section: "${matchingSec.title}"`
              });
            }
          }
          break;
        }

        case 'update_fact': {
          if (op.factKey) {
            updatedFacts[op.factKey] = op.factValue;
            changes.push({
              op: 'update_fact',
              description: `Synchronized structured fact "${op.factKey}" = "${JSON.stringify(op.factValue)}"`
            });
          }
          break;
        }
      }
    }

    return {
      updatedContent: resultText,
      updatedFacts,
      changes
    };
  }

  /**
   * Cleanly inserts a new clause immediately before the signature block,
   * or appends to end of document if no signature block exists.
   */
  private insertClauseBeforeSignatures(documentText: string, clauseText: string): string {
    const sigIndex = documentText.search(/(?:#{1,3}\s*(?:\d+[\.\)]\s*)?(?:EXECUTION|SIGNATURES)|IN\s+WITNESS\s+WHEREOF)/i);
    const formattedClause = clauseText.trim();

    if (sigIndex !== -1) {
      const before = documentText.substring(0, sigIndex).trimEnd();
      const after = documentText.substring(sigIndex).trimStart();
      return `${before}\n\n---\n\n${formattedClause}\n\n---\n\n${after}`;
    }

    return `${documentText.trimEnd()}\n\n---\n\n${formattedClause}\n`;
  }

  /**
   * Computes a unified diff representation for side-by-side or inline preview.
   */
  private computeUnifiedDiff(original: string, updated: string): {
    additionsCount: number;
    deletionsCount: number;
    changedSections: string[];
    unifiedDiff: string;
  } {
    const origLines = original.split('\n');
    const updatedLines = updated.split('\n');

    let additions = 0;
    let deletions = 0;
    const diffLines: string[] = [];
    const changedSections = new Set<string>();

    const maxLines = Math.max(origLines.length, updatedLines.length);
    let currentSection = 'Preamble';

    for (let i = 0; i < maxLines; i++) {
      const o = origLines[i];
      const u = updatedLines[i];

      if (o && (o.startsWith('## ') || o.startsWith('# '))) {
        currentSection = o.replace(/#+\s*/, '').trim();
      }

      if (o === u) {
        // Unchanged
        continue;
      }

      if (o !== undefined && u === undefined) {
        deletions++;
        diffLines.push(`- ${o}`);
        changedSections.add(currentSection);
      } else if (o === undefined && u !== undefined) {
        additions++;
        diffLines.push(`+ ${u}`);
        changedSections.add(currentSection);
      } else {
        deletions++;
        additions++;
        diffLines.push(`- ${o}`);
        diffLines.push(`+ ${u}`);
        changedSections.add(currentSection);
      }
    }

    return {
      additionsCount: additions,
      deletionsCount: deletions,
      changedSections: Array.from(changedSections),
      unifiedDiff: diffLines.join('\n')
    };
  }
}

export const naturalLanguageEditor = new NaturalLanguageEditorService();

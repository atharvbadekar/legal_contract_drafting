import { Request, Response } from 'express';
import { legalNLPClient } from '../services/nlp/legal_nlp_client.js';
import { generationService } from '../services/generation/generation_service.js';
import { agentPlanner } from '../services/agent/agent_planner.js';

export class AIController {
  async extractFacts(req: Request, res: Response) {
    try {
      const { text, documentType } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required for entity extraction' });
      }

      const result = await legalNLPClient.extractEntities(text, documentType);
      const missingCheck = agentPlanner.checkMissingInformation(result.documentType, result.facts);

      return res.json({
        documentType: result.documentType,
        facts: result.facts,
        extractedEntities: result.extractedEntities,
        missingInfo: missingCheck
      });
    } catch (err: any) {
      console.error('Fact extraction error:', err);
      return res.status(500).json({ error: `Fact extraction failed: ${err.message}` });
    }
  }

  async classifyDocument(req: Request, res: Response) {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required for classification' });
      }

      const result = await legalNLPClient.classifyDocument(text);
      return res.json(result);
    } catch (err: any) {
      console.error('Document classification error:', err);
      return res.status(500).json({ error: `Classification failed: ${err.message}` });
    }
  }

  async explainClause(req: Request, res: Response) {
    try {
      const { clauseContent } = req.body;
      if (!clauseContent) {
        return res.status(400).json({ error: 'Clause content is required' });
      }

      const explanation = await generationService.explainClause(clauseContent);
      return res.json(explanation);
    } catch (err: any) {
      console.error('Explain clause error:', err);
      return res.status(500).json({ error: `Failed to explain clause: ${err.message}` });
    }
  }

  async rewriteClause(req: Request, res: Response) {
    try {
      const { clauseContent, style, customPrompt } = req.body;
      if (!clauseContent) {
        return res.status(400).json({ error: 'Clause content is required' });
      }

      const rewritten = await generationService.rewriteSection(
        clauseContent,
        (style as any) || 'formal',
        customPrompt
      );
      return res.json({ rewritten });
    } catch (err: any) {
      console.error('Rewrite clause error:', err);
      return res.status(500).json({ error: `Failed to rewrite clause: ${err.message}` });
    }
  }

  async checkMissing(req: Request, res: Response) {
    try {
      const { documentType, structuredFacts } = req.body;
      const result = agentPlanner.checkMissingInformation(documentType, structuredFacts || {});
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: `Missing check failed: ${err.message}` });
    }
  }

  async suggestFix(req: Request, res: Response) {
    try {
      const { documentType, content, issue, structuredFacts } = req.body;
      if (!content || !issue) {
        return res.status(400).json({ error: 'Document content and issue details are required.' });
      }

      const suggestion = await generationService.suggestFix({
        documentType: documentType || 'NDA',
        content,
        issue,
        structuredFacts: structuredFacts || {}
      });

      return res.json(suggestion);
    } catch (err: any) {
      console.error('Suggest fix error:', err);
      return res.status(500).json({ error: `Failed to generate fix: ${err.message}` });
    }
  }

  async syncFacts(req: Request, res: Response) {
    try {
      const { documentType, content, structuredFacts } = req.body;
      if (!content || !structuredFacts) {
        return res.status(400).json({ error: 'Content and structured facts are required.' });
      }

      const result = await generationService.syncStructuredFacts({
        documentType: documentType || 'NDA',
        content,
        structuredFacts
      });

      return res.json(result);
    } catch (err: any) {
      console.error('Sync facts error:', err);
      return res.status(500).json({ error: `Failed to sync facts: ${err.message}` });
    }
  }

  async customEdit(req: Request, res: Response) {
    try {
      const { documentType, content, selectedText, instruction, structuredFacts } = req.body;
      if (!content || !instruction) {
        return res.status(400).json({ error: 'Content and instruction are required.' });
      }

      const result = await generationService.customEdit({
        documentType: documentType || 'NDA',
        content,
        selectedText,
        instruction,
        structuredFacts: structuredFacts || {}
      });

      return res.json(result);
    } catch (err: any) {
      console.error('Custom edit error:', err);
      return res.status(500).json({ error: `Failed to execute custom edit: ${err.message}` });
    }
  }

  async getStandardClauses(req: Request, res: Response) {
    try {
      const documentType = (req.query.documentType as string) || 'NDA';
      const clauses = generationService.getStandardClausesList(documentType);
      return res.json({ clauses });
    } catch (err: any) {
      return res.status(500).json({ error: `Failed to fetch clauses: ${err.message}` });
    }
  }
}

export const aiController = new AIController();

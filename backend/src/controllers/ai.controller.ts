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
}

export const aiController = new AIController();

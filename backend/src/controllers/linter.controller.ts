import { Request, Response } from 'express';
import { lintContract } from '../services/validation/contract_linter.js';

export class LinterController {
  async lint(req: Request, res: Response) {
    try {
      const { content, documentType } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          error: 'Document content is required for linting',
          valid: false,
          errorsCount: 1,
          warningsCount: 0,
          errors: [{
            id: 'lint_missing_content',
            code: 'TOO_SHORT_DOCUMENT',
            message: 'Document content must be a non-empty string.',
            severity: 'ERROR'
          }]
        });
      }

      const result = lintContract(content, documentType);
      return res.json(result);
    } catch (err: any) {
      console.error('Linter error:', err);
      return res.status(500).json({
        error: 'Failed to lint contract',
        message: err.message
      });
    }
  }
}

export const linterController = new LinterController();

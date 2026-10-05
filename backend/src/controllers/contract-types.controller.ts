import { Request, Response } from 'express';
import { getAllContractTypes, getContractTypeConfig } from '../config/contract_types/registry.js';
import { prisma } from '../utils/prisma.js';

export class ContractTypesController {
  async list(req: Request, res: Response) {
    try {
      const types = getAllContractTypes().map(c => ({
        code: c.code,
        name: c.name,
        description: c.description,
        version: c.version,
        jurisdiction: c.jurisdiction,
        icon: c.icon,
        color: c.color,
        category: c.category,
        isActive: c.isActive,
        isFullyFunctional: c.isFullyFunctional,
        fieldsCount: c.questionnaire.length,
        categoriesCount: c.ontologyCategories.length
      }));
      return res.json({ contractTypes: types });
    } catch (err: any) {
      console.error('List contract types error:', err);
      return res.status(500).json({ error: 'Failed to retrieve contract types' });
    }
  }

  async getSchema(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const config = getContractTypeConfig(code);

      if (!config) {
        return res.status(404).json({ error: `Contract type '${code}' not found` });
      }

      return res.json({
        code: config.code,
        name: config.name,
        description: config.description,
        version: config.version,
        jurisdiction: config.jurisdiction,
        isFullyFunctional: config.isFullyFunctional,
        ontologyCategories: config.ontologyCategories,
        questionnaire: config.questionnaire,
        requiredFacts: config.requiredFacts,
        optionalFacts: config.optionalFacts
      });
    } catch (err: any) {
      console.error('Get contract type schema error:', err);
      return res.status(500).json({ error: 'Failed to retrieve contract schema' });
    }
  }

  async getClauses(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const upper = code.toUpperCase();
      let clauses: any[] = [];

      try {
        clauses = await prisma.clause.findMany({
          where: {
            documentType: upper,
            status: 'APPROVED'
          },
          orderBy: { title: 'asc' }
        });
      } catch (dbErr) {
        console.warn('Database offline, returning empty approved clauses list:', dbErr);
      }

      return res.json({ clauses });
    } catch (err: any) {
      console.error('Get clauses error:', err);
      return res.status(500).json({ error: 'Failed to retrieve approved clauses' });
    }
  }
}

export const contractTypesController = new ContractTypesController();

import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class TemplatesController {
  async list(req: AuthRequest, res: Response) {
    try {
      const templates = await prisma.template.findMany({
        include: {
          documentType: true,
          sections: { orderBy: { orderIndex: 'asc' } }
        }
      });
      return res.json({ templates });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve templates' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const template = await prisma.template.findUnique({
        where: { id },
        include: {
          documentType: true,
          sections: { orderBy: { orderIndex: 'asc' } }
        }
      });
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      return res.json({ template });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve template' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, sections } = req.body;

      const template = await prisma.template.update({
        where: { id },
        data: {
          name,
          description,
          version: { increment: 1 }
        }
      });

      if (Array.isArray(sections)) {
        for (const sec of sections) {
          if (sec.id) {
            await prisma.templateSection.update({
              where: { id: sec.id },
              data: {
                title: sec.title,
                isRequired: sec.isRequired,
                defaultPromptGuide: sec.defaultPromptGuide,
                defaultContent: sec.defaultContent
              }
            });
          }
        }
      }

      return res.json({ message: 'Template updated successfully', template });
    } catch (err: any) {
      return res.status(500).json({ error: `Failed to update template: ${err.message}` });
    }
  }
}

export const templatesController = new TemplatesController();

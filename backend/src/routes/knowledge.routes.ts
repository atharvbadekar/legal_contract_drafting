import { Router } from 'express';
import { knowledgeController } from '../controllers/knowledge.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => knowledgeController.list(req, res));
router.get('/:id/chunks', (req, res) => knowledgeController.getChunks(req, res));
router.post('/upload', requireAdmin, (req, res) => knowledgeController.upload(req, res));
router.delete('/:id', requireAdmin, (req, res) => knowledgeController.delete(req, res));

export default router;

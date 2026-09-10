import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/extract-facts', (req, res) => aiController.extractFacts(req, res));
router.post('/classify-document', (req, res) => aiController.classifyDocument(req, res));
router.post('/explain-clause', (req, res) => aiController.explainClause(req, res));
router.post('/rewrite-clause', (req, res) => aiController.rewriteClause(req, res));
router.post('/check-missing', (req, res) => aiController.checkMissing(req, res));

export default router;

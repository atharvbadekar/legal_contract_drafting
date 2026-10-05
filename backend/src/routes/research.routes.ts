import { Router } from 'express';
import { researchController } from '../controllers/research.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/metrics', (req, res) => researchController.getMetrics(req, res));
router.get('/audit', (req, res) => researchController.getAuditLogs(req, res));
router.get('/benchmark', (req, res) => researchController.getBenchmarkReport(req, res));
router.post('/benchmark/run', (req, res) => researchController.runBenchmark(req, res));

export default router;

import { Router } from 'express';
import { clausesController } from '../controllers/clauses.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => clausesController.list(req, res));
router.post('/', requireAdmin, (req, res) => clausesController.create(req, res));
router.put('/:id', requireAdmin, (req, res) => clausesController.update(req, res));
router.post('/:id/approve', requireAdmin, (req, res) => clausesController.approve(req, res));
router.post('/:id/archive', requireAdmin, (req, res) => clausesController.archive(req, res));

export default router;

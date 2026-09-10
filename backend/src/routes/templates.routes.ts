import { Router } from 'express';
import { templatesController } from '../controllers/templates.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => templatesController.list(req, res));
router.get('/:id', (req, res) => templatesController.getById(req, res));
router.put('/:id', requireAdmin, (req, res) => templatesController.update(req, res));

export default router;

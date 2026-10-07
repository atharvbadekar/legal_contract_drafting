import { Router } from 'express';
import { systemController } from '../controllers/system.controller.js';

const router = Router();

router.get('/status', (req, res) => systemController.getStatus(req, res));

export default router;

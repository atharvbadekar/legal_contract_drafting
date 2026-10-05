import { Router } from 'express';
import { linterController } from '../controllers/linter.controller.js';

const router = Router();

router.post('/lint', (req, res) => linterController.lint(req, res));

export default router;

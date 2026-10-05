import { Router } from 'express';
import { contractTypesController } from '../controllers/contract-types.controller.js';

const router = Router();

router.get('/', (req, res) => contractTypesController.list(req, res));
router.get('/:code', (req, res) => contractTypesController.getSchema(req, res));
router.get('/:code/clauses', (req, res) => contractTypesController.getClauses(req, res));

export default router;

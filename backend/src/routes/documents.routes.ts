import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => documentsController.list(req, res));
router.post('/', (req, res) => documentsController.create(req, res));
router.get('/:id', (req, res) => documentsController.getById(req, res));
router.put('/:id', (req, res) => documentsController.update(req, res));
router.delete('/:id', (req, res) => documentsController.delete(req, res));

router.post('/:id/generate', (req, res) => documentsController.generate(req, res));
router.post('/:id/validate', (req, res) => documentsController.validate(req, res));

router.get('/:id/versions', (req, res) => documentsController.getVersions(req, res));
router.post('/:id/restore/:versionId', (req, res) => documentsController.restoreVersion(req, res));

router.get('/:id/export/docx', (req, res) => documentsController.exportDocx(req, res));
router.get('/:id/export/pdf', (req, res) => documentsController.exportPdf(req, res));

export default router;

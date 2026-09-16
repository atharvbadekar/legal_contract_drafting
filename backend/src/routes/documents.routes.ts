import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller.js';
import { requireAuth } from '../middleware/auth.js';

import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => documentsController.list(req, res));
router.post('/', (req, res) => documentsController.create(req, res));
router.post('/analyze', upload.single('file'), (req, res) => documentsController.analyzeContract(req, res));
router.post('/import-analyzed', (req, res) => documentsController.importAnalyzed(req, res));
router.get('/:id', (req, res) => documentsController.getById(req, res));
router.put('/:id', (req, res) => documentsController.update(req, res));
router.delete('/:id', (req, res) => documentsController.delete(req, res));

router.post('/:id/generate', (req, res) => documentsController.generate(req, res));
router.post('/:id/validate', (req, res) => documentsController.validate(req, res));

router.get('/:id/versions', (req, res) => documentsController.getVersions(req, res));
router.post('/:id/restore/:versionId', (req, res) => documentsController.restoreVersion(req, res));
router.post('/:id/undo', (req, res) => documentsController.undoLastFix(req, res));

router.get('/:id/issues/:issueId/patch', (req, res) => documentsController.getIssuePatch(req, res));
router.post('/:id/issues/:issueId/fix', (req, res) => documentsController.applyIssuePatch(req, res));
router.post('/:id/issues/:issueId/review', (req, res) => documentsController.reviewIssue(req, res));
router.post('/:id/fix-safe', (req, res) => documentsController.fixAllSafe(req, res));

router.get('/:id/diff', (req, res) => documentsController.getDiff(req, res));
router.get('/:id/export/docx', (req, res) => documentsController.exportDocx(req, res));
router.get('/:id/export/pdf', (req, res) => documentsController.exportPdf(req, res));

export default router;

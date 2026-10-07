import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ];
    const allowedExts = /\.(pdf|docx|doc|txt|md)$/i;
    if (allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Supported file formats are PDF, DOCX, TXT, and Markdown (up to 15MB).'));
    }
  }
});

const handleContractUpload = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Uploaded file exceeds the maximum 15MB size limit.' });
      }
      return res.status(400).json({ error: err.message || 'File upload validation failed.' });
    }
    next();
  });
};

const router = Router();

// Public / Guest accessible analysis routes
router.post('/analyze', optionalAuth, handleContractUpload, (req, res) => documentsController.analyzeContract(req, res));
router.post('/import-analyzed', optionalAuth, (req, res) => documentsController.importAnalyzed(req, res));

// Authenticated workspace document operations
router.use(requireAuth);

router.get('/', (req, res) => documentsController.list(req, res));
router.post('/', (req, res) => documentsController.create(req, res));
router.get('/:id', (req, res) => documentsController.getById(req, res));
router.put('/:id', (req, res) => documentsController.update(req, res));
router.delete('/:id', (req, res) => documentsController.delete(req, res));

router.post('/:id/generate', (req, res) => documentsController.generate(req, res));
router.post('/:id/validate', (req, res) => documentsController.validate(req, res));

router.get('/:id/versions/compare', (req, res) => documentsController.compareVersions(req, res));
router.get('/:id/versions', (req, res) => documentsController.getVersions(req, res));
router.post('/:id/restore/:versionId', (req, res) => documentsController.restoreVersion(req, res));
router.get('/:id/audit/export', (req, res) => documentsController.exportAuditReport(req, res));
router.get('/:id/audit', (req, res) => documentsController.getAuditTrail(req, res));
router.post('/:id/undo', (req, res) => documentsController.undoLastFix(req, res));

router.get('/:id/issues/:issueId/patch', (req, res) => documentsController.getIssuePatch(req, res));
router.post('/:id/issues/:issueId/fix', (req, res) => documentsController.applyIssuePatch(req, res));
router.post('/:id/issues/:issueId/review', (req, res) => documentsController.reviewIssue(req, res));
router.post('/:id/fix-safe', (req, res) => documentsController.fixAllSafe(req, res));

// Natural-Language Editing & Diff Pipeline
router.post('/:id/nl-edit/plan', (req, res) => documentsController.planNaturalLanguageEdit(req, res));
router.post('/:id/nl-edit/apply', (req, res) => documentsController.applyNaturalLanguageEdit(req, res));
router.post('/:id/nl-edit/undo', (req, res) => documentsController.undoNaturalLanguageEdit(req, res));

router.get('/:id/export/docx', (req, res) => documentsController.exportDocx(req, res));
router.get('/:id/export/pdf', (req, res) => documentsController.exportPdf(req, res));

export default router;

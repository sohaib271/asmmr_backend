import { Router } from 'express';
import { decidePublication, listAssignments } from '../controllers/reviewerController.js';
import { requireAuth, requireReviewer } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requireReviewer);
router.get('/assignments', listAssignments);
router.patch('/publications/:id/decision', decidePublication);
export default router;

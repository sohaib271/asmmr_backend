import { Router } from 'express';
import { adminOverview, assignPublication, reviewMembership, setReviewerRole } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/overview', adminOverview);
router.patch('/memberships/:id', reviewMembership);
router.patch('/memberships/:id/reviewer', setReviewerRole);
router.patch('/publications/:id/assign', assignPublication);

export default router;

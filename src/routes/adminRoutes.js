import { Router } from 'express';
import { adminOverview, reviewMembership, reviewPublication } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/overview', adminOverview);
router.patch('/memberships/:id', reviewMembership);
router.patch('/publications/:id', reviewPublication);
export default router;

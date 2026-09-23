import { Router } from 'express';
import { createMembership, getMyMembership, listMembers } from '../controllers/membershipController.js';
import { membershipUpload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router=Router();
router.get('/', listMembers);
router.get('/mine', requireAuth, getMyMembership);
router.post('/', requireAuth, membershipUpload.fields([{name:'profilePicture',maxCount:1},{name:'cv',maxCount:1}]), createMembership);
export default router;

import { Router } from 'express';
import { createMembership, listMembers } from '../controllers/membershipController.js';
import { membershipUpload } from '../middleware/upload.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const router=Router();
router.get('/', listMembers);
router.post('/', membershipUpload.fields([{name:'profilePicture',maxCount:1},{name:'cv',maxCount:1}]), createMembership);
export default router;

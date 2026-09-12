import { Router } from 'express';
import { createMembership } from '../controllers/membershipController.js';
import { membershipUpload } from '../middleware/upload.js';
const router=Router(); router.post('/',membershipUpload.fields([{name:'profilePicture',maxCount:1},{name:'cv',maxCount:1}]),createMembership); export default router;

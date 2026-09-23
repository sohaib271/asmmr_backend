import { Router } from 'express';
import { createPublication, listMyPublications } from '../controllers/publicationController.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.get('/mine', listMyPublications);
router.post('/', createPublication);
export default router;

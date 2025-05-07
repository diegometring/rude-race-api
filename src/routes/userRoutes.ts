import { Router } from 'express';
import { createUser, getAuthenticatedUser } from '../controller/user';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/users', createUser);
router.get('/me', authMiddleware, getAuthenticatedUser);

export default router;
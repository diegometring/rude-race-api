import 'reflect-metadata';
import { createMatch, createUser, getAuthenticatedUser, getBestScore, getMatchHistory, getPlayerScore, getScoreByDate, getTopMatches } from '../controller/user';
import { authMiddleware } from '../middlewares/authMiddleware';
import { Router } from 'express';


const router = Router();

router.post('/users', createUser);
router.post('/users/:id/matches', createMatch);
router.get('/me', authMiddleware, getAuthenticatedUser);
router.get('/users/:id/score', authMiddleware, getPlayerScore);
router.get('/users/:id/score-by-date', authMiddleware, getScoreByDate);
router.get('/users/:id/best-score', authMiddleware, getBestScore);
router.get('/users/:id/matches', authMiddleware, getMatchHistory);
router.get('/users/:id/top-matches', authMiddleware, getTopMatches);

export default router;
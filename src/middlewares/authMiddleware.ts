import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../security/jwt';

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Token de autenticação não fornecido ou mal formatado.' });
        return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
        res.status(401).json({ message: 'Token inválido ou expirado.' });
        return;
    }

    req.userId = decoded.userId;
    next();
};
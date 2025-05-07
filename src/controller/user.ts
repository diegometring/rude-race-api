import { Request, Response } from 'express';
import { findOrCreateUser } from '../services/userService';

export const createUser = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;

    if (!name) {
        res.status(400).json({ message: 'O campo "name" é obrigatório.' });
        return;
    }

    try {
        const user = await findOrCreateUser(name);
        res.status(201).json(user);
    } catch (error: any) {
        if (error.message.includes('O nome do usuário não pode ser vazio')) {
            res.status(400).json({ message: error.message });
        } else {
            console.error('Erro ao criar/buscar usuário:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    }
};

export const getAuthenticatedUser = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado ou ID não encontrado no token.' });
        return;
    }
    res.status(200).json({ userId });
};
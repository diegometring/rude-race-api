import 'reflect-metadata'
import { Request, Response } from 'express';
import { findOrCreateUser } from '../services/userService';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import { Match } from '../entity/Match';
import { Between } from 'typeorm';
import { saveMatch } from '../services/matchService';

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

export const getPlayerScore = async (req: Request, res: Response): Promise<void> => {
  const playerId = Number(req.params.id);

  if (isNaN(playerId)) {
    res.status(400).json({ error: 'ID inválido' });
  }

  const playerRepo = AppDataSource.getRepository(User);
  const player = await playerRepo.findOneBy({ id: playerId });

  if (!player) {
    res.status(404).json({ error: 'Jogador não encontrado' });
  }

  res.json({ id: player!.id, name: player!.name });
};

export const getScoreByDate = async (req: Request, res: Response): Promise<void>  => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) res.status(400).json({ message: "Missing date query param" });

    const matches = await AppDataSource.getRepository(Match).find({
        where: {
            user: { id: Number(id) },
            playedAt: Between(new Date(`${date}T00:00:00Z`), new Date(`${date}T23:59:59Z`))
        }
    });

    res.json(matches);
};

export const getBestScore = async (req: Request, res: Response): Promise<void>  => {
    const { id } = req.params;

    const bestMatch = await AppDataSource.getRepository(Match).findOne({
        where: { user: { id: Number(id) } },
        order: { score: 'DESC' },
    });

    res.json(bestMatch);
};

export const getMatchHistory = async (req: Request, res: Response): Promise<void>  => {
    const { id } = req.params;

    const matches = await AppDataSource.getRepository(Match).find({
        where: { user: { id: Number(id) } },
        order: { playedAt: 'DESC' },
    });

    res.json(matches);
};

export const getTopMatches = async (req: Request, res: Response): Promise<void>  => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const matches = await AppDataSource.getRepository(Match).find({
        where: { user: { id: Number(id) } },
        order: { score: 'DESC' },
        take: limit,
    });

    res.json(matches);
};

export const createMatch = async (req: Request, res: Response): Promise<void>  => {
    try {
        const userId = Number(req.params.id);
        const { score } = req.body; // O score vem do corpo da requisição

        if (score === undefined || typeof score !== 'number') {
            res.status(400).json({ message: 'O campo "score" é obrigatório e deve ser um número.' });
            return;
        }

        // Chama a função de serviço com os dados extraídos da requisição
        const newMatch = await saveMatch(userId, score);
        
        res.status(201).json(newMatch);

    } catch (error: any) {
        // Se o serviço der um erro (ex: usuário não encontrado), ele será capturado aqui
        res.status(404).json({ message: error.message });
    }
};



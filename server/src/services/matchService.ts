// src/services/matchService.ts
import { AppDataSource } from "../data-source";
import { Match } from "../entity/Match";
import { User } from "../entity/User";

const matchRepository = AppDataSource.getRepository(Match);
const userRepository = AppDataSource.getRepository(User);

export const saveMatch = async (userId: number, score: number): Promise<Match> => {
    const user = await userRepository.findOneBy({ id: userId });
    if (!user) {
        throw new Error('User not found');
    }
    // O banco pode armazenar o tempo em milissegundos (inteiro) para precisão.
    const scoreInMs = Math.round(score * 1000);

    const match = matchRepository.create({
        user: user,
        score: scoreInMs,
        playedAt: new Date()
    });

    return await matchRepository.save(match);
};

export const getTopMatchesAsService = async (limit: number = 10) => {
    const matches = await matchRepository.find({
        relations: ['user'],
        order: { score: 'ASC' }, // ASC porque tempo menor é melhor
        take: limit,
    });
    // Formata para enviar ao cliente
    return matches.map(match => ({
        username: match.user.name,
        time: match.score / 1000 // Converte de volta para segundos
    }));
};
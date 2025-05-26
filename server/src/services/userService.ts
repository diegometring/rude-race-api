import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import { generateToken } from '../security/jwt';

export interface UserResponse {
    id: number;
    name: string;
    token?: string;
}

const userRepository = AppDataSource.getRepository(User);

export const findOrCreateUser = async (name: string): Promise<UserResponse> => {
    if (!name || name.trim() === '') {
        throw new Error('O nome do usuário não pode ser vazio.');
    }

    let user = await userRepository.findOneBy({ name });

    if (user) {
        const token = generateToken({ userId: user.id });
        return { id: user.id, name: user.name, token };
    } else {
        const newUser = userRepository.create({ name });
        user = await userRepository.save(newUser);
        const token = generateToken({ userId: user.id });
        return { id: user.id, name: user.name, token };
    }
};
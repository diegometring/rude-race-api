import jwt, {SignOptions} from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não está definido no .env');
}

export const generateToken = (payload: object, tokenExpiresIn: string | number = '1h'): string => {
    const options: SignOptions = {expiresIn: tokenExpiresIn};
    return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): any | null => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import {User} from './entity/User';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false, 
    logging: process.env.NODE_ENV === 'development' ? true : false, 
    entities: [User], 
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    subscribers: [],
});
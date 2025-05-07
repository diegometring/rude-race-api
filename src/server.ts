import 'reflect-metadata'; 
import app from './app';
import { AppDataSource } from './data-source'; 
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
    .then(() => {
        console.log('projeto iniciado');
        app.listen(PORT, () => {
            console.log(`rodando na porta ${PORT}`);
            console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    })
    .catch((error) => {
        console.error('Erro na inicialização', error);
        process.exit(1); 
    });
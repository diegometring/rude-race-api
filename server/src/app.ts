import 'reflect-metadata'; 
import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API funcionando!');
});

app.use('/api', userRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Algo deu errado!');
});

export default app;
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import { logger } from './lib/logger';
import { swaggerSpec } from './docs/swagger';
import authRoutes from './routes/auth.routes';
import sedesRoutes from './routes/sedes.routes';
import estudiantesRoutes from './routes/estudiantes.routes';
import statsRoutes from './routes/stats.routes';
import externalRoutes from './routes/external.routes';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  }),
);

if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/sedes', sedesRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/external', externalRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err, 'Unhandled error');
  res.status(500).json({ message: 'Error interno del servidor' });
});

export default app;

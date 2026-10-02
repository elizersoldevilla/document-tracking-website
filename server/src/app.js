import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAuthRouter } from './routes/authRoutes.js';
import { createDocumentRouter } from './routes/documentRoutes.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(currentDirectory, '../../client/dist');

export function createApp({
  config,
  pool,
  authService,
  authController,
  documentController,
}) {
  const app = express();
  app.disable('x-powered-by');

  if (config.nodeEnv !== 'test') {
    app.set('trust proxy', 1);
  }

  app.use(config.nodeEnv === 'production'
    ? helmet()
    : helmet({ strictTransportSecurity: false }));
  app.use(cors({
    origin: config.appOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  app.get('/api/health', asyncHandler(async (_req, res) => {
    await pool.execute('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Service is healthy.',
      data: { database: 'connected' },
    });
  }));

  app.use('/api/auth', createAuthRouter({
    controller: authController,
    authService,
    config,
  }));

  app.use('/api', createDocumentRouter({
    controller: documentController,
    authService,
  }));

  if (config.nodeEnv === 'production') {
    app.use(express.static(clientDirectory));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(clientDirectory, 'index.html'));
        return;
      }
      next();
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

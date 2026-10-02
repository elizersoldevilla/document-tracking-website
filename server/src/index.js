import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createAuthController } from './controllers/authController.js';
import { createDocumentController } from './controllers/documentController.js';
import { createDatabasePool } from './db/pool.js';
import { documentEventBus } from './events/documentEventBus.js';
import { DocumentRepository } from './repositories/documentRepository.js';
import { FileRepository } from './repositories/fileRepository.js';
import { MessageRepository } from './repositories/messageRepository.js';
import { UserRepository } from './repositories/userRepository.js';
import { AuthService } from './services/authService.js';
import { DocumentService } from './services/documentService.js';

const config = loadConfig();
const pool = createDatabasePool(config.database);
const userRepository = new UserRepository(pool);
const documentRepository = new DocumentRepository(pool);
const fileRepository = new FileRepository(pool);
const messageRepository = new MessageRepository(pool);
const authService = new AuthService({
  userRepository,
  jwtSecret: config.jwtSecret,
});
const documentService = new DocumentService({
  documentRepository,
  userRepository,
  fileRepository,
  messageRepository,
  eventBus: documentEventBus,
});
const authController = createAuthController({ authService, config });
const documentController = createDocumentController({
  documentService,
  eventBus: documentEventBus,
});

const app = createApp({
  config,
  pool,
  authService,
  authController,
  documentController,
});

const server = app.listen(config.port, () => {
  console.log(`CLEAR API listening on http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing services.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

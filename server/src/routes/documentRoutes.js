import express, { Router } from 'express';
import { ROLES } from '../domain/documentWorkflow.js';
import { createAuthenticationMiddleware, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../utils/csrf.js';
import {
  createDocumentSchema,
  createMessageSchema,
  documentIdSchema,
  fileIdSchema,
  listDocumentsSchema,
  updateDocumentSchema,
  updateStatusSchema,
} from '../validators/documentSchemas.js';

export function createDocumentRouter({ controller, authService }) {
  const router = Router();
  const authenticate = createAuthenticationMiddleware(authService);

  router.use((req, _res, next) => {
    const scoped = req.path === '/professors'
      || req.path.startsWith('/documents')
      || req.path.startsWith('/files')
      || req.path.startsWith('/messages');
    if (!scoped) {
      next('router');
      return;
    }
    next();
  });
  router.use(authenticate);
  router.use(csrfProtection);

  router.get('/professors', controller.listProfessors);
  router.get('/documents', validate(listDocumentsSchema, 'query'), controller.list);
  router.post('/documents', requireRole(ROLES.STUDENT), validate(createDocumentSchema), controller.create);
  router.get('/documents/:id/events', validate(documentIdSchema, 'params'), controller.events);
  router.get('/documents/:id/history', validate(documentIdSchema, 'params'), controller.history);
  router.get('/documents/:id', validate(documentIdSchema, 'params'), controller.get);
  router.patch(
    '/documents/:id',
    requireRole(ROLES.STUDENT),
    validate(documentIdSchema, 'params'),
    validate(updateDocumentSchema),
    controller.updateDetails,
  );
  router.patch(
    '/documents/:id/status',
    requireRole(ROLES.PROFESSOR, ROLES.ADMIN),
    validate(documentIdSchema, 'params'),
    validate(updateStatusSchema),
    controller.updateStatus,
  );

  // File attachments (stored as blobs so no storage bucket is required).
  const uploadRaw = express.raw({ type: 'multipart/form-data', limit: '12mb' });
  router.get('/documents/:id/files', validate(documentIdSchema, 'params'), controller.listFiles);
  router.post(
    '/documents/:id/files',
    requireRole(ROLES.STUDENT, ROLES.PROFESSOR),
    validate(documentIdSchema, 'params'),
    uploadRaw,
    controller.uploadFile,
  );
  router.get('/files/:fileId', validate(fileIdSchema, 'params'), controller.downloadFile);
  router.delete('/files/:fileId', validate(fileIdSchema, 'params'), controller.deleteFile);

  // Per-document message threads.
  router.get('/messages', controller.listMessages);
  router.get('/documents/:id/messages', validate(documentIdSchema, 'params'), controller.listDocumentMessages);
  router.post(
    '/documents/:id/messages',
    validate(documentIdSchema, 'params'),
    validate(createMessageSchema),
    controller.createMessage,
  );

  return router;
}

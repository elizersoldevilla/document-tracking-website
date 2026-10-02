import { AppError } from '../utils/AppError.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Parsed with the platform `Response.formData()` so uploads need no extra dependency.
async function parseMultipart(req) {
  const contentType = req.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    throw new AppError('Uploads must be sent as multipart/form-data.', {
      status: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new AppError('Choose a file to upload.', { status: 422, code: 'EMPTY_UPLOAD' });
  }

  // The body includes the multipart envelope, so allow a little slack over the
  // file cap here; the exact per-file limit is enforced once it is extracted.
  if (req.body.length > MAX_FILE_BYTES + 1024 * 1024) {
    throw new AppError('Files must be 10 MB or smaller.', { status: 413, code: 'PAYLOAD_TOO_LARGE' });
  }

  try {
    return await new Response(new Uint8Array(req.body), {
      headers: { 'content-type': contentType },
    }).formData();
  } catch {
    throw new AppError('The uploaded file could not be read. Please try again.', {
      status: 422,
      code: 'INVALID_MULTIPART',
    });
  }
}

function contentDisposition(fileName) {
  const ascii = fileName.replace(/[^\u0020-\u007e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export function createDocumentController({ documentService, eventBus }) {
  return {
    listProfessors: async (_req, res) => {
      const professors = await documentService.listProfessors();
      res.status(200).json({
        success: true,
        message: 'Professors retrieved.',
        data: professors,
      });
    },

    list: async (req, res) => {
      const result = await documentService.list(req.user, req.validated?.query || req.query);
      res.status(200).json({
        success: true,
        message: 'Documents retrieved.',
        data: result,
      });
    },

    get: async (req, res) => {
      const document = await documentService.get(req.user, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Document retrieved.',
        data: document,
      });
    },

    create: async (req, res) => {
      const document = await documentService.create(req.user, req.body);
      res.status(201).json({
        success: true,
        message: 'Document request submitted.',
        data: document,
      });
    },

    updateStatus: async (req, res) => {
      const document = await documentService.updateStatus(req.user, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Document status updated.',
        data: document,
      });
    },

    updateDetails: async (req, res) => {
      const document = await documentService.updateDetails(req.user, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Document details updated.',
        data: document,
      });
    },

    history: async (req, res) => {
      const history = await documentService.history(req.user, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Document history retrieved.',
        data: history,
      });
    },

    events: async (req, res) => {
      await documentService.get(req.user, req.params.id);
      const documentId = String(req.params.id);

      res.status(200);
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      res.write('retry: 3000\n\n');

      const sendUpdate = (payload) => {
        res.write(`event: document\ndata: ${JSON.stringify(payload)}\n\n`);
      };
      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 20000);

      eventBus.on(documentId, sendUpdate);
      req.on('close', () => {
        clearInterval(heartbeat);
        eventBus.off(documentId, sendUpdate);
        res.end();
      });
    },

    listFiles: async (req, res) => {
      const files = await documentService.listFiles(req.user, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Files retrieved.',
        data: files,
      });
    },

    uploadFile: async (req, res) => {
      const form = await parseMultipart(req);
      const uploaded = form.get('file');

      if (!uploaded || typeof uploaded.arrayBuffer !== 'function') {
        throw new AppError('Choose a file to upload.', { status: 422, code: 'EMPTY_UPLOAD' });
      }

      const content = Buffer.from(await uploaded.arrayBuffer());
      const file = await documentService.uploadFile(req.user, req.params.id, {
        requirementSlug: form.get('requirementSlug'),
        originalName: uploaded.name,
        mimeType: uploaded.type,
        sizeBytes: content.length,
        content,
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded.',
        data: file,
      });
    },

    downloadFile: async (req, res) => {
      const file = await documentService.downloadFile(req.user, req.params.fileId);

      res.status(200);
      res.set({
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Length': String(file.content.length),
        'Content-Disposition': contentDisposition(file.originalName),
        'Cache-Control': 'private, max-age=0, no-store',
      });
      res.end(file.content);
    },

    deleteFile: async (req, res) => {
      await documentService.deleteFile(req.user, req.params.fileId);
      res.status(200).json({
        success: true,
        message: 'File removed.',
        data: null,
      });
    },

    listMessages: async (req, res) => {
      const messages = await documentService.listAllMessages(req.user);
      res.status(200).json({
        success: true,
        message: 'Messages retrieved.',
        data: messages,
      });
    },

    listDocumentMessages: async (req, res) => {
      const messages = await documentService.listMessages(req.user, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Messages retrieved.',
        data: messages,
      });
    },

    createMessage: async (req, res) => {
      const message = await documentService.sendMessage(req.user, req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Message sent.',
        data: message,
      });
    },
  };
}

import {
  DOCUMENT_STATUS,
  ROLES,
  STATUS_LABELS,
  canTransition,
  canViewDocument,
  getAvailableActions,
} from '../domain/documentWorkflow.js';
import { AppError } from '../utils/AppError.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
]);

function fileExtension(name) {
  const index = name.lastIndexOf('.');
  return index > -1 ? name.slice(index + 1).toLowerCase() : '';
}

// Strips any path a browser may have echoed back and keeps the name URL/header safe.
function sanitizeFileName(name) {
  const base = String(name || '').replace(/\\/g, '/').split('/').pop() || '';
  const cleaned = [...base]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .trim();
  return (cleaned || 'upload').slice(0, 255);
}

function isAllowedFileType(name, mimeType) {
  const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const extension = fileExtension(name);
  // The extension decides the name a download lands as, so it is the guard that
  // matters. Extension-less uploads fall back to the browser-declared type.
  if (extension) return ALLOWED_EXTENSIONS.has(extension);
  return Boolean(mime) && ALLOWED_MIME_TYPES.has(mime);
}

function availableActions(user, status) {
  return getAvailableActions(user.role, status).map((value) => ({
    status: value,
    label: STATUS_LABELS[value],
  }));
}

function presentDocument(document, user) {
  return {
    ...document,
    availableActions: availableActions(user, document.status),
  };
}

export class DocumentService {
  constructor({ documentRepository, userRepository, fileRepository, messageRepository, eventBus }) {
    this.documentRepository = documentRepository;
    this.userRepository = userRepository;
    this.fileRepository = fileRepository;
    this.messageRepository = messageRepository;
    this.eventBus = eventBus;
  }

  async listProfessors() {
    return this.userRepository.listProfessors();
  }

  async list(user, filters) {
    const result = await this.documentRepository.list(user, filters);
    return {
      items: result.items.map((document) => presentDocument(document, user)),
      pagination: result.pagination,
      summary: result.summary,
      withRemarks: result.withRemarks ?? 0,
    };
  }

  async get(user, documentId) {
    const document = await this.documentRepository.findAccessibleById(user, documentId);
    if (!document) {
      throw new AppError('Document not found.', {
        status: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }
    return presentDocument(document, user);
  }

  async create(user, input) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can submit document requests.', {
        status: 403,
        code: 'ROLE_NOT_ALLOWED',
      });
    }

    const professor = await this.userRepository.findById(input.professorId);
    if (!professor || professor.role !== ROLES.PROFESSOR) {
      throw new AppError('Select an available professor.', {
        status: 422,
        code: 'INVALID_PROFESSOR',
      });
    }

    const document = await this.documentRepository.withTransaction(async (connection) => {
      const documentId = await this.documentRepository.insert(connection, {
        studentId: user.id,
        professorId: professor.id,
        title: input.title,
        description: input.description,
        status: DOCUMENT_STATUS.SUBMITTED,
        researchTeamName: input.researchTeamName,
      });

      await this.documentRepository.insertLog(connection, {
        documentId,
        updatedByUserId: user.id,
        previousStatus: null,
        newStatus: DOCUMENT_STATUS.SUBMITTED,
        remarks: null,
      });

      return this.documentRepository.findByIdForUpdate(connection, documentId);
    });

    const created = await this.get(user, Number(document.id));
    this.eventBus.emit(String(document.id), { type: 'document.created', document: created });
    return created;
  }

  async updateDetails(user, documentId, input) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only the requesting student can edit these details.', {
        status: 403,
        code: 'ROLE_NOT_ALLOWED',
      });
    }

    const current = await this.documentRepository.findAccessibleById(user, documentId);
    if (!current || Number(current.studentId) !== Number(user.id)) {
      throw new AppError('Document not found.', {
        status: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    await this.documentRepository.updateResearchTeamName(Number(documentId), input.researchTeamName);

    const updated = await this.get(user, documentId);
    this.eventBus.emit(String(documentId), { type: 'document.updated', document: updated });
    return updated;
  }

  async updateStatus(user, documentId, input) {
    await this.documentRepository.withTransaction(async (connection) => {
      const current = await this.documentRepository.findByIdForUpdate(connection, documentId);
      if (!current || !canViewDocument(user, current)) {
        throw new AppError('Document not found.', {
          status: 404,
          code: 'DOCUMENT_NOT_FOUND',
        });
      }

      if (!canTransition(user.role, current.status, input.status)) {
        throw new AppError(`Status cannot move from ${STATUS_LABELS[current.status]} to ${STATUS_LABELS[input.status]}.`, {
          status: 409,
          code: 'INVALID_STATUS_TRANSITION',
          details: {
            currentStatus: current.status,
            requestedStatus: input.status,
            allowedStatuses: availableActions(user, current.status),
          },
        });
      }

      if (input.version !== undefined && Number(current.version) !== input.version) {
        throw new AppError('This document was updated by another user. Refresh and try again.', {
          status: 409,
          code: 'DOCUMENT_VERSION_CONFLICT',
          details: { currentVersion: current.version },
        });
      }

      const updatedRow = await this.documentRepository.updateStatus(
        connection,
        documentId,
        current.version,
        input.status,
      );

      if (!updatedRow) {
        throw new AppError('The document update conflicted with another request. Try again.', {
          status: 409,
          code: 'DOCUMENT_VERSION_CONFLICT',
        });
      }

      await this.documentRepository.insertLog(connection, {
        documentId,
        updatedByUserId: user.id,
        previousStatus: current.status,
        newStatus: input.status,
        remarks: input.remarks,
      });

      return this.documentRepository.findByIdForUpdate(connection, documentId);
    });

    const document = await this.get(user, documentId);
    this.eventBus.emit(String(documentId), { type: 'document.updated', document });
    return document;
  }

  async history(user, documentId) {
    await this.get(user, documentId);
    return this.documentRepository.findHistory(documentId);
  }

  // ------------------------------- Files -------------------------------

  async listFiles(user, documentId) {
    await this.get(user, documentId);
    const files = await this.fileRepository.listByDocument(documentId);

    // Opening the submission set counts as the ethics board viewing it.
    const boardViewed = user.role === ROLES.PROFESSOR || user.role === ROLES.ADMIN;
    if (!boardViewed || files.length === 0) {
      return files;
    }

    await this.fileRepository.markDocumentViewed(documentId);
    const viewedAt = new Date();
    return files.map((file) => ({ ...file, viewedAt: file.viewedAt || viewedAt }));
  }

  async uploadFile(user, documentId, input) {
    await this.get(user, documentId);

    if (user.role === ROLES.ADMIN) {
      throw new AppError('The admin office does not submit applicant files.', {
        status: 403,
        code: 'ROLE_NOT_ALLOWED',
      });
    }

    const requirementSlug = String(input.requirementSlug || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{1,64}$/.test(requirementSlug)) {
      throw new AppError('Select a requirement before uploading.', {
        status: 422,
        code: 'INVALID_REQUIREMENT',
      });
    }

    const originalName = sanitizeFileName(input.originalName);
    const mimeType = String(input.mimeType || 'application/octet-stream').slice(0, 120);
    const sizeBytes = Number(input.sizeBytes);
    const { content } = input;

    if (!Buffer.isBuffer(content) || content.length === 0 || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
      throw new AppError('Choose a file to upload.', {
        status: 422,
        code: 'EMPTY_UPLOAD',
      });
    }

    if (sizeBytes > MAX_FILE_BYTES) {
      throw new AppError('Files must be 10 MB or smaller.', {
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
      });
    }

    if (!isAllowedFileType(originalName, mimeType)) {
      throw new AppError('That file type cannot be uploaded. Use a PDF, image, Office document, text or zip file.', {
        status: 422,
        code: 'UNSUPPORTED_FILE_TYPE',
      });
    }

    const fileId = await this.fileRepository.insert({
      documentId: Number(documentId),
      requirementSlug,
      originalName,
      mimeType,
      sizeBytes,
      content,
      uploadedBy: user.id,
    });

    const files = await this.fileRepository.listByDocument(documentId);
    return files.find((file) => Number(file.id) === Number(fileId)) || null;
  }

  async downloadFile(user, fileId) {
    const file = await this.fileRepository.findAccessible(user, fileId);
    if (!file) {
      throw new AppError('File not found.', { status: 404, code: 'FILE_NOT_FOUND' });
    }

    const content = await this.fileRepository.findContent(fileId);
    if (!content) {
      throw new AppError('File not found.', { status: 404, code: 'FILE_NOT_FOUND' });
    }

    if (user.role !== ROLES.STUDENT && !file.viewedAt) {
      await this.fileRepository.markViewed(fileId);
      file.viewedAt = new Date();
    }

    return { ...file, content };
  }

  async deleteFile(user, fileId) {
    const file = await this.fileRepository.findAccessible(user, fileId);
    if (!file) {
      throw new AppError('File not found.', { status: 404, code: 'FILE_NOT_FOUND' });
    }

    const isUploader = Number(file.uploadedBy) === Number(user.id);
    const isOwner = user.role === ROLES.STUDENT && Number(file.studentId) === Number(user.id);
    if (!isUploader && !isOwner) {
      throw new AppError('You can only remove files you uploaded.', {
        status: 403,
        code: 'ROLE_NOT_ALLOWED',
      });
    }

    await this.fileRepository.remove(fileId);
  }

  // ------------------------------ Messages -----------------------------

  async listMessages(user, documentId) {
    await this.get(user, documentId);
    return this.messageRepository.listByDocument(documentId);
  }

  async listAllMessages(user) {
    return this.messageRepository.listAccessible(user, { limit: 200 });
  }

  async sendMessage(user, documentId, input) {
    await this.get(user, documentId);

    const body = String(input?.body || '').trim();
    if (!body) {
      throw new AppError('Write a message before sending.', {
        status: 422,
        code: 'EMPTY_MESSAGE',
      });
    }

    const messageId = await this.messageRepository.insert({
      documentId: Number(documentId),
      senderId: user.id,
      body: body.slice(0, 2000),
    });

    return this.messageRepository.find(messageId);
  }
}

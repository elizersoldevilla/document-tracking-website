import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { canViewDocument, DOCUMENT_STATUS, ROLES } from '../src/domain/documentWorkflow.js';
import { DocumentService } from '../src/services/documentService.js';

function clone(value) {
  return value ? { ...value } : null;
}

class MemoryDocumentRepository {
  constructor(document = null) {
    this.documents = new Map();
    this.logs = [];
    this.nextId = 10;
    if (document) this.documents.set(document.id, clone(document));
  }

  async withTransaction(callback) {
    return callback({});
  }

  async insert(_connection, input) {
    const id = this.nextId++;
    const document = {
      id,
      studentId: input.studentId,
      professorId: input.professorId,
      title: input.title,
      description: input.description,
      researchTeamName: input.researchTeamName ?? null,
      status: input.status,
      version: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      studentName: 'Student One',
      studentEmail: 'student@example.edu',
      professorName: 'Professor One',
      professorEmail: 'professor@example.edu',
    };
    this.documents.set(id, document);
    return id;
  }

  async findByIdForUpdate(_connection, id) {
    return clone(this.documents.get(Number(id)));
  }

  async insertLog(_connection, log) {
    this.logs.push(clone(log));
  }

  async findAccessibleById(user, id) {
    const document = this.documents.get(Number(id));
    return canViewDocument(user, document) ? clone(document) : null;
  }

  async updateStatus(_connection, id, version, status) {
    const document = this.documents.get(Number(id));
    if (!document || document.version !== version) return false;
    document.status = status;
    document.version += 1;
    document.updatedAt = new Date('2026-01-02T00:00:00Z');
    return true;
  }

  async updateResearchTeamName(id, researchTeamName) {
    const document = this.documents.get(Number(id));
    if (!document) return false;
    document.researchTeamName = researchTeamName ?? null;
    document.updatedAt = new Date('2026-01-02T00:00:00Z');
    return true;
  }

  async findHistory(id) {
    return this.logs.filter((log) => log.documentId === Number(id)).map(clone);
  }

  async list(user) {
    const items = [...this.documents.values()].filter((document) => canViewDocument(user, document)).map(clone);
    const summary = {};
    for (const document of items) {
      summary[document.status] = (summary[document.status] || 0) + 1;
    }
    return {
      items,
      summary,
      pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 },
    };
  }
}

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      [1, { id: 1, name: 'Student One', email: 'student@example.edu', role: ROLES.STUDENT }],
      [2, { id: 2, name: 'Professor One', email: 'professor@example.edu', role: ROLES.PROFESSOR }],
      [3, { id: 3, name: 'Professor Two', email: 'other@example.edu', role: ROLES.PROFESSOR }],
      [4, { id: 4, name: 'Admin', email: 'admin@example.edu', role: ROLES.ADMIN }],
    ]);
  }

  async findById(id) {
    return clone(this.users.get(Number(id)));
  }

  async listProfessors() {
    return [...this.users.values()].filter((user) => user.role === ROLES.PROFESSOR);
  }
}

function fixture() {
  return {
    id: 7,
    studentId: 1,
    professorId: 2,
    title: 'Certificate request',
    description: 'A complete request description.',
    status: DOCUMENT_STATUS.SUBMITTED,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function createService(document = fixture()) {
  const documentRepository = new MemoryDocumentRepository(document);
  const userRepository = new MemoryUserRepository();
  const eventBus = new EventEmitter();
  const service = new DocumentService({ documentRepository, userRepository, eventBus });
  return { service, documentRepository, eventBus };
}

test('student submission persists document and initial audit log atomically', async () => {
  const { service, documentRepository } = createService(null);
  const student = { id: 1, role: ROLES.STUDENT };

  const created = await service.create(student, {
    professorId: 2,
    title: 'Certificate request',
    description: 'A complete request description.',
    researchTeamName: "Dela Cruz et al 'Research Title'",
  });

  assert.equal(created.status, DOCUMENT_STATUS.SUBMITTED);
  assert.equal(created.professorId, 2);
  assert.equal(created.version, 1);
  assert.equal(created.researchTeamName, "Dela Cruz et al 'Research Title'");
  assert.deepEqual(created.availableActions, []);
  assert.equal(documentRepository.logs.length, 1);
  assert.equal(documentRepository.logs[0].previousStatus, null);
  assert.equal(documentRepository.logs[0].newStatus, DOCUMENT_STATUS.SUBMITTED);
});

test('assigned professor can advance a request and an event is emitted', async () => {
  const { service, documentRepository, eventBus } = createService();
  const events = [];
  eventBus.on('7', (payload) => events.push(payload));
  const professor = { id: 2, role: ROLES.PROFESSOR };

  const updated = await service.updateStatus(professor, 7, {
    status: DOCUMENT_STATUS.UNDER_REVIEW,
    remarks: 'Checking the requirements.',
    version: 1,
  });

  assert.equal(updated.status, DOCUMENT_STATUS.UNDER_REVIEW);
  assert.equal(updated.version, 2);
  assert.deepEqual(updated.availableActions.map((action) => action.status), [
    DOCUMENT_STATUS.SIGNED_APPROVED,
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  ]);
  assert.equal(documentRepository.logs[0].remarks, 'Checking the requirements.');
  assert.equal(events[0].type, 'document.updated');
});

test('unassigned professor receives not found and cannot inspect the document', async () => {
  const { service } = createService();
  const otherProfessor = { id: 3, role: ROLES.PROFESSOR };

  await assert.rejects(
    () => service.get(otherProfessor, 7),
    (error) => error.status === 404 && error.code === 'DOCUMENT_NOT_FOUND',
  );
  await assert.rejects(
    () => service.updateStatus(otherProfessor, 7, {
      status: DOCUMENT_STATUS.UNDER_REVIEW,
      version: 1,
    }),
    (error) => error.status === 404,
  );
});

test('administrator cannot see a request before professor endorsement', async () => {
  const { service } = createService();
  const admin = { id: 4, role: ROLES.ADMIN };

  await assert.rejects(
    () => service.get(admin, 7),
    (error) => error.status === 404,
  );
});

test('administrator can process an endorsed request through completion', async () => {
  const { service, documentRepository } = createService({
    ...fixture(),
    status: DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  });
  const admin = { id: 4, role: ROLES.ADMIN };

  const processing = await service.updateStatus(admin, 7, {
    status: DOCUMENT_STATUS.ADMIN_PROCESSING,
    version: 1,
  });
  const ready = await service.updateStatus(admin, 7, {
    status: DOCUMENT_STATUS.READY_FOR_PICKUP,
    version: processing.version,
  });
  const completed = await service.updateStatus(admin, 7, {
    status: DOCUMENT_STATUS.COMPLETED,
    version: ready.version,
  });

  assert.equal(completed.status, DOCUMENT_STATUS.COMPLETED);
  assert.equal(completed.version, 4);
  assert.equal(documentRepository.logs.length, 3);
});

test('stale version updates are rejected without writing history', async () => {
  const { service, documentRepository } = createService();
  const professor = { id: 2, role: ROLES.PROFESSOR };

  await assert.rejects(
    () => service.updateStatus(professor, 7, {
      status: DOCUMENT_STATUS.UNDER_REVIEW,
      version: 99,
    }),
    (error) => error.status === 409 && error.code === 'DOCUMENT_VERSION_CONFLICT',
  );
  assert.equal(documentRepository.logs.length, 0);
});

test('invalid workflow jumps are rejected', async () => {
  const { service } = createService();
  const admin = { id: 4, role: ROLES.ADMIN };
  const endorsedDocument = { ...fixture(), status: DOCUMENT_STATUS.ENDORSED_TO_ADMIN };
  const { service: endorsedService } = createService(endorsedDocument);

  await assert.rejects(
    () => endorsedService.updateStatus(admin, 7, {
      status: DOCUMENT_STATUS.COMPLETED,
      version: 1,
    }),
    (error) => error.status === 409 && error.code === 'INVALID_STATUS_TRANSITION',
  );
  await assert.rejects(
    () => service.get(admin, 7),
    (error) => error.status === 404,
  );
});

test('student can update the research team name on their own request', async () => {
  const { service, documentRepository, eventBus } = createService({
    ...fixture(),
    researchTeamName: null,
  });
  const student = { id: 1, role: ROLES.STUDENT };
  const events = [];
  eventBus.on('7', (payload) => events.push(payload));

  const updated = await service.updateDetails(student, 7, {
    researchTeamName: 'Dela Cruz et al. | Research Title',
  });

  assert.equal(updated.researchTeamName, 'Dela Cruz et al. | Research Title');
  // Detail edits never bump the workflow version.
  assert.equal(updated.version, 1);
  assert.equal(documentRepository.logs.length, 0);
  assert.equal(documentRepository.documents.get(7).researchTeamName, 'Dela Cruz et al. | Research Title');
  assert.equal(events[0].type, 'document.updated');
});

test('professor cannot edit student submission details', async () => {
  const { service, documentRepository } = createService();
  const professor = { id: 2, role: ROLES.PROFESSOR };

  await assert.rejects(
    () => service.updateDetails(professor, 7, { researchTeamName: 'Team Name' }),
    (error) => error.status === 403 && error.code === 'ROLE_NOT_ALLOWED',
  );
  assert.equal(documentRepository.documents.get(7).researchTeamName, undefined);
});

test('another student cannot edit a request they do not own', async () => {
  const { service } = createService();
  const otherStudent = { id: 9, role: ROLES.STUDENT };

  await assert.rejects(
    () => service.updateDetails(otherStudent, 7, { researchTeamName: 'Team Name' }),
    (error) => error.status === 404 && error.code === 'DOCUMENT_NOT_FOUND',
  );
});

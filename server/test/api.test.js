import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createAuthController } from '../src/controllers/authController.js';
import { createDocumentController } from '../src/controllers/documentController.js';
import { DOCUMENT_STATUS, ROLES } from '../src/domain/documentWorkflow.js';
import { AppError } from '../src/utils/AppError.js';

const USERS = {
  'student-token': { id: 1, name: 'Student One', email: 'student@example.edu', role: ROLES.STUDENT },
  'professor-token': { id: 2, name: 'Professor One', email: 'professor@example.edu', role: ROLES.PROFESSOR },
};

class FakeAuthService {
  async login(email) {
    const normalizedEmail = email.toLowerCase();
    const entry = Object.entries(USERS).find(([, user]) => user.email === normalizedEmail);
    if (!entry) {
      throw new AppError('Invalid email or password.', { status: 401, code: 'INVALID_CREDENTIALS' });
    }
    return { token: entry[0], user: entry[1] };
  }

  async authenticate(token) {
    const user = USERS[token];
    if (!user) {
      throw new AppError('Authentication is required.', { status: 401, code: 'INVALID_SESSION' });
    }
    return user;
  }
}

class FakeDocumentService {
  constructor() {
    this.document = {
      id: 7,
      studentId: 1,
      professorId: 2,
      studentName: 'Student One',
      studentEmail: 'student@example.edu',
      professorName: 'Professor One',
      professorEmail: 'professor@example.edu',
      title: 'Certificate request',
      description: 'A complete request description.',
      status: DOCUMENT_STATUS.SUBMITTED,
      version: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      availableActions: [],
    };
  }

  async listProfessors() {
    return [USERS['professor-token']];
  }

  async list() {
    return {
      items: [this.document],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      summary: { SUBMITTED: 1 },
    };
  }

  async get() {
    return this.document;
  }

  async create(_user, input) {
    this.document = {
      ...this.document,
      ...input,
      researchTeamName: input.researchTeamName ?? null,
      id: 8,
      status: DOCUMENT_STATUS.SUBMITTED,
      version: 1,
    };
    return this.document;
  }

  async updateStatus(_user, id, input) {
    this.document = { ...this.document, id: Number(id), status: input.status, version: this.document.version + 1 };
    return this.document;
  }

  async history() {
    return [{ id: 1, previousStatus: null, newStatus: DOCUMENT_STATUS.SUBMITTED, remarks: null }];
  }
}

function buildTestApp() {
  const config = {
    nodeEnv: 'test',
    appOrigin: 'http://localhost:5173',
    cookieSecure: false,
    demoLogin: {
      enabled: true,
      accounts: [{ role: 'student', label: 'Student', email: 'student@example.edu', password: 'valid-password' }],
    },
  };
  const authService = new FakeAuthService();
  const documentService = new FakeDocumentService();
  const eventBus = { on() {}, off() {} };
  const pool = { execute: async () => [[], []] };
  const authController = createAuthController({ authService, config });
  const documentController = createDocumentController({ documentService, eventBus });
  return createApp({ config, pool, authService, authController, documentController });
}

async function login(agent, email) {
  const response = await agent.post('/api/auth/login').send({ email, password: 'valid-password' });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.csrfToken);
  assert.ok(response.headers['set-cookie']);
  const cookie = response.headers['set-cookie']
    .map((value) => value.split(';')[0])
    .join('; ');
  return { csrfToken: response.body.data.csrfToken, cookie };
}

test('health endpoint is public and protected APIs require a session', async () => {
  const agent = await import('supertest');
  const request = agent.default;
  const app = buildTestApp();

  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.data.database, 'connected');

  const demoAccounts = await request(app).get('/api/auth/demo-accounts');
  assert.equal(demoAccounts.status, 200);
  assert.equal(demoAccounts.body.data[0].role, 'student');
  assert.equal(demoAccounts.body.data[0].password, 'valid-password');

  const documents = await request(app).get('/api/documents');
  assert.equal(documents.status, 401);
  assert.equal(documents.body.code, 'AUTHENTICATION_REQUIRED');
});

test('login, CSRF, validation, role guards, and logout work through the API', async () => {
  const agent = (await import('supertest')).default;
  const app = buildTestApp();
  const studentAgent = agent(app);
  const studentSession = await login(studentAgent, 'student@example.edu');

  const withoutCsrf = await studentAgent.post('/api/documents')
    .set('Cookie', studentSession.cookie)
    .send({
    professorId: 2,
    title: 'Certificate request',
    description: 'A complete request description.',
  });
  assert.equal(withoutCsrf.status, 403);
  assert.equal(withoutCsrf.body.code, 'INVALID_CSRF_TOKEN');

  const invalid = await studentAgent.post('/api/documents')
    .set('Cookie', studentSession.cookie)
    .set('X-CSRF-Token', studentSession.csrfToken)
    .send({ professorId: 0, title: 'x', description: 'short' });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.code, 'VALIDATION_ERROR');

  const created = await studentAgent.post('/api/documents')
    .set('Cookie', studentSession.cookie)
    .set('X-CSRF-Token', studentSession.csrfToken)
    .send({
      professorId: 2,
      title: 'Certificate request',
      description: 'A complete request description.',
      researchTeamName: "Dela Cruz et al 'Research Title'",
    });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.researchTeamName, "Dela Cruz et al 'Research Title'");

  const missingTeamName = await studentAgent.post('/api/documents')
    .set('Cookie', studentSession.cookie)
    .set('X-CSRF-Token', studentSession.csrfToken)
    .send({ professorId: 2, title: 'Second request', description: 'A complete request description.' });
  assert.equal(missingTeamName.status, 201);
  assert.equal(missingTeamName.body.data.researchTeamName, null);

  const listed = await studentAgent.get('/api/documents?page=1&limit=10&search=certificate')
    .set('Cookie', studentSession.cookie);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.pagination.page, 1);

  const forbiddenUpdate = await studentAgent.patch('/api/documents/7/status')
    .set('Cookie', studentSession.cookie)
    .set('X-CSRF-Token', studentSession.csrfToken)
    .send({ status: DOCUMENT_STATUS.UNDER_REVIEW, version: 1 });
  assert.equal(forbiddenUpdate.status, 403);
  assert.equal(forbiddenUpdate.body.code, 'ROLE_NOT_ALLOWED');

  const professorAgent = agent(app);
  const professorSession = await login(professorAgent, 'professor@example.edu');
  const updated = await professorAgent.patch('/api/documents/7/status')
    .set('Cookie', professorSession.cookie)
    .set('X-CSRF-Token', professorSession.csrfToken)
    .send({ status: DOCUMENT_STATUS.UNDER_REVIEW, version: 1, remarks: 'Reviewing.' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.status, DOCUMENT_STATUS.UNDER_REVIEW);

  const history = await professorAgent.get('/api/documents/7/history')
    .set('Cookie', professorSession.cookie);
  assert.equal(history.status, 200);
  assert.equal(history.body.data.length, 1);

  const logoutWithoutCsrf = await professorAgent.post('/api/auth/logout')
    .set('Cookie', professorSession.cookie);
  assert.equal(logoutWithoutCsrf.status, 403);
  const logout = await professorAgent.post('/api/auth/logout')
    .set('Cookie', professorSession.cookie)
    .set('X-CSRF-Token', professorSession.csrfToken);
  assert.equal(logout.status, 200);
});

test('malformed JSON and unknown API routes return consistent errors', async () => {
  const agent = (await import('supertest')).default;
  const app = buildTestApp();

  const malformed = await agent(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.code, 'INVALID_JSON');

  const missing = await agent(app).get('/api/not-a-route');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, 'ROUTE_NOT_FOUND');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_VISIBLE_STATUSES,
  canTransition,
  canViewDocument,
  DOCUMENT_STATUS,
  getAvailableActions,
  ROLES,
} from '../src/domain/documentWorkflow.js';

test('professor workflow exposes only valid professor actions', () => {
  assert.deepEqual(getAvailableActions(ROLES.PROFESSOR, DOCUMENT_STATUS.SUBMITTED), [
    DOCUMENT_STATUS.UNDER_REVIEW,
    DOCUMENT_STATUS.SIGNED_APPROVED,
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  ]);
  assert.deepEqual(getAvailableActions(ROLES.PROFESSOR, DOCUMENT_STATUS.UNDER_REVIEW), [
    DOCUMENT_STATUS.SIGNED_APPROVED,
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  ]);
  assert.deepEqual(getAvailableActions(ROLES.PROFESSOR, DOCUMENT_STATUS.SIGNED_APPROVED), [
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  ]);
  assert.deepEqual(getAvailableActions(ROLES.PROFESSOR, DOCUMENT_STATUS.ENDORSED_TO_ADMIN), []);
});

test('administrator workflow begins only after professor endorsement', () => {
  assert.equal(canTransition(ROLES.ADMIN, DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.ADMIN_PROCESSING), false);
  assert.equal(canTransition(ROLES.ADMIN, DOCUMENT_STATUS.ENDORSED_TO_ADMIN, DOCUMENT_STATUS.ADMIN_PROCESSING), true);
  assert.equal(canTransition(ROLES.ADMIN, DOCUMENT_STATUS.ADMIN_PROCESSING, DOCUMENT_STATUS.READY_FOR_PICKUP), true);
  assert.equal(canTransition(ROLES.ADMIN, DOCUMENT_STATUS.READY_FOR_PICKUP, DOCUMENT_STATUS.COMPLETED), true);
});

test('students cannot perform status transitions', () => {
  assert.deepEqual(getAvailableActions(ROLES.STUDENT, DOCUMENT_STATUS.SUBMITTED), []);
  assert.equal(canTransition(ROLES.STUDENT, DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.UNDER_REVIEW), false);
});

test('document visibility enforces ownership, assignment, and admin scope', () => {
  const document = {
    studentId: 1,
    professorId: 2,
    status: DOCUMENT_STATUS.SUBMITTED,
  };

  assert.equal(canViewDocument({ id: 1, role: ROLES.STUDENT }, document), true);
  assert.equal(canViewDocument({ id: 9, role: ROLES.STUDENT }, document), false);
  assert.equal(canViewDocument({ id: 2, role: ROLES.PROFESSOR }, document), true);
  assert.equal(canViewDocument({ id: 3, role: ROLES.PROFESSOR }, document), false);
  assert.equal(canViewDocument({ id: 4, role: ROLES.ADMIN }, document), false);
  assert.equal(canViewDocument(
    { id: 4, role: ROLES.ADMIN },
    { ...document, status: DOCUMENT_STATUS.ENDORSED_TO_ADMIN },
  ), true);
  assert.deepEqual(ADMIN_VISIBLE_STATUSES, [
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
    DOCUMENT_STATUS.ADMIN_PROCESSING,
    DOCUMENT_STATUS.READY_FOR_PICKUP,
    DOCUMENT_STATUS.COMPLETED,
  ]);
});

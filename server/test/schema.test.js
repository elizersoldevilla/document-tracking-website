import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schema = await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8');

test('schema contains the required entities and audit fields', () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS users/i);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS documents/i);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS document_logs/i);
  assert.match(schema, /student_id BIGINT UNSIGNED NOT NULL/i);
  assert.match(schema, /professor_id BIGINT UNSIGNED NOT NULL/i);
  assert.match(schema, /research_team_name VARCHAR\(120\)/i);
  assert.match(schema, /previous_status/i);
  assert.match(schema, /updated_by_user_id BIGINT UNSIGNED NOT NULL/i);
  assert.match(schema, /remarks VARCHAR\(2000\) NULL/i);
});

test('schema defines all workflow states and role constraints', () => {
  for (const status of [
    'SUBMITTED',
    'UNDER_REVIEW',
    'SIGNED_APPROVED',
    'ENDORSED_TO_ADMIN',
    'ADMIN_PROCESSING',
    'READY_FOR_PICKUP',
    'COMPLETED',
  ]) {
    assert.match(schema, new RegExp(`'${status}'`, 'i'));
  }
  assert.match(schema, /ENUM\('student', 'professor', 'admin'\)/i);
});

test('schema defines foreign keys and workflow query indexes', () => {
  assert.match(schema, /fk_documents_student/i);
  assert.match(schema, /fk_documents_professor/i);
  assert.match(schema, /fk_document_logs_document/i);
  assert.match(schema, /fk_document_logs_updated_by/i);
  assert.match(schema, /idx_documents_student_status_updated/i);
  assert.match(schema, /idx_documents_professor_status_updated/i);
  assert.match(schema, /idx_documents_status_updated/i);
  assert.match(schema, /idx_document_logs_timeline/i);
});

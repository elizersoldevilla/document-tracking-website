import { z } from 'zod';
import { DOCUMENT_STATUS } from '../domain/documentWorkflow.js';

const statusValues = Object.values(DOCUMENT_STATUS);

export const loginSchema = z.object({
  email: z.string().trim().email().max(190).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export const createDocumentSchema = z.object({
  professorId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  researchTeamName: z.string().trim().min(3).max(120).optional(),
}).strict();

export const updateDocumentSchema = z.object({
  researchTeamName: z.string().trim().max(120).nullable()
    .refine((value) => value === null || value.length >= 3, {
      message: 'Enter at least 3 characters.',
    }),
}).strict();

export const updateStatusSchema = z.object({
  status: z.enum(statusValues),
  remarks: z.string().trim().max(2000).nullable().optional().transform((value) => value || null),
  version: z.number().int().positive().optional(),
}).strict();

export const listDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(100).optional(),
  ),
  status: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(statusValues).optional(),
  ),
  // `?hasRemarks=true` narrows the list to requests carrying reviewer remarks
  // (the "For Revision" queue). Absent or empty keeps the default list.
  hasRemarks: z.preprocess(
    (value) => {
      if (value === undefined || value === '') return undefined;
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    z.boolean().optional(),
  ),
}).strict();

export const documentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const fileIdSchema = z.object({
  fileId: z.coerce.number().int().positive(),
}).strict();

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, 'Write a message before sending.').max(2000),
}).strict();
